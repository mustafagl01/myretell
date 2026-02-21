/**
 * AudioPlayer handles Web Audio API playback with gapless scheduling.
 *
 * This class handles:
 * - AudioContext creation and management
 * - Decoding binary audio data to AudioBuffer
 * - Creating AudioBufferSourceNode for each chunk (single-use)
 * - Scheduling playback with overlap for seamless transitions
 * - Handling AudioContext state (suspended/running)
 * - Cleanup on stop
 *
 * Playback Strategy:
 * - Schedule next audio chunk 50-100ms before current ends
 * - Create new AudioBufferSourceNode for each chunk (required by Web Audio API)
 * - Overlap ensures gapless playback without clicks or pops
 *
 * Audio Configuration:
 * - Sample Rate: Auto-detected from AudioContext (typically 44100Hz or 48000Hz)
 * - Channels: Auto-detected from decoded audio data
 * - Format: PCM/linear16 decoded to AudioBuffer
 *
 * Browser Requirements:
 * - Web Audio API support (Chrome, Firefox, Safari, Edge)
 * - User gesture required to resume AudioContext if suspended
 */
export class AudioPlayer {
  /**
   * Create a new AudioPlayer instance.
   *
   * @param {Object} options - Configuration options
   * @param {number} options.overlapTime - Overlap time in milliseconds (default: 75)
   * @param {number} options.volume - Playback volume 0.0 to 1.0 (default: 1.0)
   * @param {Function} options.onPlaybackStart - Callback when playback starts
   * @param {Function} options.onPlaybackEnd - Callback when playback ends
   * @param {Function} options.onChunkComplete - Callback when a chunk finishes playing
   * @param {Function} options.onError - Callback when error occurs
   */
  constructor(options = {}) {
    const {
      overlapTime = 75,
      volume = 1.0,
      onPlaybackStart = null,
      onPlaybackEnd = null,
      onChunkComplete = null,
      onError = null,
    } = options;

    this.overlapTime = overlapTime / 1000; // Convert to seconds
    this.volume = Math.max(0, Math.min(1, volume ?? 1.0)); // Clamp between 0 and 1, with default
    this.onPlaybackStartCallback = onPlaybackStart;
    this.onPlaybackEndCallback = onPlaybackEnd;
    this.onChunkCompleteCallback = onChunkComplete;
    this.onErrorCallback = onError;

    // Audio context and state
    this.audioContext = null;
    this.isPlaying = false;
    this.currentSource = null;
    this.gainNode = null;

    // Playback scheduling
    this.scheduledSources = [];
    this.nextStartTime = 0;

    // Check for browser support
    this._checkBrowserSupport();

    // Initialize AudioContext lazily (requires user gesture)
    this._initAudioContext();
  }

