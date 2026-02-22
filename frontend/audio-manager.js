/**
 * AudioManager orchestrates all audio components for the voice agent.
 *
 * Data Flow:
 * 1. Microphone audio captured by AudioCapture (MediaStream)
 * 2. AudioProcessor converts Float32 → Int16 PCM and sends via WebSocket
 * 3. Backend forwards raw PCM to Deepgram Voice Agent API
 * 4. Deepgram responses (AgentEvents.Audio) received as base64 via WebSocket
 * 5. Base64 decoded → ArrayBuffer → sent directly to AudioPlayer.scheduleBuffer()
 * 6. AudioPlayer converts raw PCM to AudioBuffer and schedules gapless playback
 */
import { AudioCapture } from './audio-capture.js';
import { AudioQueue } from './audio-queue.js';
import { AudioPlayer } from './audio-player.js';
import { WebSocketClient } from './websocket-client.js';
import { AudioProcessor } from './audio-processor.js';

export class AudioManager {
  constructor(options = {}) {
    const {
      wsUrl = 'ws://localhost:3001/ws',
      sampleRate = 16000,
      minBufferThreshold = 3,
      maxBufferThreshold = 5,
      volume = 1.0,
      onConversationStarted = null,
      onConversationStopped = null,
      onAudioPlaying = null,
      onAudioStopped = null,
      onBufferLow = null,
      onBufferHigh = null,
      onConnectionChange = null,
      onError = null,
    } = options;

    this.wsUrl = wsUrl;
    this.sampleRate = sampleRate;
    this.minBufferThreshold = minBufferThreshold;
    this.maxBufferThreshold = maxBufferThreshold;
    this.volume = volume;
    this.onConversationStartedCallback = onConversationStarted;
    this.onConversationStoppedCallback = onConversationStopped;
    this.onAudioPlayingCallback = onAudioPlaying;
    this.onAudioStoppedCallback = onAudioStopped;
    this.onBufferLowCallback = onBufferLow;
    this.onBufferHighCallback = onBufferHigh;
    this.onConnectionChangeCallback = onConnectionChange;
    this.onErrorCallback = onError;

    this.isConversationActive = false;
    this.audioProcessor = null;

    this._initializeComponents();
  }

  _initializeComponents() {
    try {
      this.wsClient = new WebSocketClient({
        url: this.wsUrl,
        onOpen: () => this._handleWsOpen(),
        onClose: (event) => this._handleWsClose(event),
        onError: (error) => this._handleWsError(error),
        onMessage: (message) => this._handleWsMessage(message),
        onAudio: (data) => this._handleAudioData(data),
      });

      this.audioCapture = new AudioCapture({
        sampleRate: this.sampleRate,
        channelCount: 1,
        onStreamReady: (stream) => this._handleStreamReady(stream),
        onError: (error) => this._handleCaptureError(error),
      });

      this.audioQueue = new AudioQueue({
        minThreshold: this.minBufferThreshold,
        maxThreshold: this.maxBufferThreshold,
        onLowBuffer: (depth) => this._handleBufferLow(depth),
        onHighBuffer: (depth) => this._handleBufferHigh(depth),
        onBufferChange: (depth) => this._handleBufferChange(depth),
      });

      this.audioPlayer = new AudioPlayer({
        volume: this.volume,
        onPlaybackStart: () => this._handlePlaybackStart(),
        onPlaybackEnd: () => this._handlePlaybackEnd(),
        onChunkComplete: () => this._handleChunkComplete(),
        onError: (error) => this._handlePlayerError(error),
      });
    } catch (error) {
      this._handleError(new Error(`Failed to initialize audio components: ${error.message}`));
    }
  }

