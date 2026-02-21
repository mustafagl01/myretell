import { WebSocketServer } from 'ws';
import { DeepgramConnection } from './deepgram-connection.js';

/**
 * WebSocketHandler manages WebSocket connections for audio relay.
 *
 * This class creates a WebSocket server that:
 * - Receives binary audio data from the frontend
 * - Forwards audio to Deepgram Voice Agent
 * - Receives audio events from Deepgram
 * - Forwards audio data to the frontend as JSON messages
 *
 * Protocol:
 * - Frontend → Backend: Binary audio chunks (raw PCM/linear16)
 * - Backend → Frontend: JSON messages with type and data
 * - Example: { type: "Audio", data: "<base64_encoded_audio>" }
 */
export class WebSocketHandler {
  /**
   * Create a new WebSocketHandler instance.
   *
   * @param {Object} options - Configuration options
   * @param {Object} options.server - HTTP server to attach WebSocket to
   * @param {string} options.path - WebSocket endpoint path (default: '/ws')
   * @param {Object} options.defaultAgentConfig - Default agent configuration to apply on connect
   */
  constructor(options = {}) {
    const { server, path = '/ws', defaultAgentConfig = null } = options;

    if (!server) {
      throw new Error('HTTP server is required for WebSocket attachment');
    }

    this.server = server;
    this.path = path;
    this.wss = null;
    this.deepgramConnections = new Map(); // ws -> DeepgramConnection
    this.defaultAgentConfig = defaultAgentConfig;

    // Initialize WebSocket server
    this._initialize();
  }

