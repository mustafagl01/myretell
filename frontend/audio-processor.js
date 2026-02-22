/**
 * AudioProcessor - Raw PCM capture for Deepgram Voice Agent
 *
 * Converts Float32 audio from microphone to Int16 PCM
 * that Deepgram Voice Agent expects.
 */

export class AudioProcessor {
  constructor(options = {}) {
    const {
      sampleRate = 16000,
      onAudioData = null,
      onError = null,
    } = options;

    this.sampleRate = sampleRate;
    this.onAudioDataCallback = onAudioData;
    this.onErrorCallback = onError;

    this.audioContext = null;
    this.scriptProcessor = null;
    this.source = null;
    this.stream = null;
    this.isProcessing = false;
  }

  /**
   * Start processing audio from a MediaStream.
   * Outputs raw Int16 PCM data compatible with Deepgram Voice Agent.
   */
  async start(mediaStream) {
    if (this.isProcessing) {
      return;
    }

    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: this.sampleRate });

      // Create ScriptProcessor (deprecated but works everywhere)
      // bufferSize: 4096 gives good balance between latency and performance
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        bufferSize,
        1, // input channels (mono)
        1  // output channels
      );

      // Create source from stream
      this.source = this.audioContext.createMediaStreamSource(mediaStream);
      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // Process audio data
      this.scriptProcessor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Float32Array

        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
        const pcmData = this._float32ToInt16(inputData);

        // Send via callback
        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(pcmData);
        }
      };

      this.isProcessing = true;
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      throw error;
    }
  }

  /**
   * Stop processing audio.
   */
  stop() {
    if (!this.isProcessing) {
      return;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isProcessing = false;
  }

  /**
   * Convert Float32Array to Int16Array (PCM).
   * @private
   */
  _float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp between -1 and 1, then convert to Int16 range
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return int16Array;
  }

  /**
   * Check if currently processing.
   */
  get processing() {
    return this.isProcessing;
  }
}

export default AudioProcessor;
