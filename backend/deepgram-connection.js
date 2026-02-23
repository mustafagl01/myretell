import { createClient } from '@deepgram/sdk';
import { AgentEvents } from '@deepgram/sdk';

/**
 * DeepgramConnection wraps the Deepgram Voice Agent API.
 *
 * This class manages the WebSocket connection to Deepgram's Voice Agent,
 * handles audio streaming, and forwards events to callbacks.
 *
 * Key features:
 * - Initializes with API key from environment
 * - Context manager pattern (connect/disconnect)
 * - Handles binary audio events from Deepgram
 * - Sends audio data to Deepgram
 */
export class DeepgramConnection {
  /**
   * Create a new DeepgramConnection instance.
   *
   * @param {Object} options - Configuration options
   * @param {Function} options.onAudio - Callback for binary audio data (Buffer)
   * @param {Function} options.onOpen - Callback when connection opens
   * @param {Function} options.onClose - Callback when connection closes
   * @param {Function} options.onError - Callback for errors
   * @param {Function} options.onMessage - Callback for JSON messages (optional)
   */
  constructor(options = {}) {
    const {
      onAudio = null,
      onOpen = null,
      onClose = null,
      onError = null,
      onMessage = null,
    } = options;

    // Validate DEEPGRAM_API_KEY from environment
    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY environment variable is required');
    }

    // Initialize Deepgram client
    this.client = createClient(process.env.DEEPGRAM_API_KEY);
    this.agent = null;
    this.isConnected = false;