  /**
   * Initialize the WebSocket server.
   * @private
   */
  _initialize() {
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.path,
    });

    // Handle new WebSocket connections
    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    // Handle server errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error.message);
    });
  }

  /**
   * Handle a new WebSocket connection.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} req - HTTP request object
   */
  _handleConnection(ws, req) {
    const clientIp = req.socket.remoteAddress;
    console.log(`WebSocket client connected: ${clientIp}`);

    // Create Deepgram connection for this client
    let deepgramConn = null;

    try {
      deepgramConn = new DeepgramConnection({
        onAudio: (audioData) => this._onDeepgramAudio(ws, audioData),
        onOpen: () => this._onDeepgramOpen(ws),
        onClose: (event) => this._onDeepgramClose(ws, event),
        onError: (error) => this._onDeepgramError(ws, error),
        onMessage: (message) => this._onDeepgramMessage(ws, message),
      });

      // Store the connection
      this.deepgramConnections.set(ws, deepgramConn);

      // Connect to Deepgram with default agent configuration
      deepgramConn.connect(this.defaultAgentConfig || {}).catch((error) => {
        console.error('Failed to connect to Deepgram:', error.message);
        this._sendError(ws, {
          type: 'connection_failed',
          message: 'Failed to connect to Deepgram service',
        });
        ws.close();
      });
    } catch (error) {
      console.error('Error creating Deepgram connection:', error.message);
      this._sendError(ws, {
        type: 'initialization_error',
        message: error.message,
      });
      ws.close();
      return;
    }

    // Handle incoming messages from client
    ws.on('message', (data, isBinary) => {
      this._handleClientMessage(ws, data, isBinary);
    });

    // Handle client disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${clientIp} (code: ${code})`);
      this._handleClientDisconnect(ws);
    });

    // Handle client errors
    ws.on('error', (error) => {
      console.error(`WebSocket client error: ${clientIp}:`, error.message);
      this._handleClientDisconnect(ws);
    });

    // Send welcome message
    this._sendJson(ws, {
      type: 'Welcome',
      data: {
        message: 'Connected to MyVoiceAgent WebSocket',
        status: 'connected',
      },
    });
  }

  /**
   * Handle incoming messages from the WebSocket client.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Buffer} data - Message data (binary or text)
   * @param {boolean} isBinary - Whether the message is binary
   */
  _handleClientMessage(ws, data, isBinary) {
    const deepgramConn = this.deepgramConnections.get(ws);

    if (!deepgramConn) {
      this._sendError(ws, {
        type: 'connection_error',
        message: 'Deepgram connection not established',
      });
      return;
    }

    try {
      if (isBinary) {
        // Binary data = audio from frontend, forward to Deepgram
        deepgramConn.sendAudio(data);
      } else {
        // JSON message = control/config message
        const message = JSON.parse(data.toString());
        this._handleJsonMessage(ws, message, deepgramConn);
      }
    } catch (error) {
      console.error('Error handling client message:', error.message);
      this._sendError(ws, {
        type: 'message_error',
        message: error.message,
      });
    }
  }

  /**
   * Handle JSON control messages from the client.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} message - Parsed JSON message
   * @param {DeepgramConnection} deepgramConn - Deepgram connection instance
   */
  _handleJsonMessage(ws, message, deepgramConn) {
    const { type, data } = message;

    switch (type) {
      case 'Configure':
        // Configure the agent settings
        if (data && deepgramConn.connected) {
          deepgramConn.configure(data);
        }
        break;

      case 'KeepAlive':
        // Send keepalive to Deepgram
        deepgramConn.keepAlive();
        break;

      case 'Ping':
        // Respond with pong
        this._sendJson(ws, { type: 'Pong', data: null });
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  /**
   * Handle audio data from Deepgram.
   * Forward to frontend as JSON with base64 encoded data.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Buffer} audioData - Binary audio data from Deepgram
   */
  _onDeepgramAudio(ws, audioData) {
    try {
      // Encode binary audio as base64 for JSON transmission
      const base64Audio = audioData.toString('base64');

      this._sendJson(ws, {
        type: 'Audio',
        data: base64Audio,
      });
    } catch (error) {
      console.error('Error forwarding Deepgram audio:', error.message);
    }
  }

  /**
   * Handle Deepgram connection opened.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   */
  _onDeepgramOpen(ws) {
    console.log('Deepgram connection established');
    this._sendJson(ws, {
      type: 'Connected',
      data: {
        message: 'Deepgram connection established',
        status: 'ready',
      },
    });
  }

  /**
   * Handle Deepgram connection closed.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} event - Close event
   */
  _onDeepgramClose(ws, event) {
    console.log('Deepgram connection closed:', event.code, event.reason);
    this._sendJson(ws, {
      type: 'Disconnected',
      data: {
        code: event.code,
        reason: event.reason || 'Connection closed',
      },
    });
  }

  /**
   * Handle Deepgram error.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} error - Error object
   */
  _onDeepgramError(ws, error) {
    console.error('Deepgram error:', error.message);
    this._sendError(ws, error);
  }

  /**
   * Handle JSON messages from Deepgram (non-audio events).
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} message - Message from Deepgram
   */
  _onDeepgramMessage(ws, message) {
    // Forward JSON messages to frontend
    this._sendJson(ws, message);
  }

  /**
   * Handle client disconnect.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   */
  _handleClientDisconnect(ws) {
    const deepgramConn = this.deepgramConnections.get(ws);

    if (deepgramConn) {
      deepgramConn.disconnect();
      this.deepgramConnections.delete(ws);
    }

    ws.close();
  }

  /**
   * Send a JSON message to the WebSocket client.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} data - Data to send as JSON
   */
  _sendJson(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending JSON to client:', error.message);
      }
    }
  }

  /**
   * Send an error message to the WebSocket client.
   * @private
   *
   * @param {Object} ws - WebSocket connection instance
   * @param {Object} error - Error object
   */
  _sendError(ws, error) {
    this._sendJson(ws, {
      type: 'Error',
      data: error,
    });
  }

  /**
   * Close all WebSocket connections and cleanup.
   */
  close() {
    // Close all Deepgram connections
    for (const [ws, deepgramConn] of this.deepgramConnections) {
      try {
        deepgramConn.disconnect();
        ws.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.deepgramConnections.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  /**
   * Get the number of active connections.
   *
   * @returns {number} Active connection count
   */
  get connectionCount() {
    return this.deepgramConnections.size;
  }
}

export default WebSocketHandler;
