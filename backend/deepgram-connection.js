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
      // Create new agent connection using the explicit v1.connect() method
      // Note: In SDK v3+, client.agent.v1.connect() is the recommended way to establish the WebSocket
      this.agent = await this.client.agent.v1.connect();

      // Set up event handlers
      this._setupEventHandlers();

      // Configure agent if settings provided
      if (config && Object.keys(config).length > 0) {
        // Log the config we're sending for debugging
        console.log('Configuring Deepgram agent with:', JSON.stringify(config, null, 2));
        this.agent.configure(config);
      }

      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      console.error('Deepgram connection error details:', error);
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
      throw new Error('Not connected to Deepgram. Call connect() first.');
    }

    try {
      // Ensure we're sending a Buffer or Uint8Array
      const data = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
      this.agent.send(data);
    } catch (error) {
      if (this.onError) {
        this.onError({
          type: 'send_error',
          message: error.message,
        });
      }
      throw error;
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

    // Connection opened
    this.agent.on(AgentEvents.Open, () => {
      this.isConnected = true;
      if (this.onOpen) {
        this.onOpen();
      }
    });

    // Connection closed
    this.agent.on(AgentEvents.Close, (event) => {
      this.isConnected = false;
      if (this.onClose) {
        this.onClose(event);
      }
    });

    // Error occurred
    this.agent.on(AgentEvents.Error, (error) => {
      if (this.onError) {
        this.onError({
          type: 'connection_error',
          message: error.message || 'Unknown Deepgram error',
          details: error,
        });
      }
    });

    // Binary audio data received
    this.agent.on(AgentEvents.Audio, (audioData) => {
      if (this.onAudio) {
        // AudioData is a Buffer from Deepgram
        this.onAudio(audioData);
      }
    });

    // Generic message handler (for all JSON events)
    this.agent.on(AgentEvents.Unhandled, (message) => {
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
