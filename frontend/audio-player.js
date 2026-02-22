/**
 * AudioPlayer handles Web Audio API playback with gapless scheduling.
 *
 * For Deepgram Voice Agent:
 * - Raw Linear16 PCM input (no decodeAudioData needed)
 * - Manual PCM → AudioBuffer conversion
 * - Proper gapless scheduling with nextStartTime tracking
 */
export class AudioPlayer {
  constructor(options = {}) {
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

    // Playback scheduling - FIX: Proper nextStartTime tracking
    this.scheduledSources = [];
    this.nextStartTime = 0; // Will be set to currentTime on first play

    // Check for browser support
    this._checkBrowserSupport();

    // Initialize AudioContext lazily (requires user gesture)
    this._initAudioContext();
  }

  _checkBrowserSupport() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      throw new Error('Web Audio API is not supported');
    }
  }

  _initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Failed to init AudioContext: ${error.message}`));
      }
    }
  }

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
          this.onErrorCallback(new Error(`Failed to resume: ${error.message}`));
        }
        return false;
      }
    }
    return this.audioContext.state === 'running';
  }

  /**
   * FIX: Convert raw Linear16 PCM to AudioBuffer
   * Deepgram Voice Agent sends raw Int16 PCM, not encoded audio
   */
  _pcmToAudioBuffer(pcmData, sampleRate = 16000) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // pcmData should be Int16Array or ArrayBuffer containing Int16
    let int16Array;
    if (pcmData instanceof ArrayBuffer) {
      int16Array = new Int16Array(pcmData);
    } else if (pcmData instanceof Int16Array) {
      int16Array = pcmData;
    } else if (pcmData instanceof Uint8Array) {
      int16Array = new Int16Array(pcmData.buffer);
    } else {
      throw new Error('Invalid PCM data format');
    }

    // Convert Int16 to Float32 (-1.0 to 1.0)
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      const int16 = int16Array[i];
      float32Array[i] = int16 / 0x8000; // Convert to -1.0 to 1.0 range
    }

    // Create AudioBuffer from Float32 data
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      float32Array.length,
      sampleRate
    );
    audioBuffer.getChannelData(0).set(float32Array);

    return audioBuffer;
  }

  /**
   * FIX: Proper gapless scheduling with nextStartTime tracking
   */
  scheduleBuffer(audioData, sampleRate = 16000) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      // Convert PCM to AudioBuffer (no decodeAudioData - Deepgram sends raw PCM)
      const audioBuffer = this._pcmToAudioBuffer(audioData, sampleRate);

      const duration = audioBuffer.duration;
      const startTime = this.nextStartTime || this.audioContext.currentTime;
      const endTime = startTime + duration;

      // Create source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      // Schedule playback with overlap for seamless transition
      source.start(startTime - this.overlapTime);

      // Track this source
      this.scheduledSources.push(source);

      // FIX: Update nextStartTime properly
      // If this is the first chunk, use currentTime + small offset
      if (this.nextStartTime === 0) {
        this.nextStartTime = this.audioContext.currentTime + 0.05;
      } else {
        this.nextStartTime = endTime;
      }

      // FIX: Call onChunkComplete when this chunk finishes
      source.onended = () => {
        if (this.onChunkCompleteCallback) {
          this.onChunkCompleteCallback();
        }
      };

      // Mark as playing if not already
      if (!this.isPlaying && this.onPlaybackStartCallback) {
        this.isPlaying = true;
        this.onPlaybackStartCallback();
      }

      return { startTime, endTime };
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Failed to schedule buffer: ${error.message}`));
      }
      throw error;
    }
  }

  /**
   * Play immediately (for first chunk or when queue is empty)
   */
  async playBuffer(audioData, sampleRate = 16000) {
    if (!this.audioContext) {
      await this.ensureContextRunning();
    }

    // Convert PCM to AudioBuffer
    const audioBuffer = this._pcmToAudioBuffer(audioData, sampleRate);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start();

    if (!this.isPlaying && this.onPlaybackStartCallback) {
      this.isPlaying = true;
      this.onPlaybackStartCallback();
    }

    return new Promise((resolve) => {
      source.onended = () => {
        if (this.onChunkCompleteCallback) {
          this.onChunkCompleteCallback();
        }
        if (!this.scheduledSources.length) { // No more scheduled sources
          this.isPlaying = false;
          if (this.onPlaybackEndCallback) {
            this.onPlaybackEndCallback();
          }
        }
        resolve();
      };
    });
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {}
      this.currentSource = null;
    }

    this.scheduledSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });

    this.scheduledSources = [];
    this.isPlaying = false;
    this.nextStartTime = 0;

    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  get playing() {
    return this.isPlaying;
  }
}

export default AudioPlayer;