  /**
   * Check if the browser supports Web Audio API.
   * @private
   * @throws {Error} If Web Audio API is not supported
   */
  _checkBrowserSupport() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      throw new Error(
        'Web Audio API is not supported in this browser. ' +
        'Please use a modern browser (Chrome, Firefox, Safari, Edge).'
      );
    }
  }

  /**
   * Initialize the AudioContext.
   * @private
   */
  _initAudioContext() {
    try {
      // Use standard AudioContext or webkit prefix for Safari
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create a gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      // Connect gain node to destination (speakers)
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      this._handleError(new Error(`Failed to initialize AudioContext: ${error.message}`));
    }
  }

  /**
   * Ensure AudioContext is running (not suspended).
   *
   * Browsers suspend AudioContext until a user gesture occurs.
   * This method should be called on button click or other user interaction.
   *
   * @returns {Promise<boolean>} True if AudioContext is running
   */
  async ensureContextRunning() {
    if (!this.audioContext) {
      this._initAudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        return true;
      } catch (error) {
        this._handleError(new Error(`Failed to resume AudioContext: ${error.message}`));
        return false;
      }
    }

    return this.audioContext.state === 'running';
  }

  /**
   * Decode binary audio data to AudioBuffer.
   *
   * @param {ArrayBuffer} audioData - Raw binary audio data
   * @returns {Promise<AudioBuffer>} Decoded audio buffer
   * @throws {Error} If decoding fails
   */
  async decodeAudioData(audioData) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      return audioBuffer;
    } catch (error) {
      this._handleError(new Error(`Failed to decode audio data: ${error.message}`));
      throw error;
    }
  }

  /**
   * Play an audio buffer immediately.
   *
   * This starts playback immediately without scheduling overlap.
   * Use scheduleBuffer() for gapless playback with multiple chunks.
   *
   * @param {AudioBuffer} audioBuffer - Decoded audio buffer to play
   * @returns {number} Source ID for tracking
   */
  playBuffer(audioBuffer) {
    if (!this.audioContext) {
      this._handleError(new Error('AudioContext not initialized'));
      return null;
    }

    try {
      // Create a new source node (required for each playback)
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to gain node for volume control
      source.connect(this.gainNode);

      // Store the current source
      this.currentSource = source;
      this.isPlaying = true;

      // Set up ended callback
      source.onended = () => {
        this._handleChunkComplete(source);
      };

      // Start playback immediately
      const startTime = this.audioContext.currentTime;
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      // Track scheduled source
      const sourceId = this._generateSourceId();
      this.scheduledSources.push({ id: sourceId, source, startTime });

      // Notify playback started
      if (this.onPlaybackStartCallback) {
        this.onPlaybackStartCallback();
      }

      return sourceId;
    } catch (error) {
      this._handleError(error);
      return null;
    }
  }

  /**
   * Schedule an audio buffer for gapless playback.
   *
   * Schedules the next chunk to start before the current one ends,
   * creating overlap for seamless transitions.
   *
   * @param {AudioBuffer} audioBuffer - Decoded audio buffer to schedule
   * @returns {number} Source ID for tracking
   */
  scheduleBuffer(audioBuffer) {
    if (!this.audioContext) {
      this._handleError(new Error('AudioContext not initialized'));
      return null;
    }

    try {
      // Calculate start time with overlap
      // If nothing is scheduled, start now
      // Otherwise, start before the previous chunk ends
      let startTime;
      if (this.nextStartTime <= this.audioContext.currentTime) {
        // No active playback, start immediately
        startTime = this.audioContext.currentTime;
        this.isPlaying = true;

        // Notify playback started
        if (this.onPlaybackStartCallback) {
          this.onPlaybackStartCallback();
        }
      } else {
        // Schedule with overlap
        startTime = this.nextStartTime - this.overlapTime;

        // Ensure we don't schedule in the past
        if (startTime < this.audioContext.currentTime) {
          startTime = this.audioContext.currentTime;
        }
      }

      // Create a new source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to gain node
      source.connect(this.gainNode);

      // Set up ended callback
      source.onended = () => {
        this._handleChunkComplete(source);
      };

      // Start playback at scheduled time
      source.start(startTime);

      // Update next scheduled start time
      this.nextStartTime = startTime + audioBuffer.duration;

      // Track scheduled source
      const sourceId = this._generateSourceId();
      this.scheduledSources.push({ id: sourceId, source, startTime });

      return sourceId;
    } catch (error) {
      this._handleError(error);
      return null;
    }
  }

  /**
   * Stop all audio playback.
   *
   * Stops all currently playing and scheduled audio sources.
   * Clears the scheduling queue.
   */
  stop() {
    // Stop all scheduled sources
    this.scheduledSources.forEach(({ source }) => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Source may have already stopped, ignore
      }
    });

    // Clear sources
    this.scheduledSources = [];
    this.currentSource = null;
    this.isPlaying = false;
    this.nextStartTime = 0;

    // Notify playback ended
    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback();
    }
  }

  /**
   * Set the playback volume.
   *
   * @param {number} volume - Volume level 0.0 to 1.0
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get the current playback volume.
   *
   * @returns {number} Current volume 0.0 to 1.0
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Get the AudioContext state.
   *
   * @returns {string} AudioContext state: 'suspended', 'running', or 'closed'
   */
  getContextState() {
    if (!this.audioContext) {
      return 'uninitialized';
    }
    return this.audioContext.state;
  }

  /**
   * Check if audio is currently playing.
   *
   * @returns {boolean} True if audio is playing
   */
  get playing() {
    return this.isPlaying;
  }

  /**
   * Get the number of currently scheduled sources.
   *
   * @returns {number} Count of active/scheduled sources
   */
  getScheduledSourceCount() {
    return this.scheduledSources.length;
  }

  /**
   * Handle chunk completion callback.
   * @private
   *
   * @param {AudioBufferSourceNode} source - The source that ended
   */
  _handleChunkComplete(source) {
    // Remove from scheduled sources
    this.scheduledSources = this.scheduledSources.filter(
      s => s.source !== source
    );

    // Check if playback is complete
    if (this.scheduledSources.length === 0) {
      this.isPlaying = false;
      this.nextStartTime = 0;

      // Notify playback ended
      if (this.onPlaybackEndCallback) {
        this.onPlaybackEndCallback();
      }
    }

    // Notify chunk complete
    if (this.onChunkCompleteCallback) {
      this.onChunkCompleteCallback();
    }
  }

  /**
   * Handle errors during audio playback.
   * @private
   *
   * @param {Error} error - The error that occurred
   */
  _handleError(error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Generate a unique source ID for tracking.
   * @private
   *
   * @returns {number} Unique source ID
   */
  _generateSourceId() {
    return Date.now() + Math.random();
  }

  /**
   * Clean up resources.
   *
   * Stops all playback and closes the AudioContext.
   * Call this when the player is no longer needed.
   */
  destroy() {
    this.stop();

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (error) {
        // Already disconnected
      }
      this.gainNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (error) {
        // Already closed
      }
      this.audioContext = null;
    }
  }
}

export default AudioPlayer;
