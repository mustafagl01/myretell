// Deployment trigger: 2026-02-23 14:15
console.log('--- [BUILD_VER: 2026-02-23_14-15] ---');
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

// Log buffer for remote debugging
const logBuffer = [];
const originalLog = console.log;
const originalError = console.error;

const addLog = (type, args) => {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  logBuffer.push(`[${new Date().toISOString()}] [${type}] ${msg}`);
  if (logBuffer.length > 100) logBuffer.shift();
};

console.log = (...args) => {
  addLog('LOG', args);
  originalLog.apply(console, args);
};

console.error = (...args) => {
  addLog('ERROR', args);
  originalError.apply(console, args);
};

console.log('Environment validation complete');

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/logs', (req, res) => {
  res.send(`
    <html>
      <body style="background:#1a1a1a;color:#00ff00;font-family:monospace;padding:20px;">
        <h3>🚀 Backend Live Logs (Last 100 lines)</h3>
        <pre style="white-space:pre-wrap;">${logBuffer.join('\n')}</pre>
        <script>setTimeout(() => location.reload(), 3000);</script>
      </body>
    </html>
  `);
});

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health-test', async (req, res) => {
  const diagnostics = {
    database: 'unknown',
    deepgram: 'unknown',
    env: {
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ? 'Present' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'MISSING'
    }
  };

  try {
    const { default: prisma } = await import('./config/prisma.js');
    const userCount = await prisma.user.count();
    diagnostics.database = `Connected (Users: ${userCount})`;
  } catch (err) {
    diagnostics.database = `Error: ${err.message}`;
  }

  try {
    const dg = createClient(process.env.DEEPGRAM_API_KEY);
    const { result, error } = await dg.manage.getProjects();
    if (error) {
      diagnostics.deepgram = `Invalid Key/Error: ${error.message}`;
    } else {
      diagnostics.deepgram = `Connected (Projects: ${result?.projects?.length || 0})`;
    }
  } catch (err) {
    diagnostics.deepgram = `SDK Error: ${err.message}`;
  }

  res.json(diagnostics);
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
  // Initialize handlers WITHOUT passing 'server' to auto-attach
  wsHandler = new WebSocketHandler({
    path: '/ws',
    defaultAgentConfig: buildAgentConfig()
  });
  console.log('WebSocketHandler initialized');

  twilioHandler = new TwilioHandler();
  console.log('TwilioHandler initialized');

  // CENTRALIZED UPGRADE HANDLER
  server.on('upgrade', (request, socket, head) => {
    try {
      const timestamp = new Date().toISOString();
      const pathname = request.url.split('?')[0];

      console.log(`[${timestamp}] [UPGRADE] Incoming request for: ${pathname}`);

      if (pathname === '/ws') {
        if (!wsHandler) {
          console.error(`[${timestamp}] [UPGRADE] WebSocketHandler not initialized yet!`);
          socket.destroy();
          return;
        }
        console.log(`[${timestamp}] [UPGRADE] Routing /ws to WebSocketHandler`);
        wsHandler.wss.handleUpgrade(request, socket, head, (ws) => {
          wsHandler.wss.emit('connection', ws, request);
        });
      } else if (pathname === '/tw-media-stream') {
        if (!twilioHandler) {
          console.error(`[${timestamp}] [UPGRADE] TwilioHandler not initialized yet!`);
          socket.destroy();
          return;
        }
        console.log(`[${timestamp}] [UPGRADE] Routing /tw-media-stream to TwilioHandler`);
        twilioHandler.wss.handleUpgrade(request, socket, head, (ws) => {
          twilioHandler.wss.emit('connection', ws, request);
        });
      } else {
        console.warn(`[${timestamp}] [UPGRADE] No handler for: ${pathname}. Closing socket.`);
        socket.destroy();
      }
    } catch (err) {
      console.error(`[UPGRADE CRITICAL ERROR] ${err.message}`);
      socket.destroy();
    }
  });

} catch (error) {
  console.error('Handler initialization failed:', error.message);
}

const gracefulShutdown = () => {
  if (wsHandler) wsHandler.close();
  if (twilioHandler) twilioHandler.close();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
