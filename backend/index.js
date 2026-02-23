import express from 'express';
import dotenv from 'dotenv';
import { createClient, AgentEvents } from '@deepgram/sdk';
import { WebSocketHandler } from './websocket-handler.js';
import authRoutes from './routes/auth.js';
import stripeRoutes from './routes/stripe.js';
import checkoutRoutes from './routes/checkout.js';
import agentRoutes from './routes/agents.js';
import telephonyRoutes from './routes/telephony.js';
import { TwilioHandler, handleTwilioIncoming } from './twilio-handler.js';

// Load environment variables
dotenv.config();

// Validate and alias database URL
if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  console.log('Aliasing POSTGRES_URL to DATABASE_URL for Prisma compatibility');
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

// Verify critical environment variables
const criticalVars = ['DEEPGRAM_API_KEY', 'JWT_SECRET', 'DATABASE_URL'];
criticalVars.forEach(v => {
  if (!process.env[v]) {
    console.error(`[CRITICAL] Missing environment variable: ${v}`);
  } else {
    // Only log first/last chars for security
    const val = process.env[v];
    console.log(`[ENV] ${v} is set (Length: ${val.length}, starts with: ${val.substring(0, 3)}...)`);
  }
});

console.log('Environment validation complete');

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
app.use('/api/telephony', telephonyRoutes);

// Twilio Incoming Call Webhook (Retell-style)
app.post('/api/twilio/incoming', handleTwilioIncoming);

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
      model: 'nova-2',
      language: 'en',
      provider: { type: 'deepgram' }
    },
    think: {
      provider: { type: 'deepgram' },
      model: 'llama-3-70b-instruct',
      instructions: 'You are a helpful and friendly AI voice assistant. Keep your responses concise and conversational.'
    },
    speak: {
      model: 'aura-2-thalia-en',
      provider: { type: 'deepgram' }
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

let wsHandler = null;
let twilioHandler = null;

try {
  wsHandler = new WebSocketHandler({
    server: server,
    path: '/ws',
    defaultAgentConfig: buildAgentConfig()
  });
  console.log('WebSocket ready on /ws');
} catch (error) {
  console.error('WebSocket init failed:', error.message);
}

try {
  // Twilio Telephony WebSocket should not block /ws initialization
  twilioHandler = new TwilioHandler(server);
  console.log('Twilio Media Stream ready on /tw-media-stream');
} catch (error) {
  console.error('Twilio init failed:', error.message);
}

const gracefulShutdown = () => {
  if (wsHandler) wsHandler.close();
  if (twilioHandler) twilioHandler.close();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
