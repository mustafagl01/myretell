/**
 * AudioPlayer handles Web Audio API playback with gapless scheduling.
 */
export class AudioPlayer {
  constructor(options = {}) {
    // Use options.volume directly with fallback
    this.overlapTime = (options.overlapTime || 75) / 1000;
    this.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));
    this.onPlaybackStartCallback = options.onPlaybackStart || null;
    this.onPlaybackEndCallback = options.onPlaybackEnd || null;
    this.onChunkCompleteCallback = options.onChunkComplete || null;
    this.onErrorCallback = options.onError || null;

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
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create a gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      // Connect gain node to destination (speakers)
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Failed to initialize AudioContext: ${error.message}`));
      }
    }
  }

  /**
   * Ensure AudioContext is running (not suspended).
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
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error(`Failed to resume AudioContext: ${error.message}`));
        }
        return false;
      }
    }

    return this.audioContext.state === 'running';
  }

  /**
   * Decode binary audio data to AudioBuffer.
   */
  async decodeAudioData(audioData) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      return audioBuffer;
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Failed to decode audio data: ${error.message}`));
      }
      throw error;
    }
  }

  /**
   * Play an audio buffer immediately.
   */
  async playBuffer(audioBuffer) {
    if (!this.audioContext) {
      await this.ensureContextRunning();
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);
      source.start();

      if (this.onPlaybackStartCallback) {
        this.onPlaybackStartCallback();
      }

      source.onended = () => {
        if (this.onPlaybackEndCallback) {
          this.onPlaybackEndCallback();
        }
      };

      this.isPlaying = true;
      this.currentSource = source;

      return new Promise((resolve) => {
        source.onended = () => {
          this.isPlaying = false;
          if (this.onPlaybackEndCallback) {
            this.onPlaybackEndCallback();
          }
          resolve();
        };
      });
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Failed to play audio: ${error.message}`));
      }
      throw error;
    }
  }

  /**
   * Schedule an audio buffer for gapless playback.
   */
  scheduleBuffer(audioBuffer, when) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const startTime = when || this.audioContext.currentTime;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start(startTime);

    this.scheduledSources.push(source);
    this.isPlaying = true;

    return startTime;
  }

  /**
   * Stop all currently playing audio.
   */
  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source already stopped
      }
      this.currentSource = null;
    }

    this.scheduledSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source already stopped
      }
    });

    this.scheduledSources = [];
    this.isPlaying = false;

    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback();
    }
  }

  /**
   * Set the playback volume.
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get the current playback state.
   */
  get playing() {
    return this.isPlaying;
  }
}

export default AudioPlayer;
