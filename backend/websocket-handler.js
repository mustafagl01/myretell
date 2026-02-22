import { WebSocketServer } from 'ws';
import { DeepgramConnection } from './deepgram-connection.js';

/**
 * WebSocketHandler manages WebSocket connections for audio relay.
 *
 * Protocol:
 * - Frontend → Backend: Binary audio chunks (raw PCM/linear16)
 * - Backend → Frontend: JSON messages with type and data
 */
export class WebSocketHandler {
  constructor(options = {}) {
    const { server, path = '/ws', defaultAgentConfig = null } = options;

    if (!server) {
      throw new Error('HTTP server is required for WebSocket attachment');
    }

    this.server = server;
    this.path = path;
    this.wss = null;
    this.deepgramConnections = new Map(); // ws -> DeepgramConnection
    this.audioQueues = new Map(); // ws -> audio queue (while connecting)
    this.connectionReady = new Map(); // ws -> boolean
    this.defaultAgentConfig = defaultAgentConfig;

    this._initialize();
  }

  _initialize() {
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.path,
    });

    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error.message);
    });
  }

  _handleConnection(ws, req) {
    const clientIp = req.socket.remoteAddress;
    console.log(`WebSocket client connected: ${clientIp}`);

    // Initialize audio queue for this connection
    this.audioQueues.set(ws, []);
    this.connectionReady.set(ws, false);

    let deepgramConn = null;

    try {
      deepgramConn = new DeepgramConnection({
        onAudio: (audioData) => this._onDeepgramAudio(ws, audioData),
        onOpen: () => this._onDeepgramOpen(ws),
        onClose: (event) => this._onDeepgramClose(ws, event),
        onError: (error) => this._onDeepgramError(ws, error),
        onMessage: (message) => this._onDeepgramMessage(ws, message),
      });

      this.deepgramConnections.set(ws, deepgramConn);

      // Connect to Deepgram (async)
      deepgramConn.connect(this.defaultAgentConfig || {}).then(() => {
        console.log('Deepgram connection ready, flushing audio queue');
        this.connectionReady.set(ws, true);
        this._flushAudioQueue(ws);
      }).catch((error) => {
        console.error('Failed to connect to Deepgram:', error.message);
        this._sendError(ws, {
          type: 'connection_failed',
          message: 'Failed to connect to Deepgram service: ' + error.message,
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

    ws.on('message', (data, isBinary) => {
      this._handleClientMessage(ws, data, isBinary);
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${clientIp} (code: ${code})`);
      this._handleClientDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket client error: ${clientIp}:`, error.message);
      this._handleClientDisconnect(ws);
    });

    this._sendJson(ws, {
      type: 'Welcome',
      data: {
        message: 'Connected to MyVoiceAgent WebSocket',
        status: 'connected',
      },
    });
  }

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
        // Binary audio from frontend
        const isReady = this.connectionReady.get(ws);
        
        if (isReady) {
          // Connection ready, send immediately
          deepgramConn.sendAudio(data);
        } else {
          // Not ready yet, queue the audio
          const queue = this.audioQueues.get(ws);
          if (queue) {
            queue.push(data);
            // Limit queue size to prevent memory issues (max 5 seconds @ 16kHz)
            if (queue.length > 100) {
              queue.shift(); // Remove oldest
            }
          }
        }
      } else {
        // JSON control message
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
   * Flush queued audio when Deepgram connection is ready
   */
  _flushAudioQueue(ws) {
    const deepgramConn = this.deepgramConnections.get(ws);
    const queue = this.audioQueues.get(ws);

    if (!deepgramConn || !queue || queue.length === 0) {
      return;
    }

    console.log(`Flushing ${queue.length} queued audio chunks`);

    while (queue.length > 0) {
      const audioData = queue.shift();
      try {
        deepgramConn.sendAudio(audioData);
      } catch (error) {
        console.error('Error flushing audio queue:', error.message);
        break;
      }
    }
  }

  _handleJsonMessage(ws, message, deepgramConn) {
    const { type, data } = message;

    switch (type) {
      case 'Configure':
        if (data && deepgramConn.connected) {
          deepgramConn.configure(data);
        }
        break;

      case 'KeepAlive':
        deepgramConn.keepAlive();
        break;

      case 'Ping':
        this._sendJson(ws, { type: 'Pong', data: null });
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  _onDeepgramAudio(ws, audioData) {
    try {
      const base64Audio = audioData.toString('base64');
      this._sendJson(ws, {
        type: 'Audio',
        data: base64Audio,
      });
    } catch (error) {
      console.error('Error forwarding Deepgram audio:', error.message);
    }
  }

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

  _onDeepgramClose(ws, event) {
    console.log('Deepgram connection closed:', event.code, event.reason);
    this.connectionReady.set(ws, false);
    this._sendJson(ws, {
      type: 'Disconnected',
      data: {
        code: event.code,
        reason: event.reason || 'Connection closed',
      },
    });
  }

  _onDeepgramError(ws, error) {
    console.error('Deepgram error:', error);
    this._sendError(ws, error);
  }

  _onDeepgramMessage(ws, message) {
    this._sendJson(ws, message);
  }

  _handleClientDisconnect(ws) {
    const deepgramConn = this.deepgramConnections.get(ws);

    if (deepgramConn) {
      deepgramConn.disconnect();
      this.deepgramConnections.delete(ws);
    }

    // Clean up queue and ready state
    this.audioQueues.delete(ws);
    this.connectionReady.delete(ws);

    ws.close();
  }

  _sendJson(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending JSON to client:', error.message);
      }
    }
  }

  _sendError(ws, error) {
    this._sendJson(ws, {
      type: 'Error',
      data: error,
    });
  }

  close() {
    for (const [ws, deepgramConn] of this.deepgramConnections) {
      try {
        deepgramConn.disconnect();
        ws.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.deepgramConnections.clear();
    this.audioQueues.clear();
    this.connectionReady.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  get connectionCount() {
    return this.deepgramConnections.size;
  }
}

export default WebSocketHandler;
