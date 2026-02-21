/**
 * AudioManager orchestrates all audio components for the voice agent.
 *
 * This class handles:
 * - Coordinating AudioCapture, AudioQueue, AudioPlayer, and WebSocketClient
 * - Managing the data flow: capture → WebSocket → queue → player
 * - Handling conversation state (active/inactive)
 * - Processing audio from microphone to Deepgram and back to speakers
 * - Error handling and state management
 *
 * Data Flow:
 * 1. Microphone audio captured by AudioCapture (MediaStream)
 * 2. Audio chunks sent to backend via WebSocketClient
 * 3. Backend forwards to Deepgram Voice Agent API
 * 4. Deepgram responses (AgentEvents.Audio) received via WebSocket
 * 5. Audio data decoded by AudioPlayer
 * 6. Decoded AudioBuffer queued in AudioQueue
 * 7. AudioPlayer schedules chunks for gapless playback
 *
 * State Management:
 * - Tracks conversation active state
 * - Monitors buffer depth for playback health
 * - Handles connection state changes
 * - Manages AudioContext user gesture requirements
 */
import { AudioCapture } from './audio-capture.js';
import { AudioQueue } from './audio-queue.js';
import { AudioPlayer } from './audio-player.js';
import { WebSocketClient } from './websocket-client.js';

export class AudioManager {
  /**
   * Create a new AudioManager instance.
   *
   * @param {Object} options - Configuration options
   * @param {string} options.wsUrl - WebSocket server URL (default: 'ws://localhost:3001/ws')
   * @param {number} options.sampleRate - Audio sample rate in Hz (default: 16000)
   * @param {number} options.minBufferThreshold - Minimum buffer threshold (default: 3)
   * @param {number} options.maxBufferThreshold - Maximum buffer threshold (default: 5)
   * @param {number} options.volume - Playback volume 0.0 to 1.0 (default: 1.0)
   * @param {Function} options.onConversationStarted - Callback when conversation starts
   * @param {Function} options.onConversationStopped - Callback when conversation stops
   * @param {Function} options.onAudioPlaying - Callback when audio starts playing
   * @param {Function} options.onAudioStopped - Callback when audio stops playing
   * @param {Function} options.onBufferLow - Callback when buffer is low
   * @param {Function} options.onBufferHigh - Callback when buffer is high
   * @param {Function} options.onConnectionChange - Callback when connection state changes
   * @param {Function} options.onError - Callback when error occurs
   */
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
    this.onConversationStartedCallback = onConversationStarted;
    this.onConversationStoppedCallback = onConversationStopped;
    this.onAudioPlayingCallback = onAudioPlaying;
    this.onAudioStoppedCallback = onAudioStopped;
    this.onBufferLowCallback = onBufferLow;
    this.onBufferHighCallback = onBufferHigh;
    this.onConnectionChangeCallback = onConnectionChange;
    this.onErrorCallback = onError;

    // Conversation state
    this.isConversationActive = false;
    this.mediaRecorder = null;
    this.audioChunks = [];