  async startConversation() {
    if (this.isConversationActive) return true;

    try {
      this.wsClient.connect();

      const contextRunning = await this.audioPlayer.ensureContextRunning();
      if (!contextRunning) {
        throw new Error('Failed to start AudioContext. Please interact with the page first.');
      }

      await this.audioCapture.start();

      this.isConversationActive = true;

      if (this.onConversationStartedCallback) {
        this.onConversationStartedCallback();
      }

      return true;
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }

  stopConversation() {
    if (!this.isConversationActive) return;

    try {
      this.audioCapture.stop();

      if (this.audioProcessor && this.audioProcessor.processing) {
        this.audioProcessor.stop();
        this.audioProcessor = null;
      }

      this.wsClient.disconnect();
      this.audioPlayer.stop();
      this.audioQueue.clear();

      this.isConversationActive = false;

      if (this.onConversationStoppedCallback) {
        this.onConversationStoppedCallback();
      }
    } catch (error) {
      this._handleError(error);
    }
  }

  _handleStreamReady(stream) {
    try {
      // Use AudioProcessor for raw Int16 PCM output (Deepgram requires Linear16)
      this.audioProcessor = new AudioProcessor({
        sampleRate: this.sampleRate,
        onAudioData: (pcmData) => {
          // pcmData is Int16Array — send raw buffer to backend
          this.wsClient.sendAudio(pcmData.buffer);
        },
        onError: (error) => {
          this._handleError(new Error(`AudioProcessor error: ${error.message}`));
        },
      });

      this.audioProcessor.start(stream);
    } catch (error) {
      this._handleError(new Error(`Failed to setup AudioProcessor: ${error.message}`));
    }
  }

  /**
   * Handle audio data from Deepgram via WebSocket.
   * Deepgram sends raw Linear16 PCM — do NOT use decodeAudioData.
   * Convert base64 → ArrayBuffer → send directly to scheduleBuffer.
   */
  _handleAudioData(data) {
    try {
      let audioArrayBuffer;

      if (typeof data === 'string') {
        // base64 string → ArrayBuffer
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioArrayBuffer = bytes.buffer;
      } else if (data instanceof ArrayBuffer) {
        audioArrayBuffer = data;
      } else if (data instanceof Uint8Array) {
        audioArrayBuffer = data.buffer;
      } else {
        throw new Error('Invalid audio data format');
      }

      // FIX: Do NOT use decodeAudioData — Deepgram sends raw PCM, not encoded audio.
      // Send raw ArrayBuffer directly to audioPlayer which handles PCM → AudioBuffer.
      this.audioQueue.enqueue(audioArrayBuffer);

      if (!this.audioPlayer.playing && !this.audioQueue.isEmpty()) {
        this._scheduleNextChunk();
      }
    } catch (error) {
      this._handleError(new Error(`Failed to process audio data: ${error.message}`));
    }
  }

  _scheduleNextChunk() {
    const audioData = this.audioQueue.dequeue();
    if (!audioData) return;

    // scheduleBuffer now accepts raw PCM ArrayBuffer and handles conversion internally
    this.audioPlayer.scheduleBuffer(audioData, this.sampleRate);
  }

  _handleWsOpen() {
    if (this.onConnectionChangeCallback) {
      this.onConnectionChangeCallback('connected');
    }
  }

  _handleWsClose(event) {
    if (this.onConnectionChangeCallback) {
      this.onConnectionChangeCallback('disconnected');
    }
    if (this.isConversationActive) {
      this.stopConversation();
    }
  }

  _handleWsError(error) {
    this._handleError(new Error(`WebSocket error: ${error.message || error}`));
  }

  _handleWsMessage(message) {
    // Non-audio messages (status, events, etc.)
    console.log('WS Message:', message);
  }

  _handleCaptureError(error) {
    this._handleError(new Error(`Audio capture error: ${error.message}`));
    if (this.isConversationActive) {
      this.stopConversation();
    }
  }

  _handlePlayerError(error) {
    this._handleError(new Error(`Audio playback error: ${error.message}`));
  }

  _handlePlaybackStart() {
    if (this.onAudioPlayingCallback) {
      this.onAudioPlayingCallback();
    }
  }

  _handlePlaybackEnd() {
    if (this.onAudioStoppedCallback) {
      this.onAudioStoppedCallback();
    }
  }

  _handleChunkComplete() {
    if (!this.audioQueue.isEmpty()) {
      this._scheduleNextChunk();
    }
  }

  _handleBufferLow(depth) {
    if (this.onBufferLowCallback) {
      this.onBufferLowCallback(depth);
    }
  }

  _handleBufferHigh(depth) {
    if (this.onBufferHighCallback) {
      this.onBufferHighCallback(depth);
    }
  }

  _handleBufferChange(depth) {
    // Available for UI monitoring
  }

  _handleError(error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  setVolume(volume) {
    this.audioPlayer.setVolume(volume);
  }

  getVolume() {
    return this.audioPlayer.getVolume?.() ?? this.volume;
  }

  get conversationActive() {
    return this.isConversationActive;
  }

  getConnectionState() {
    return this.wsClient.getConnectionState();
  }

  getQueueStats() {
    return this.audioQueue.getStats();
  }

  getAudioContextState() {
    return this.audioPlayer.getContextState?.() ?? 'unknown';
  }

  get playing() {
    return this.audioPlayer.playing;
  }

  destroy() {
    this.stopConversation();
    if (this.audioPlayer.destroy) {
      this.audioPlayer.destroy();
    }
  }
}

export default AudioManager;
