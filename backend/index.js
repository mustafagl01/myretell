import express from 'express';
import dotenv from 'dotenv';
import { createClient, AgentEvents } from '@deepgram/sdk';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

// Verify environment variables are loaded
const requiredEnvVars = ['DEEPGRAM_API_KEY'];
const optionalEnvVars = ['POSTGRES_URL', 'PORT'];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

console.log('Environment loaded successfully');
console.log(`Required: DEEPGRAM_API_KEY (${process.env.DEEPGRAM_API_KEY ? '✓' : '✗'})`);
if (process.env.POSTGRES_URL) {
  console.log(`Optional: POSTGRES_URL (✓)`);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Deepgram client
let deepgramClient = null;
try {
  if (process.env.DEEPGRAM_API_KEY) {
    deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
  }
} catch (error) {
  console.error('Failed to initialize Deepgram client:', error.message);
}

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'MyVoiceAgent Backend',
    status: 'running',
    deepgramConfigured: !!deepgramClient
  });
});

// ========== Epic 2: WebSocket Connection & Configuration ==========

// Store active connection and keep-alive interval
let deepgramConnection = null;
let keepAliveInterval = null;

// Keep-alive function to maintain connection
function keepAlive() {
  if (deepgramConnection) {
    try {
      deepgramConnection.keepAlive();
      console.log('Keep-alive signal sent');
    } catch (error) {
      console.error('Error sending keep-alive:', error.message);
    }
  }
}

// Deepgram WebSocket connect endpoint
app.post('/api/deepgram/connect', async (req, res) => {
  try {
    if (!deepgramClient) {
      return res.status(500).json({ error: 'Deepgram client not initialized' });
    }

    if (deepgramConnection) {
      return res.status(400).json({ error: 'Connection already exists' });
    }

    // Create agent connection
    deepgramConnection = deepgramClient.agent();

    // Handle connection opened
    deepgramConnection.on(AgentEvents.Open, () => {
      console.log('Deepgram agent connection opened');

      // Configure the agent
      deepgramConnection.configure({
        tags: ['myvoiceagent', 'demo'],
        agent: {
          // Speech-to-text configuration
          listen: {
            provider: {
              type: 'deepgram',
              model: 'nova-3'
            }
          },
          // Text-to-speech configuration
          speak: {
            provider: {
              type: 'deepgram',
              model: 'aura-2-thalia-en'
            }
          },
          // LLM configuration
          think: {
            provider: {
              type: 'open_ai',
              model: 'gpt-4o-mini'
            },
            instructions: 'You are a helpful voice assistant. Be concise and friendly.'
          },
          greeting: 'Hello! How can I help you today?'
        }
      });
    });

    // Handle settings applied
    deepgramConnection.on(AgentEvents.SettingsApplied, () => {
      console.log('Agent configuration applied successfully');
    });

    // Handle welcome event
    deepgramConnection.on(AgentEvents.Welcome, (data) => {
      console.log('Welcome event received, request ID:', data.request_id);
    });

    // Handle conversation text
    deepgramConnection.on(AgentEvents.ConversationText, (data) => {
      console.log(`[${data.role}]: ${data.content}`);
    });

    // Handle user started speaking
    deepgramConnection.on(AgentEvents.UserStartedSpeaking, () => {
      console.log('User started speaking...');
    });

    // Handle agent thinking
    deepgramConnection.on(AgentEvents.AgentThinking, (data) => {
      console.log('Agent thinking:', data.content);
    });

    // Handle agent started speaking
    deepgramConnection.on(AgentEvents.AgentStartedSpeaking, (data) => {
      console.log('Agent started speaking (latency:', data.total_latency, 'ms)');
    });

    // Handle agent audio
    deepgramConnection.on(AgentEvents.Audio, (audioData) => {
      console.log('Agent audio data received');
    });

    // Handle agent finished speaking
    deepgramConnection.on(AgentEvents.AgentAudioDone, () => {
      console.log('Agent finished speaking');
    });

    // Handle errors
    deepgramConnection.on(AgentEvents.Error, (error) => {
      console.error('Deepgram agent error:', error);
    });

    // Handle connection closed
    deepgramConnection.on(AgentEvents.Close, () => {
      console.log('Deepgram agent connection closed');
      // Clear keep-alive interval when connection closes
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      deepgramConnection = null;
    });

    // Start keep-alive interval (every 5 seconds)
    keepAliveInterval = setInterval(keepAlive, 5000);

    res.json({
      success: true,
      message: 'Deepgram agent connection initiated',
      configuration: {
        stt_model: 'nova-3',
        llm_model: 'gpt-4o-mini',
        tts_model: 'aura-2-thalia-en'
      }
    });

  } catch (error) {
    console.error('Error connecting to Deepgram agent:', error);
    res.status(500).json({ error: 'Failed to connect to Deepgram agent', details: error.message });
  }
});

// Deepgram disconnect endpoint
app.post('/api/deepgram/disconnect', (req, res) => {
  try {
    if (!deepgramConnection) {
      return res.status(400).json({ error: 'No active connection to disconnect' });
    }

    // Clear keep-alive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }

    // Close connection (the on(Close) handler will clean up deepgramConnection)
    // Note: Deepgram SDK doesn't have an explicit close method, connection closes when the event ends
    deepgramConnection = null;

    res.json({
      success: true,
      message: 'Deepgram agent connection disconnected'
    });

  } catch (error) {
    console.error('Error disconnecting from Deepgram agent:', error);
    res.status(500).json({ error: 'Failed to disconnect from Deepgram agent', details: error.message });
  }
});

// Deepgram status endpoint
app.get('/api/deepgram/status', (req, res) => {
  const isConnected = !!deepgramConnection;
  res.json({
    connected: isConnected,
    keepAliveActive: !!keepAliveInterval,
    configuration: isConnected ? {
      stt_model: 'nova-3',
      llm_model: 'gpt-4o-mini',
      tts_model: 'aura-2-thalia-en'
    } : null
  });
});

// ========== End Epic 2 ==========

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Deepgram client ${deepgramClient ? 'initialized' : 'not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
