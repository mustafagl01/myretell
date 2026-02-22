import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import prisma from './config/prisma.js';
import { DeepgramConnection } from './deepgram-connection.js';

/**
 * WebSocketHandler manages WebSocket connections for audio relay.
 * Now supports per-agent dynamic configuration.
 */
export class WebSocketHandler {
  constructor(options = {}) {
    const { server, path = '/ws', defaultAgentConfig = null } = options;

    if (!server) {
      throw new Error('HTTP server is required for WebSocket attachment');
    }

    this.server = server;
    this.path = path;
    this.wss = null;
    this.deepgramConnections = new Map();
    this.audioQueues = new Map();
    this.connectionReady = new Map();
    this.defaultAgentConfig = defaultAgentConfig;

    this._initialize();
  }

  _initialize() {
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.path,
    });

    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error.message);
    });
  }

  _handleConnection(ws, req) {
    const clientIp = req.socket.remoteAddress;

    // Extract agentId from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const agentId = url.searchParams.get('agentId');

    console.log(`WebSocket client connected: ${clientIp}, agentId: ${agentId || 'default'}`);

    // Store agentId on ws
    ws.agentId = agentId;

    this.audioQueues.set(ws, []);
    this.connectionReady.set(ws, false);

    // Don't create Deepgram connection yet - wait for authentication
    ws.on('message', (data, isBinary) => {
      this._handleClientMessage(ws, data, isBinary);
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${clientIp} (code: ${code})`);
      this._handleClientDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket client error: ${clientIp}:`, error.message);
      this._handleClientDisconnect(ws);
    });
  }

  /**
   * Build Deepgram agent config from a database Agent record.
   */
  _buildAgentConfigFromAgent(agent, user = null) {
    // LLM Provider Logic
    let thinkProvider = null;
    const model = agent.llmModel || 'gemini-2.0-flash';

    if (model.includes('gemini') || model.includes('google')) {
      // Map to actual Gemini API model names
      let geminiModel = 'gemini-2.0-flash';
      if (model.includes('3.0')) geminiModel = 'gemini-3.0-flash';
      else if (model === 'gemini-2.5-pro') geminiModel = 'gemini-2.5-pro';
      else if (model.includes('2.5') && model.includes('flash')) geminiModel = 'gemini-2.5-flash';
      else if (model.includes('2.0')) geminiModel = 'gemini-2.0-flash';

      thinkProvider = {
        type: 'google',
        model: geminiModel,
        ...(user?.googleApiKey && { api_key: user.googleApiKey })
      };
    } else if (model.includes('claude') || model.includes('anthropic')) {
      // Map to actual Anthropic API model names
      let claudeModel = 'claude-3-5-sonnet-20240620';
      if (model.includes('4.6')) claudeModel = 'claude-sonnet-4-6-20260101';
      else if (model.includes('4.5')) claudeModel = 'claude-sonnet-4-5-20260101';
      else if (model.includes('haiku-4')) claudeModel = 'claude-haiku-4-20260101';
      else if (model.includes('3-5-sonnet') || model.includes('3.5')) claudeModel = 'claude-3-5-sonnet-20240620';

      thinkProvider = {
        type: 'anthropic',
        model: claudeModel,
        ...(user?.anthropicApiKey && { api_key: user.anthropicApiKey })
      };
    } else if (model.includes('gpt') || model.includes('open_ai')) {
      // Map to actual OpenAI API model names
      let openaiModel = model;
      if (model === 'gpt-5.2') openaiModel = 'gpt-5.2';
      else if (model === 'gpt-5.1') openaiModel = 'gpt-5.1';
      else if (model === 'gpt-4.1') openaiModel = 'gpt-4.1';
      else if (model === 'gpt-4o-mini') openaiModel = 'gpt-4o-mini';
      else if (model === 'gpt-4o') openaiModel = 'gpt-4o';

      thinkProvider = {
        type: 'open_ai',
        model: openaiModel,
        ...(user?.openaiApiKey && { api_key: user.openaiApiKey })
      };
    } else if (model.includes('groq') || model.includes('llama')) {
      // Map to actual Groq API model names
      let groqModel = model;
      if (model.includes('4-scout')) groqModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
      else if (model.includes('3.3-70b')) groqModel = 'llama-3.3-70b-versatile';
      else if (model.includes('3.1-70b')) groqModel = 'llama-3.1-70b-versatile';

      thinkProvider = {
        type: 'groq',
        model: groqModel,
        ...(user?.groqApiKey && { api_key: user.groqApiKey })
      };
    }

    // TTS Provider Logic
    let speakProvider;

    if (agent.ttsModel === 'deepgram') {
      // Explicitly requested Deepgram
      speakProvider = {
        type: 'deepgram',
        model: (agent.voice && agent.voice.startsWith('aura')) ? agent.voice : 'aura-2-thalia-en'
      };
    } else if (agent.voice && agent.voice.length > 15 && !agent.voice.startsWith('aura')) {
      // It's an ElevenLabs voice ID (lengthy hash)
      const elModel = (agent.ttsModel === 'eleven_turbo_v3') ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2';

      speakProvider = {
        type: 'eleven_labs',
        voice_id: agent.voice,
        model_id: elModel,
        ...(user?.elevenlabsApiKey && { api_key: user.elevenlabsApiKey })
      };
    } else {
      // Ultimate Fallback to Deepgram Aura
      speakProvider = {
        type: 'deepgram',
        model: (agent.voice && agent.voice.startsWith('aura')) ? agent.voice : 'aura-2-thalia-en'
      };
    }

    // STT Provider Logic
    let listenProvider;
    if (agent.sttModel === 'whisper-1') {
      listenProvider = {
        type: 'open_ai',
        model: 'whisper-1',
        ...(user?.openaiApiKey && { api_key: user.openaiApiKey })
      };
    } else {
      // Default to Deepgram for everything else (fallback for nova-3, azure-speech, assembly-ai)
      listenProvider = {
        type: 'deepgram',
        model: 'nova-3',
        ...(agent.language && { language: agent.language })
      };
    }

    return {
      audio: {
        input: { encoding: 'linear16', sample_rate: 16000 },
        output: { encoding: 'linear16', sample_rate: 16000, container: 'none' }
      },
      agent: {
        listen: { provider: listenProvider },
        think: {
          ...(thinkProvider ? { provider: thinkProvider } : {}),
          prompt: agent.systemPrompt,
          ...(agent.greeting && { greeting: agent.greeting }),
        },
        speak: { provider: speakProvider }
      }
    };
  }

  /**
   * Start Deepgram connection with the given config.
   */
  _startDeepgramConnection(ws, config) {
    let deepgramConn = null;

    try {
      deepgramConn = new DeepgramConnection({
        onAudio: (audioData) => this._onDeepgramAudio(ws, audioData),
        onOpen: () => this._onDeepgramOpen(ws),
        onClose: (event) => this._onDeepgramClose(ws, event),
        onError: (error) => this._onDeepgramError(ws, error),
        onMessage: (message) => this._onDeepgramMessage(ws, message),
      });

      this.deepgramConnections.set(ws, deepgramConn);

      console.log('[DEBUG] Full Deepgram config being sent:', JSON.stringify(config, null, 2));
      deepgramConn.connect(config).then(() => {
        console.log('[DEBUG] Deepgram connection ready, flushing audio queue');
        this.connectionReady.set(ws, true);
        this._flushAudioQueue(ws);
      }).catch((error) => {
        console.error('Failed to connect to Deepgram:', error.message);
        this._sendError(ws, {
          type: 'connection_failed',
          message: 'Failed to connect to Deepgram service: ' + error.message,
        });
        ws.close();
      });
    } catch (error) {
      console.error('Error creating Deepgram connection:', error.message);
      this._sendError(ws, {
        type: 'initialization_error',
        message: error.message,
      });
    }
  }

  async _handleClientMessage(ws, data, isBinary) {
    const deepgramConn = this.deepgramConnections.get(ws);

    try {
      if (isBinary) {
        if (!deepgramConn) {
          // Queue audio until connected
          const queue = this.audioQueues.get(ws);
          if (queue) {
            queue.push(data);
            if (queue.length > 100) queue.shift();
          }
          return;
        }

        const isReady = this.connectionReady.get(ws);

        if (isReady) {
          deepgramConn.sendAudio(data);
        } else {
          const queue = this.audioQueues.get(ws);
          if (queue) {
            queue.push(data);
            if (queue.length > 100) queue.shift();
          }
        }
      } else {
        const message = JSON.parse(data.toString());
        await this._handleJsonMessage(ws, message, deepgramConn);
      }
    } catch (error) {
      console.error('Error handling client message:', error.message);
      this._sendError(ws, {
        type: 'message_error',
        message: error.message,
      });
    }
  }

  _flushAudioQueue(ws) {
    const deepgramConn = this.deepgramConnections.get(ws);
    const queue = this.audioQueues.get(ws);

    if (!deepgramConn || !queue || queue.length === 0) return;

    console.log(`Flushing ${queue.length} queued audio chunks`);

    while (queue.length > 0) {
      const audioData = queue.shift();
      try {
        deepgramConn.sendAudio(audioData);
      } catch (error) {
        console.error('Error flushing audio queue:', error.message);
        break;
      }
    }
  }

  async _handleJsonMessage(ws, message, deepgramConn) {
    const { type, data } = message;

    switch (type) {
      case 'Authenticate':
        await this._handleAuthentication(ws, data);
        break;

      case 'Configure':
        if (data && deepgramConn?.connected) {
          deepgramConn.configure(data);
        }
        break;

      case 'KeepAlive':
        if (deepgramConn) deepgramConn.keepAlive();
        break;

      case 'Ping':
        this._sendJson(ws, { type: 'Pong', data: null });
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  async _handleAuthentication(ws, data) {
    const { token } = data;
    if (!token) {
      this._sendError(ws, { type: 'auth_error', message: 'Token required' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { creditBalance: true }
      });

      if (!user) throw new Error('User not found');

      if (!user.creditBalance || Number(user.creditBalance.balance) <= 0) {
        this._sendError(ws, { type: 'insufficient_credits', message: 'Please refill your credits' });
        ws.close();
        return;
      }

      // Store user info and start time
      ws.user = user;
      ws.sessionStartTime = Date.now();

      // Determine agent config
      let agentConfig = this.defaultAgentConfig;

      if (ws.agentId) {
        const agent = await prisma.agent.findFirst({
          where: { id: ws.agentId, userId: user.id }
        });

        if (agent) {
          agentConfig = this._buildAgentConfigFromAgent(agent, user);
          ws.agentRecord = agent;
          console.log(`Using agent config: "${agent.name}" for user ${user.email}`);
        } else {
          console.warn(`Agent ${ws.agentId} not found for user ${user.id}, using default config`);
        }
      }

      // NOW start Deepgram connection with the right config
      this._startDeepgramConnection(ws, agentConfig);

      this._sendJson(ws, {
        type: 'Authenticated',
        data: {
          email: user.email,
          balance: user.creditBalance.balance,
          agentName: ws.agentRecord?.name || 'Default'
        }
      });
      console.log(`User ${user.email} authenticated on WebSocket`);

    } catch (error) {
      console.error('WebSocket Auth Error:', error.message);
      this._sendError(ws, { type: 'auth_error', message: 'Invalid token' });
    }
  }

  _onDeepgramAudio(ws, audioData) {
    try {
      const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
      console.log(`[DEBUG] Deepgram audio received: ${buffer.length} bytes`);
      const base64Audio = buffer.toString('base64');

      this._sendJson(ws, {
        type: 'Audio',
        data: base64Audio,
      });
    } catch (error) {
      console.error('[DEBUG] Error forwarding Deepgram audio:', error.message);
    }
  }

  _onDeepgramOpen(ws) {
    console.log('Deepgram connection established');
    this._sendJson(ws, {
      type: 'Connected',
      data: {
        message: 'Deepgram connection established',
        status: 'ready',
      },
    });
  }

  _onDeepgramClose(ws, event) {
    console.log('Deepgram connection closed:', event.code, event.reason);
    this.connectionReady.set(ws, false);
    this._sendJson(ws, {
      type: 'Disconnected',
      data: {
        code: event.code,
        reason: event.reason || 'Connection closed',
      },
    });
  }

  _onDeepgramError(ws, error) {
    console.error('[DEBUG] Deepgram error:', JSON.stringify(error));
    this._sendError(ws, error);
  }

  _onDeepgramMessage(ws, message) {
    console.log('[DEBUG] Deepgram message:', JSON.stringify(message).substring(0, 200));
    this._sendJson(ws, message);
  }

  async _handleClientDisconnect(ws) {
    const deepgramConn = this.deepgramConnections.get(ws);

    if (deepgramConn) {
      deepgramConn.disconnect();
      this.deepgramConnections.delete(ws);
    }

    // SaaS: Track session duration and deduct dollar cost
    if (ws.user && ws.sessionStartTime) {
      const endTime = Date.now();
      const durationSeconds = Math.ceil((endTime - ws.sessionStartTime) / 1000);
      const durationMinutes = durationSeconds / 60;

      // Cost calculation: $0.20 per minute (pro-rated to the second)
      const COST_PER_MINUTE = 0.20;
      const costAmount = durationMinutes * COST_PER_MINUTE;
      const costRounded = Math.round(costAmount * 100) / 100; // Round to 2 decimals

      console.log(`Session ended for ${ws.user.email}: ${durationSeconds}s = ${durationMinutes.toFixed(2)}min = $${costRounded}`);

      try {
        await prisma.$transaction([
          prisma.creditBalance.update({
            where: { userId: ws.user.id },
            data: { balance: { decrement: costRounded } }
          }),
          prisma.usageSession.create({
            data: {
              userId: ws.user.id,
              agentId: ws.agentRecord?.id || null,
              startTime: new Date(ws.sessionStartTime),
              endTime: new Date(endTime),
              durationSeconds,
              costAmount: costRounded,
              creditsUsed: Math.ceil(durationMinutes), // backward compat
              status: 'completed'
            }
          })
        ]);
      } catch (error) {
        console.error('Failed to deduct cost on disconnect:', error.message);
      }
    }

    this.audioQueues.delete(ws);
    this.connectionReady.delete(ws);

    if (ws.readyState === 1) ws.close();
  }

  _sendJson(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending JSON to client:', error.message);
      }
    }
  }

  _sendError(ws, error) {
    this._sendJson(ws, {
      type: 'Error',
      data: error,
    });
  }

  close() {
    for (const [ws, deepgramConn] of this.deepgramConnections) {
      try {
        deepgramConn.disconnect();
        ws.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.deepgramConnections.clear();
    this.audioQueues.clear();
    this.connectionReady.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  get connectionCount() {
    return this.deepgramConnections.size;
  }
}

export default WebSocketHandler;
