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

// CORS
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

app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.json({
    service: 'MyVoiceAgent Backend',
    status: 'running',
    deepgramConfigured: !!deepgramClient,
    llm: 'Deepgram Default'
  });
});

// ========== Deepgram Agent Config ==========

// Update config to match Deepgram Voice Agent V1 schema with provider wrappers
const buildAgentConfig = () => ({
  audio: {
    input: {
      encoding: 'linear16',
      sample_rate: 16000
    },
    output: {
      encoding: 'linear16',
      sample_rate: 16000,
      container: 'none'
    }
  },
  agent: {
    listen: {
      provider: {
        type: 'deepgram',
        model: 'nova-3'
      }
    },
    think: {
      provider: {
        type: 'open_ai',
        model: 'gpt-4o-mini'
      },
      prompt: 'You are a helpful and friendly AI voice assistant. Keep your responses concise and conversational.'
    },
    speak: {
      provider: {
        type: 'deepgram',
        model: 'aura-2-thalia-en'
      }
    }
  }
});

let deepgramConnection = null;
let keepAliveInterval = null;

function keepAlive() {
  if (deepgramConnection) {
    try {
      deepgramConnection.keepAlive();
    } catch (error) {
      console.error('Keep-alive error:', error.message);
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

    // SDK v3.7.x: client.agent() returns an AgentLiveClient
    deepgramConnection = deepgramClient.agent();

    deepgramConnection.on(AgentEvents.Open, () => {
      console.log('Deepgram connection opened');
      // Configure AFTER connection is open
      deepgramConnection.configure(buildAgentConfig());
    });

    deepgramConnection.on(AgentEvents.SettingsApplied, () => {
      console.log('Settings applied');
    });

    deepgramConnection.on(AgentEvents.Welcome, (data) => {
      console.log('Welcome:', data.request_id);
    });

    deepgramConnection.on(AgentEvents.ConversationText, (data) => {
      console.log(`[${data.role}]: ${data.content}`);
    });

    deepgramConnection.on(AgentEvents.UserStartedSpeaking, () => {
      console.log('User speaking...');
    });

    deepgramConnection.on(AgentEvents.AgentThinking, (data) => {
      console.log('Agent thinking:', data.content);
    });

    deepgramConnection.on(AgentEvents.AgentStartedSpeaking, (data) => {
      console.log('Agent speaking (latency:', data.total_latency, 'ms)');
    });

    deepgramConnection.on(AgentEvents.AgentAudioDone, () => {
      console.log('Agent done speaking');
    });

    deepgramConnection.on(AgentEvents.Error, (error) => {
      console.error('Deepgram error:', error);
    });

    deepgramConnection.on(AgentEvents.Close, () => {
      console.log('Connection closed');
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      deepgramConnection = null;
    });

    keepAliveInterval = setInterval(keepAlive, 5000);

    // Initiate the WebSocket connection AFTER all handlers are registered
    deepgramConnection.setupConnection();

    res.json({
      success: true,
      message: 'Deepgram agent initiated',
      configuration: {
        stt: 'nova-3',
        llm: 'deepgram-default',
        tts: 'aura-2-thalia-en'
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
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
    keepAliveActive: !!keepAliveInterval
  });
});

// ========== WebSocket ==========

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LLM: Deepgram Default`);
});

let wsHandler = null;
try {
  wsHandler = new WebSocketHandler({
    server: server,
    path: '/ws',
    defaultAgentConfig: buildAgentConfig()
  });
  console.log(`WebSocket ready on /ws`);
} catch (error) {
  console.error('WebSocket init failed:', error.message);
}

process.on('SIGTERM', () => {
  if (wsHandler) wsHandler.close();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  if (wsHandler) wsHandler.close();
  server.close(() => process.exit(0));
});
