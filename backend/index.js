import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';
import { WebSocketHandler } from './websocket-handler.js';

// Load environment variables
dotenv.config();

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

// Agent configuration with function calling tools
const agentConfig = {
  agent: {
    think: {
      model: 'gpt-4o-mini',
      tools: [
        {
          name: 'get_time',
          description: 'Get the current time in a specific timezone or local time',
          parameters: {
            type: 'object',
            properties: {
              timezone: {
                type: 'string',
                description: 'IANA timezone name (e.g., "America/New_York", "UTC"). If not provided, returns local time.'
              }
            },
            required: []
          }
        },
        {
          name: 'get_weather',
          description: 'Get current weather information for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name or location (e.g., "San Francisco, CA")'
              },
              units: {
                type: 'string',
                description: 'Temperature units: "celsius" or "fahrenheit"',
                enum: ['celsius', 'fahrenheit']
              }
            },
            required: ['location']
          }
        }
      ]
    },
    speak: {
      model: 'aura-2-thalia-en'
    }
  }
};

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'MyVoiceAgent Backend',
    status: 'running',
    deepgramConfigured: !!deepgramClient,
    toolsConfigured: agentConfig.agent.think.tools.length
  });
});

// Start server and initialize WebSocket handler
const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Deepgram client ${deepgramClient ? 'initialized' : 'not configured'}`);
  console.log(`Agent configured with ${agentConfig.agent.think.tools.length} tools:`);
  agentConfig.agent.think.tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
});

// Initialize WebSocket handler with agent configuration
let wsHandler = null;
try {
  wsHandler = new WebSocketHandler({
    server: server,
    path: '/ws',
    defaultAgentConfig: agentConfig
  });
  console.log('WebSocket handler initialized on ws://localhost:' + PORT + '/ws');
} catch (error) {
  console.error('Failed to initialize WebSocket handler:', error.message);
}

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);

  // Close WebSocket handler
  if (wsHandler) {
    wsHandler.close();
    console.log('WebSocket handler closed');
  }

  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced exit after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
