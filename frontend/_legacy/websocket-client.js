/**
 * WebSocketClient manages WebSocket connection to the backend audio relay.
 *
 * This class handles:
 * - WebSocket connection to ws://localhost:3001/ws
 * - Sending binary audio data to the backend
 * - Receiving JSON messages including audio data
 * - Automatic reconnection with exponential backoff
 * - Event callbacks for connection state changes
 *
 * Protocol:
 * - Frontend → Backend: Binary audio chunks (raw PCM/linear16)
 * - Backend → Frontend: JSON messages with type and data
 * - Audio message format: { type: "Audio", data: "<base64_encoded_audio>" }
 */
export class WebSocketClient {
  /**
   * Create a new WebSocketClient instance.
   *
   * @param {Object} options - Configuration options
   * @param {string} options.url - WebSocket server URL (default: 'ws://localhost:3001/ws')
   * @param {Function} options.onOpen - Callback when connection opens
   * @param {Function} options.onClose - Callback when connection closes
   * @param {Function} options.onError - Callback when error occurs
   * @param {Function} options.onMessage - Callback for JSON messages (non-audio)
   * @param {Function} options.onAudio - Callback for audio data
   * @param {Object} options.reconnectConfig - Reconnection configuration
   */
  constructor(options = {}) {
    const {
      url = 'ws://localhost:3001/ws',
      token = null,
      onOpen = null,
      onClose = null,
      onError = null,
      onMessage = null,
      onAudio = null,
      reconnectConfig = {},
    } = options;

    this.url = url;
    this.token = token;
    this.onOpenCallback = onOpen;
    this.onCloseCallback = onClose;
    this.onErrorCallback = onError;
    this.onMessageCallback = onMessage;
    this.onAudioCallback = onAudio;

    // Reconnection configuration
    this.reconnectConfig = {
      enabled: reconnectConfig.enabled !== false, // enabled by default
      maxAttempts: reconnectConfig.maxAttempts || 10,
      initialDelay: reconnectConfig.initialDelay || 1000, // 1 second
      maxDelay: reconnectConfig.maxDelay || 30000, // 30 seconds
      backoffFactor: reconnectConfig.backoffFactor || 1.5,
    };

    // Connection state
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;

    // Message queue for messages sent while disconnected
    this.messageQueue = [];
  }

  /**
   * Connect to the WebSocket server.
   */
  connect() {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      this.ws = new WebSocket(this.url);
      this._setupEventHandlers();
    } catch (error) {
      this._handleError(error);
      this.isConnecting = false;

      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    }
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect() {
    this.shouldReconnect = false;

    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close the WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
    }
  }

  /**
   * Send binary audio data to the server.
   *
   * @param {ArrayBuffer|Uint8Array} audioData - Binary audio data
   * @returns {boolean} True if data was sent, false otherwise
   */
  sendAudio(audioData) {
    if (!this.isConnected) {
      return false;
    }

    try {
      this.ws.send(audioData);
      return true;
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }

  /**
   * Send a JSON message to the server.
   *
   * @param {Object} message - Message object to send
   * @returns {boolean} True if message was sent, false otherwise
   */
  sendJson(message) {
    if (!this.isConnected) {
      // Queue message for later sending
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }

  /**
   * Setup WebSocket event handlers.
   * @private
   */
  _setupEventHandlers() {
    this.ws.onopen = () => this._handleOpen();
    this.ws.onclose = (event) => this._handleClose(event);
    this.ws.onerror = (event) => this._handleError(event);
    this.ws.onmessage = (event) => this._handleMessage(event);
  }

  /**
   * Handle WebSocket connection opened.
   * @private
   */
  _handleOpen() {
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Send authentication token if provided
    if (this.token) {
      this.sendJson({ type: 'Authenticate', data: { token: this.token } });
    }

    // Send any queued messages
    this._flushMessageQueue();

    // Notify callback
    if (this.onOpenCallback) {
      this.onOpenCallback();
    }
  }

  /**
   * Handle WebSocket connection closed.
   * @private
   *
   * @param {CloseEvent} event - Close event
   */
  _handleClose(event) {
    this.isConnecting = false;
    this.isConnected = false;

    // Notify callback
    if (this.onCloseCallback) {
      this.onCloseCallback(event);
    }

    // Attempt reconnection if enabled
    if (this.shouldReconnect && this.reconnectConfig.enabled) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error.
   * @private
   *
   * @param {Event} error - Error event
   */
  _handleError(error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Handle incoming WebSocket message.
   * @private
   *
   * @param {MessageEvent} event - Message event
   */
  _handleMessage(event) {
    try {
      // Parse JSON message
      const message = JSON.parse(event.data);
      const { type, data } = message;

      // Handle audio messages
      if (type === 'Audio' && this.onAudioCallback) {
        this.onAudioCallback(data);
      }
      // Handle other JSON messages
      else if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    } catch (error) {
      // Failed to parse JSON
      this._handleError(error);
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   * @private
   */
  _scheduleReconnect() {
    // Don't schedule if already scheduled or reconnection is disabled
    if (this.reconnectTimeout || !this.shouldReconnect) {
      return;
    }

    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('Max reconnection attempts reached'));
      }
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectConfig.initialDelay *
      Math.pow(this.reconnectConfig.backoffFactor, this.reconnectAttempts),
      this.reconnectConfig.maxDelay
    );

    this.reconnectAttempts++;

    // Schedule reconnection
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Send queued messages.
   * @private
   */
  _flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        // Put message back in queue if sending fails
        this.messageQueue.unshift(message);
        this._handleError(error);
        break;
      }
    }
  }

  /**
   * Get the current connection state.
   *
   * @returns {string} Connection state: 'connected', 'connecting', 'disconnected'
   */
  getConnectionState() {
    if (this.isConnected) {
      return 'connected';
    }
    if (this.isConnecting) {
      return 'connecting';
    }
    return 'disconnected';
  }

  /**
   * Check if the client is currently connected.
   *
   * @returns {boolean} True if connected
   */
  get connected() {
    return this.isConnected;
  }
}

export default WebSocketClient;
