import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';

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

// Start server
const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Deepgram client ${deepgramClient ? 'initialized' : 'not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
