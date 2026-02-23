import express from 'express';
import dotenv from 'dotenv';
import { createClient, AgentEvents } from '@deepgram/sdk';
import { WebSocketHandler } from './websocket-handler.js';
import authRoutes from './routes/auth.js';
import stripeRoutes from './routes/stripe.js';
import checkoutRoutes from './routes/checkout.js';
import agentRoutes from './routes/agents.js';

// Load environment variables
dotenv.config();

// Verify environment variables
const requiredEnvVars = ['DEEPGRAM_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  // process.exit(1); // Don't exit in development for easier setup
}

console.log('Environment loaded successfully');

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

// Global CORS Middleware
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

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.use('/api/stripe', stripeRoutes);

// Regular JSON middleware for other routes
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/agents', agentRoutes);

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

const buildAgentConfig = () => ({
  audio: {
    input: { encoding: 'linear16', sample_rate: 16000 },
    output: { encoding: 'linear16', sample_rate: 16000, container: 'none' }
  },
  agent: {
    listen: {
      provider: { type: 'deepgram', model: 'nova-2', language: 'en' }
    },
    think: {
      provider: { type: 'deepgram', model: 'llama-3-70b-instruct' },
      prompt: 'You are a helpful and friendly AI voice assistant. Keep your responses concise and conversational.'
    },
    speak: {
      provider: { type: 'deepgram', model: 'aura-2-thalia-en' }
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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