    // Initialize components
    this._initializeComponents();
  }

  /**
   * Initialize all audio components.
   * @private
   */
  _initializeComponents() {
    try {
      // Initialize WebSocket client for backend communication
      this.wsClient = new WebSocketClient({
        url: this.wsUrl,
        onOpen: () => this._handleWsOpen(),
        onClose: (event) => this._handleWsClose(event),
        onError: (error) => this._handleWsError(error),
        onMessage: (message) => this._handleWsMessage(message),
        onAudio: (data) => this._handleAudioData(data),
      });

      // Initialize audio capture for microphone access
      this.audioCapture = new AudioCapture({
        sampleRate: this.sampleRate,
        channelCount: 1,
        onStreamReady: (stream) => this._handleStreamReady(stream),
        onError: (error) => this._handleCaptureError(error),
      });

      // Initialize audio queue for buffering
      this.audioQueue = new AudioQueue({
        minThreshold: this.minBufferThreshold,
        maxThreshold: this.maxBufferThreshold,
        onLowBuffer: (depth) => this._handleBufferLow(depth),
        onHighBuffer: (depth) => this._handleBufferHigh(depth),
        onBufferChange: (depth) => this._handleBufferChange(depth),
      });

      // Initialize audio player for playback
      this.audioPlayer = new AudioPlayer({
        volume: volume,
        onPlaybackStart: () => this._handlePlaybackStart(),
        onPlaybackEnd: () => this._handlePlaybackEnd(),
        onChunkComplete: () => this._handleChunkComplete(),
        onError: (error) => this._handlePlayerError(error),
      });
    } catch (error) {
      this._handleError(new Error(`Failed to initialize audio components: ${error.message}`));
    }
  }

  /**
   * Start the voice conversation.
   *
   * This method:
   * 1. Connects to the WebSocket server
   * 2. Requests microphone access from the user
   * 3. Starts capturing audio from the microphone
   * 4. Ensures AudioContext is running (requires user gesture)
   *
   * @returns {Promise<boolean>} True if conversation started successfully
   */
  async startConversation() {
    if (this.isConversationActive) {
      return true;
    }

    try {
      // Connect to WebSocket server
      this.wsClient.connect();

      // Ensure AudioContext is running (requires user gesture)
      const contextRunning = await this.audioPlayer.ensureContextRunning();
      if (!contextRunning) {
        throw new Error('Failed to start AudioContext. Please ensure you have interacted with the page.');
      }

      // Start capturing audio from microphone
      await this.audioCapture.start();

      this.isConversationActive = true;

      // Notify callback
      if (this.onConversationStartedCallback) {
        this.onConversationStartedCallback();
      }

      return true;
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }

  /**
   * Stop the voice conversation.
   *
   * This method:
   * 1. Stops capturing audio from the microphone
   * 2. Disconnects from the WebSocket server
   * 3. Stops any currently playing audio
   * 4. Clears the audio queue
   */
  stopConversation() {
    if (!this.isConversationActive) {
      return;
    }

    try {
      // Stop capturing audio
      this.audioCapture.stop();

      // Stop MediaRecorder if active
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }

      // Clear audio chunks
      this.audioChunks = [];

      // Disconnect WebSocket
      this.wsClient.disconnect();

      // Stop audio playback
      this.audioPlayer.stop();

      // Clear audio queue
      this.audioQueue.clear();

      this.isConversationActive = false;

      // Notify callback
      if (this.onConversationStoppedCallback) {
        this.onConversationStoppedCallback();
      }
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Handle MediaStream ready from AudioCapture.
   * @private
   *
   * @param {MediaStream} stream - The media stream
   */
  _handleStreamReady(stream) {
    try {
      // Create MediaRecorder to capture audio chunks
      const mimeType = this._getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 16000,
      });

      // Collect audio chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);

          // Send audio chunk to backend via WebSocket
          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result;
            this.wsClient.sendAudio(arrayBuffer);
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      // Handle recording errors
      this.mediaRecorder.onerror = (event) => {
        this._handleError(new Error(`MediaRecorder error: ${event.error}`));
      };

      // Start recording with 100ms chunks for low latency
      this.mediaRecorder.start(100);
    } catch (error) {
      this._handleError(new Error(`Failed to setup MediaRecorder: ${error.message}`));
    }
  }

  /**
   * Get supported MIME type for MediaRecorder.
   * @private
   *
   * @returns {string} Supported MIME type
   */
  _getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mp3',
      '',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  /**
   * Handle audio data received from WebSocket.
   * @private
   *
   * @param {string} data - Base64 encoded audio data or JSON object
   */
  async _handleAudioData(data) {
    try {
      // Convert base64 data to ArrayBuffer
      let audioArrayBuffer;

      if (typeof data === 'string') {
        // Base64 encoded string
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioArrayBuffer = bytes.buffer;
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        // Already binary data
        audioArrayBuffer = data instanceof Uint8Array ? data.buffer : data;
      } else {
        throw new Error('Invalid audio data format');
      }

      // Decode audio data
      const audioBuffer = await this.audioPlayer.decodeAudioData(audioArrayBuffer);

      // Enqueue for playback
      this.audioQueue.enqueue(audioBuffer);

      // Schedule playback if not already playing
      if (!this.audioPlayer.playing && !this.audioQueue.isEmpty()) {
        this._scheduleNextChunk();
      }
    } catch (error) {
      this._handleError(new Error(`Failed to process audio data: ${error.message}`));
    }
  }

  /**
   * Schedule the next audio chunk for playback.
   * @private
   */
  async _scheduleNextChunk() {
    const audioBuffer = this.audioQueue.dequeue();
    if (!audioBuffer) {
      return;
    }

    // Schedule the buffer for gapless playback
    this.audioPlayer.scheduleBuffer(audioBuffer);
  }

  /**
   * Handle WebSocket connection opened.
   * @private
   */
  _handleWsOpen() {
    if (this.onConnectionChangeCallback) {
      this.onConnectionChangeCallback('connected');
    }
  }

  /**
   * Handle WebSocket connection closed.
   * @private
   *
   * @param {CloseEvent} event - Close event
   */
  _handleWsClose(event) {
    if (this.onConnectionChangeCallback) {
      this.onConnectionChangeCallback('disconnected');
    }

    // If conversation was active, stop it
    if (this.isConversationActive) {
      this.stopConversation();
    }
  }

  /**
   * Handle WebSocket error.
   * @private
   *
   * @param {Error} error - The error
   */
  _handleWsError(error) {
    this._handleError(new Error(`WebSocket error: ${error.message || error}`));
  }

  /**
   * Handle WebSocket message (non-audio).
   * @private
   *
   * @param {Object} message - The message object
   */
  _handleWsMessage(message) {
    // Handle non-audio messages if needed
    // Currently we only handle audio messages
  }

  /**
   * Handle audio capture error.
   * @private
   *
   * @param {Error} error - The error
   */
  _handleCaptureError(error) {
    this._handleError(new Error(`Audio capture error: ${error.message}`));

    // Stop conversation if capture fails
    if (this.isConversationActive) {
      this.stopConversation();
    }
  }

  /**
   * Handle audio playback error.
   * @private
   *
   * @param {Error} error - The error
   */
  _handlePlayerError(error) {
    this._handleError(new Error(`Audio playback error: ${error.message}`));
  }

  /**
   * Handle playback started.
   * @private
   */
  _handlePlaybackStart() {
    if (this.onAudioPlayingCallback) {
      this.onAudioPlayingCallback();
    }
  }

  /**
   * Handle playback ended.
   * @private
   */
  _handlePlaybackEnd() {
    if (this.onAudioStoppedCallback) {
      this.onAudioStoppedCallback();
    }
  }

  /**
   * Handle chunk completion - schedule next chunk.
   * @private
   */
  _handleChunkComplete() {
    // Schedule next chunk if available
    if (!this.audioQueue.isEmpty()) {
      this._scheduleNextChunk();
    }
  }

  /**
   * Handle low buffer state.
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _handleBufferLow(depth) {
    if (this.onBufferLowCallback) {
      this.onBufferLowCallback(depth);
    }
  }

  /**
   * Handle high buffer state.
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _handleBufferHigh(depth) {
    if (this.onBufferHighCallback) {
      this.onBufferHighCallback(depth);
    }
  }

  /**
   * Handle buffer depth change.
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _handleBufferChange(depth) {
    // Can be used for UI updates or monitoring
  }

  /**
   * Handle errors and notify callback.
   * @private
   *
   * @param {Error} error - The error
   */
  _handleError(error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Set the playback volume.
   *
   * @param {number} volume - Volume level 0.0 to 1.0
   */
  setVolume(volume) {
    this.audioPlayer.setVolume(volume);
  }

  /**
   * Get the current playback volume.
   *
   * @returns {number} Current volume 0.0 to 1.0
   */
  getVolume() {
    return this.audioPlayer.getVolume();
  }

  /**
   * Get the current conversation state.
   *
   * @returns {boolean} True if conversation is active
   */
  get conversationActive() {
    return this.isConversationActive;
  }

  /**
   * Get the WebSocket connection state.
   *
   * @returns {string} Connection state: 'connected', 'connecting', 'disconnected'
   */
  getConnectionState() {
    return this.wsClient.getConnectionState();
  }

  /**
   * Get the audio queue statistics.
   *
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    return this.audioQueue.getStats();
  }

  /**
   * Get the AudioContext state.
   *
   * @returns {string} AudioContext state: 'suspended', 'running', or 'closed'
   */
  getAudioContextState() {
    return this.audioPlayer.getContextState();
  }

  /**
   * Check if audio is currently playing.
   *
   * @returns {boolean} True if audio is playing
   */
  get playing() {
    return this.audioPlayer.playing;
  }

  /**
   * Clean up resources.
   *
   * Stops all components and releases resources.
   * Call this when the audio manager is no longer needed.
   */
  destroy() {
    this.stopConversation();
    this.audioPlayer.destroy();
  }
}

export default AudioManager;
