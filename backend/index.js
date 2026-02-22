import express from 'express';
import dotenv from 'dotenv';
import { createClient, AgentEvents } from '@deepgram/sdk';
import { WebSocketHandler } from './websocket-handler.js';

// Load environment variables
dotenv.config();

// Verify environment variables
const requiredEnvVars = ['DEEPGRAM_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

console.log('Environment loaded successfully');
console.log(`DEEPGRAM_API_KEY: ${process.env.DEEPGRAM_API_KEY ? '✓' : '✗'}`);
console.log(`GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✓' : '✗'}`);

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

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://myvoiceagent-frontend.vercel.app',
    'https://myretell.vercel.app',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.json({
    service: 'MyVoiceAgent Backend',
    status: 'running',
    deepgramConfigured: !!deepgramClient,
    llm: 'Google Gemini 2.0 Flash'
  });
});

// ========== Deepgram Agent Config (Google Gemini as LLM) ==========

const buildAgentConfig = () => ({
  tags: ['myvoiceagent', 'demo'],
  agent: {
    listen: {
      provider: {
        type: 'deepgram',
        model: 'nova-3'
      }
    },
    speak: {
      provider: {
        type: 'deepgram',
        model: 'aura-2-thalia-en'
      }
    },
    think: {
      provider: {
        type: 'google',
        model: 'gemini-2.0-flash',
        temperature: 0.7
      },
      endpoint: {
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        headers: {
          authorization: `Bearer ${process.env.GOOGLE_API_KEY}`
        }
      },
      instructions: 'You are a helpful voice assistant. Be concise and friendly.'
    },
    greeting: 'Hello! How can I help you today?'
  }
});

// Store active connection and keep-alive
let deepgramConnection = null;
let keepAliveInterval = null;

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

app.post('/api/deepgram/connect', async (req, res) => {
  try {
    if (!deepgramClient) {
      return res.status(500).json({ error: 'Deepgram client not initialized' });
    }
    if (deepgramConnection) {
      return res.status(400).json({ error: 'Connection already exists' });
    }

    deepgramConnection = deepgramClient.agent();

    deepgramConnection.on(AgentEvents.Open, () => {
      console.log('Deepgram agent connection opened');
      deepgramConnection.configure(buildAgentConfig());
    });

    deepgramConnection.on(AgentEvents.SettingsApplied, () => {
      console.log('Agent configuration applied successfully');
    });

    deepgramConnection.on(AgentEvents.Welcome, (data) => {
      console.log('Welcome event, request_id:', data.request_id);
    });

    deepgramConnection.on(AgentEvents.ConversationText, (data) => {
      console.log(`[${data.role}]: ${data.content}`);
    });

    deepgramConnection.on(AgentEvents.UserStartedSpeaking, () => {
      console.log('User started speaking...');
    });

    deepgramConnection.on(AgentEvents.AgentThinking, (data) => {
      console.log('Agent thinking:', data.content);
    });

    deepgramConnection.on(AgentEvents.AgentStartedSpeaking, (data) => {
      console.log('Agent started speaking (latency:', data.total_latency, 'ms)');
    });

    deepgramConnection.on(AgentEvents.AgentAudioDone, () => {
      console.log('Agent finished speaking');
    });

    deepgramConnection.on(AgentEvents.Error, (error) => {
      console.error('Deepgram agent error:', error);
    });

    deepgramConnection.on(AgentEvents.Close, () => {
      console.log('Deepgram agent connection closed');
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      deepgramConnection = null;
    });

    keepAliveInterval = setInterval(keepAlive, 5000);

    res.json({
      success: true,
      message: 'Deepgram agent connection initiated',
      configuration: {
        stt_model: 'nova-3',
        llm_model: 'gemini-2.0-flash (Google)',
        tts_model: 'aura-2-thalia-en'
      }
    });
  } catch (error) {
    console.error('Error connecting to Deepgram agent:', error);
    res.status(500).json({ error: 'Failed to connect', details: error.message });
  }
});

app.post('/api/deepgram/disconnect', (req, res) => {
  try {
    if (!deepgramConnection) {
      return res.status(400).json({ error: 'No active connection' });
    }
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    deepgramConnection = null;
    res.json({ success: true, message: 'Disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect', details: error.message });
  }
});

app.get('/api/deepgram/status', (req, res) => {
  res.json({
    connected: !!deepgramConnection,
    keepAliveActive: !!keepAliveInterval,
    llm: 'gemini-2.0-flash'
  });
});

// ========== WebSocket Server ==========

const defaultAgentConfig = buildAgentConfig();

const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`LLM: Google Gemini 2.0 Flash`);
});

let wsHandler = null;
try {
  wsHandler = new WebSocketHandler({
    server: server,
    path: '/ws',
    defaultAgentConfig: defaultAgentConfig
  });
  console.log(`WebSocket handler initialized on /ws`);
} catch (error) {
  console.error('Failed to initialize WebSocket handler:', error.message);
}

process.on('SIGTERM', () => {
  if (wsHandler) wsHandler.close();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  if (wsHandler) wsHandler.close();
  server.close(() => process.exit(0));
});