    // Store callbacks
    this.onAudio = onAudio;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.onMessage = onMessage;
  }

  /**
   * Connect to Deepgram Voice Agent API.
   *
   * This establishes the WebSocket connection and sets up event handlers.
   * Call this before sending any audio data.
   *
   * @param {Object} config - Agent configuration (optional)
   * @returns {Promise<void>}
   */
  async connect(config = {}) {
    try {
      // SDK v3.7.x: client.agent() returns an AgentLiveClient object
      this.agent = this.client.agent();

      // Store config for later use after connection opens
      this._pendingConfig = config;

      // Set up event handlers BEFORE establishing connection
      this._setupEventHandlers();

      // Wait for connection to be established via setupConnection()
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Failed to connect to Deepgram within 15 seconds'));
        }, 15000);

        // Use a flag to prevent double-resolve from the Open handler in _setupEventHandlers
        this._connectResolve = () => {
          clearTimeout(timeout);
          resolve();
        };
        this._connectReject = (err) => {
          clearTimeout(timeout);
          reject(err);
        };

        // Initiate the WebSocket connection
        console.log(`[DEEPGRAM] [${new Date().toISOString()}] Initiating setupConnection()...`);
        try {
          this.agent.setupConnection();
          console.log(`[DEEPGRAM] [${new Date().toISOString()}] setupConnection() called successfully`);
        } catch (setupErr) {
          console.error(`[DEEPGRAM] [${new Date().toISOString()}] CRITICAL: setupConnection() threw synchronously:`, setupErr.message);
          this._connectReject(setupErr);
        }
      });
    } catch (error) {
      this.isConnected = false;
      console.error(`[DEEPGRAM] [${new Date().toISOString()}] Connection flow failed:`, error.message);
      if (error.stack) console.error(error.stack);
      throw new Error(`Failed to connect to Deepgram: ${error.message}`);
    }
  }

  /**
   * Disconnect from the Deepgram Voice Agent API.
   *
   * This gracefully closes the WebSocket connection.
   */
  disconnect() {
    if (this.agent) {
      try {
        this.agent.disconnect();
      } catch (error) {
        // Log but don't throw - we're cleaning up
        if (this.onError) {
          this.onError({
            type: 'disconnect_error',
            message: error.message,
          });
        }
      }
      this.agent = null;
      this.isConnected = false;
    }
  }

  /**
   * Send audio data to Deepgram.
   *
   * @param {Buffer|ArrayBuffer|Uint8Array} audioData - Audio data to send
   */
  sendAudio(audioData) {
    if (!this.isConnected || !this.agent) {
      console.warn('Attempted to send audio while not connected to Deepgram');
      return;
    }

    try {
      // Ensure we're sending a Buffer or Uint8Array
      const data = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
      this.agent.send(data);
    } catch (error) {
      console.error('Error sending audio to Deepgram:', error.message);
      if (this.onError) {
        this.onError({
          type: 'send_error',
          message: error.message,
        });
      }
    }
  }

  /**
   * Send a JSON control message to Deepgram.
   * 
   * @param {Object} data - The JSON object to send
   */
  sendJson(data) {
    if (!this.isConnected || !this.agent) {
      console.warn('Attempted to send JSON while not connected to Deepgram:', data.type);
      return;
    }

    try {
      const payload = JSON.stringify(data);
      this.agent.send(payload);
    } catch (error) {
      console.error('Error sending JSON to Deepgram:', error.message);
    }
  }

  /**
   * Configure the Voice Agent settings.
   *
   * This should be called before sending audio data.
   *
   * @param {Object} config - Agent configuration
   * @param {Object} config.agent - Agent settings
   * @param {Object} config.agent.listen - Listen (STT) configuration
   * @param {Object} config.agent.think - Think (LLM) configuration
   * @param {Object} config.agent.speak - Speak (TTS) configuration
   */
  configure(config) {
    if (!this.isConnected || !this.agent) {
      throw new Error('Not connected to Deepgram. Call connect() first.');
    }

    try {
      this.agent.configure(config);
    } catch (error) {
      if (this.onError) {
        this.onError({
          type: 'configure_error',
          message: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Send a keepalive to prevent connection timeout.
   *
   * Should be called at least every 8 seconds when not sending audio.
   */
  keepAlive() {
    if (this.isConnected && this.agent) {
      try {
        this.agent.keepAlive();
      } catch (error) {
        if (this.onError) {
          this.onError({
            type: 'keepalive_error',
            message: error.message,
          });
        }
      }
    }
  }

  /**
   * Send a function call response to Deepgram.
   *
   * This is used to return the result of a tool/function execution
   * back to the agent after handling a FunctionCallRequest event.
   *
   * @param {Object} response - Function call response
   * @param {string} response.function_call_id - The ID from the original request
   * @param {string} response.output - The result/output as a JSON string
   */
  functionCallResponse(response) {
    if (!this.isConnected || !this.agent) {
      throw new Error('Not connected to Deepgram. Call connect() first.');
    }

    const { function_call_id, output } = response;

    if (!function_call_id) {
      throw new Error('function_call_id is required for function call response');
    }

    if (!output) {
      throw new Error('output is required for function call response');
    }

    try {
      this.agent.functionCallResponse({
        function_call_id,
        output,
      });
    } catch (error) {
      if (this.onError) {
        this.onError({
          type: 'function_call_response_error',
          message: error.message,
          details: { function_call_id },
        });
      }
      throw error;
    }
  }

  /**
   * Set up event handlers for the agent connection.
   * @private
   */
  _setupEventHandlers() {
    if (!this.agent) return;

    // 1. Connection opened (waiting for Welcome)
    this.agent.on(AgentEvents.Open, () => {
      console.log('[DEEPGRAM] WebSocket connection strictly OPEN. (readyState: OPEN)');
      console.log('[DEEPGRAM] Waiting for "Welcome" from server...');
    });

    // 2. Welcome received -> Send Settings (Configuration)
    this.agent.on(AgentEvents.Welcome, (data) => {
      console.log('[DEEPGRAM] 📩 Welcome received! Request ID:', data?.request_id);

      const fullConfig = this._pendingConfig || {};
      if (Object.keys(fullConfig).length > 0) {
        // CRITICAL FIX: The SDK's configure() method automatically wraps the object in an 'agent' field.
        // If we pass { agent: { ... } }, it becomes { agent: { agent: { ... } } } which crashes.
        // We must pass ONLY the settings that go inside the agent.
        const settingsToPulse = fullConfig.agent || fullConfig;

        console.log('[DEEPGRAM] 📤 Dispatching Settings to SDK:', JSON.stringify(settingsToPulse, null, 2));
        try {
          // Use SDK method for protocol safety
          this.agent.configure(settingsToPulse);
          console.log('[DEEPGRAM] ✅ Configuration dispatched via SDK');
        } catch (err) {
          console.error('[DEEPGRAM] ❌ SDK configuration failed:', err.message);
          if (this._connectReject) {
            this._connectReject(new Error(`Deepgram Config Error: ${err.message}`));
            this._connectReject = null;
          }
        }
        this._pendingConfig = null;
      } else {
        console.warn('[DEEPGRAM] No pending config to send after Welcome');
      }
    });

    // 3. SettingsApplied received -> Connection is now READY
    this.agent.on(AgentEvents.SettingsApplied, (data) => {
      console.log('[DEEPGRAM] ⚡ SettingsApplied! Connection is now READY for audio.');
      this.isConnected = true;

      if (this.onOpen) {
        try {
          this.onOpen();
        } catch (e) {
          console.error('[DEEPGRAM] Error in onOpen callback:', e.message);
        }
      }

      // Resolve the connect() promise
      if (this._connectResolve) {
        this._connectResolve();
        this._connectResolve = null;
      }
    });

    // Connection closed
    this.agent.on(AgentEvents.Close, (event) => {
      console.log('Deepgram close event:', JSON.stringify(event));
      this.isConnected = false;
      if (this.onClose) {
        this.onClose(event);
      }
    });

    // Error occurred — extract full details from the Deepgram error object
    this.agent.on(AgentEvents.Error, (error) => {
      // Extract useful info from Deepgram error (it can be nested or unusual shape)
      const errMsg = error?.message
        || error?.error?.message
        || error?.description
        || error?.error?.description
        || (typeof error === 'string' ? error : null)
        || 'Unknown Deepgram error';

      const errCode = error?.code || error?.error?.code || error?.status || null;

      console.error('[DEEPGRAM ERROR] Code:', errCode, 'Message:', errMsg);
      console.error('[DEEPGRAM ERROR] Full object:', JSON.stringify(error, null, 2));

      // If we're still in the connect() phase, reject the promise
      if (this._connectReject) {
        this._connectReject(new Error(`Deepgram connection failed: ${errMsg}`));
        this._connectReject = null;
        return;
      }

      if (this.onError) {
        this.onError({
          type: 'connection_error',
          message: errMsg,
          code: errCode,
          details: error,
        });
      }
    });

    // Binary audio data received
    this.agent.on(AgentEvents.Audio, (audioData) => {
      if (this.onAudio) {
        this.onAudio(audioData);
      }
    });

    // Generic message handler (for all JSON events)
    this.agent.on(AgentEvents.Unhandled, (message) => {
      console.log('[DEEPGRAM] Unhandled event:', JSON.stringify(message).substring(0, 300));
      if (this.onMessage) {
        this.onMessage(message);
      }
    });

    // Handle specific events that might be useful
    const usefulEvents = [
      AgentEvents.UserStartedSpeaking,
      AgentEvents.AgentStartedSpeaking,
      AgentEvents.AgentThinking,
      AgentEvents.ConversationText,
      AgentEvents.Welcome,
      AgentEvents.SettingsApplied,
      AgentEvents.AgentAudioDone,
      AgentEvents.FunctionCallRequest,
    ];

    usefulEvents.forEach((eventType) => {
      this.agent.on(eventType, (data) => {
        if (this.onMessage) {
          this.onMessage({
            type: eventType,
            data,
          });
        }
      });
    });
  }

  /**
   * Check if the connection is currently active.
   *
   * @returns {boolean} True if connected
   */
  get connected() {
    return this.isConnected && this.agent && this.agent.isConnected();
  }
}

export default DeepgramConnection;
