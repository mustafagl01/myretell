import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import prisma from './config/prisma.js';
import { DeepgramConnection } from './deepgram-connection.js';
import { WorkflowExecutor } from './workflow-executor.js';
import fs from 'fs';
import path from 'path';

const debugLog = (msg) => {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync('debug_ws.log', logMsg);
};

/**
 * WebSocketHandler manages WebSocket connections for audio relay.
 * Now supports per-agent dynamic configuration.
 */
export class WebSocketHandler {
  constructor(options = {}) {
    const { path = '/ws', defaultAgentConfig = null } = options;

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
      noServer: true
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
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [WS] Connection attempt from IP: ${clientIp}`);
    console.log(`[${timestamp}] [WS] URL: ${req.url}`);

    // Extract agentId from query params
    const url = new URL(req.url, 'http://localhost');
    const agentId = url.searchParams.get('agentId');

    console.log(`[${timestamp}] [WS] Handler started. IP: ${clientIp}, AgentId: ${agentId || 'none'}`);

    // Store agentId on ws
    ws.agentId = agentId;
    ws.connectTime = Date.now();

    this.audioQueues.set(ws, []);
    this.connectionReady.set(ws, false);

    // Don't create Deepgram connection yet - wait for authentication
    ws.on('message', (data, isBinary) => {
      console.log(`[${new Date().toISOString()}] [WS] === MESSAGE FIRED === isBinary: ${isBinary}, length: ${data?.length || 0}`);
      try {
        this._handleClientMessage(ws, data, isBinary);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [WS] MESSAGE HANDLER CRASH:`, err.message, err.stack);
      }
    });

    ws.on('close', (code, reason) => {
      const duration = ws.connectTime ? `${(Date.now() - ws.connectTime) / 1000}s` : 'unknown';
      console.log(`[${new Date().toISOString()}] [WS] Client disconnected. IP: ${clientIp}, Code: ${code}, Duration: ${duration}`);
      console.log(`[${new Date().toISOString()}] [WS] Disconnect reason: ${reason || 'none'}`);
      this._handleClientDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] [WS] Client error. IP: ${clientIp}:`, error.message);
      this._handleClientDisconnect(ws);
    });

    console.log(`[${timestamp}] [WS] Event handlers registered. Waiting for Authenticate message...`);
  }

  /**
   * Build Deepgram agent config from a database Agent record.
   */
  _buildAgentConfigFromAgent(agent, user = null) {
    // LLM Provider Logic - Default to Deepgram Native
    let thinkProvider = {
      type: 'deepgram',
      model: 'llama-3-70b-instruct'
    };

    const model = (agent.llmModel || '').toLowerCase() || 'llama-3-70b-instruct';

    if (model.includes('gemini') || model.includes('google')) {
      // Map to actual Gemini API model names
      let geminiModel = 'gemini-2.0-flash';
      if (model.includes('3.0')) geminiModel = 'gemini-3.0-flash';
      else if (model === 'gemini-2.5-pro') geminiModel = 'gemini-2.5-pro';
      else if (model.includes('2.5') && model.includes('flash')) geminiModel = 'gemini-2.5-flash';
      else if (model.includes('2.0')) geminiModel = 'gemini-2.0-flash';

      if (user?.googleApiKey) {
        thinkProvider = {
          type: 'google',
          model: geminiModel,
          api_key: user.googleApiKey
        };
      }
    } else if (model.includes('claude') || model.includes('anthropic')) {
      // Map to actual Anthropic API model names
      let claudeModel = 'claude-3-5-sonnet-20240620';
      if (model.includes('4.6')) claudeModel = 'claude-sonnet-4-6-20260101';
      else if (model.includes('4.5')) claudeModel = 'claude-sonnet-4-5-20260101';
      else if (model.includes('haiku-4')) claudeModel = 'claude-haiku-4-20260101';
      else if (model.includes('3-5-sonnet') || model.includes('3.5')) claudeModel = 'claude-3-5-sonnet-20240620';

      if (user?.anthropicApiKey) {
        thinkProvider = {
          type: 'anthropic',
          model: claudeModel,
          api_key: user.anthropicApiKey
        };
      }
    } else if (model.includes('gpt') || model.includes('open_ai')) {
      // Map to actual OpenAI API model names
      let openaiModel = model;
      if (model === 'gpt-5.2') openaiModel = 'gpt-5.2';
      else if (model === 'gpt-5.1') openaiModel = 'gpt-5.1';
      else if (model === 'gpt-4.1') openaiModel = 'gpt-4.1';
      else if (model === 'gpt-4o-mini') openaiModel = 'gpt-4o-mini';
      else if (model === 'gpt-4o') openaiModel = 'gpt-4o';

      if (user?.openaiApiKey) {
        thinkProvider = {
          type: 'open_ai',
          model: openaiModel,
          api_key: user.openaiApiKey
        };
      }
    } else if (model.includes('groq') || model.includes('llama')) {
      if (user?.groqApiKey) {
        // Map to actual Groq API model names
        let groqModel = model;
        if (model.includes('4-scout')) groqModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
        else if (model.includes('3.3-70b')) groqModel = 'llama-3.3-70b-versatile';
        else if (model.includes('3.1-70b')) groqModel = 'llama-3.1-70b-versatile';

        thinkProvider = {
          type: 'groq',
          model: groqModel,
          api_key: user.groqApiKey
        };
      }
    }

    // --- TTS Provider Logic ---
    let speakProvider;
    const voiceId = agent.voice || '';
    let speakModel = voiceId.startsWith('aura') ? voiceId : 'aura-2-thalia-en';

    if (agent.ttsModel === 'deepgram') {
      speakProvider = { type: 'deepgram' };
    } else if (voiceId && voiceId.length > 15 && !voiceId.startsWith('aura')) {
      const elModel = (agent.ttsModel === 'eleven_multilingual_v2') ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5';
      speakProvider = {
        type: 'eleven_labs',
        voice_id: agent.voice,
        model_id: elModel,
        ...(user?.elevenlabsApiKey && { api_key: user.elevenlabsApiKey })
      };

      // Validation for TwelveLabs/ElevenLabs keys
      if (!speakProvider.api_key) {
        console.warn(`⚠️ [Config] ElevenLabs selected but no API key. Falling back to Deepgram TTS.`);
        speakProvider = { type: 'deepgram' };
        speakModel = 'aura-2-thalia-en';
      } else {
        speakModel = null; // ElevenLabs uses voice_id/model_id inside provider
      }
    } else {
      speakProvider = { type: 'deepgram' };
    }

    // --- STT Provider Logic ---
    const listenConfig = {
      model: agent.sttModel || 'nova-2',
      language: agent.language || 'en',
      provider: {
        type: 'deepgram'
      }
    };

    // --- Format Speak Provider ---
    const finalSpeakConfig = {
      model: speakModel || 'aura-2-thalia-en',
      provider: {
        type: speakProvider.type || 'deepgram'
      }
    };

    if (speakProvider.type === 'eleven_labs') {
      finalSpeakConfig.provider.voice_id = speakProvider.voice_id;
      finalSpeakConfig.provider.model_id = speakProvider.model_id;
      if (speakProvider.api_key) finalSpeakConfig.provider.api_key = speakProvider.api_key;
    }

    // --- Format Think Provider ---
    const finalThinkConfig = {
      model: thinkProvider.model || 'llama-3-70b-instruct',
      instructions: agent.systemPrompt || 'You are a helpful and friendly AI voice assistant.',
      provider: {
        type: thinkProvider.type || 'deepgram',
        ...(thinkProvider.api_key && { api_key: thinkProvider.api_key })
      }
    };

    return {
      audio: {
        input: { encoding: 'linear16', sample_rate: 16000 },
        output: { encoding: 'linear16', sample_rate: 16000, container: 'none' }
      },
      agent: {
        language: agent.language || 'en', // MOVED to root agent level per official guidance
        listen: {
          model: agent.sttModel || 'nova-2',
          provider: {
            type: 'deepgram'
          }
        },
        think: finalThinkConfig,
        speak: finalSpeakConfig,
        ...(agent.greeting && { greeting: agent.greeting })
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

      const agentName = ws.agentRecord?.name || 'Default';
      const llmModel = config?.agent?.think?.model || 'unknown';
      const sttModel = config?.agent?.listen?.model || 'unknown';
      const ttsModel = config?.agent?.speak?.model || config?.agent?.speak?.provider?.type || 'unknown';
      debugLog(`Agent Name: ${agentName}, LLM: ${llmModel}, STT: ${sttModel}, TTS: ${ttsModel}`);
      debugLog('Full Deepgram config: ' + JSON.stringify(config, null, 2));
      console.log(`[DEBUG] Agent Name: ${agentName}, LLM: ${llmModel}, STT: ${sttModel}, TTS: ${ttsModel}`);
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
        ws.close(1011, ('DG Error: ' + error.message).substring(0, 120));
      });
    } catch (error) {
      console.error('Error creating Deepgram connection:', error.message);
      this._sendError(ws, {
        type: 'initialization_error',
        message: error.message,
      });
      ws.close(1011, 'Initialization error: ' + error.message);
    }
  }

  async _handleClientMessage(ws, data, isBinary) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [WS MESSAGE] === ENTRY === isBinary: ${isBinary}, length: ${data?.length || 0}`);

    const deepgramConn = this.deepgramConnections.get(ws);

    try {
      if (isBinary) {
        console.log(`[WS AUDIO] Receiving binary data (${data.length} bytes)`);
        if (!deepgramConn) {
          console.log(`[WS AUDIO] Deepgram connection not ready, queuing chunk. Queue size: ${this.audioQueues.get(ws)?.length || 0}`);
          // Queue audio until connected
          const queue = this.audioQueues.get(ws);
          if (queue) {
            queue.push(data);
            if (queue.length > 200) {
              console.warn('[WS AUDIO] Queue overflow, dropping oldest chunk');
              queue.shift();
            }
          }
          return;
        }

        const isReady = this.connectionReady.get(ws);
        if (isReady) {
          deepgramConn.sendAudio(data);
        } else {
          console.log('[WS AUDIO] Connection not ready status, queuing chunk');
          const queue = this.audioQueues.get(ws);
          if (queue) {
            queue.push(data);
            if (queue.length > 200) queue.shift();
          }
        }
      } else {
        const textData = data.toString();
        console.log(`[WS JSON] Raw text received: ${textData.substring(0, 200)}${textData.length > 200 ? '...' : ''}`);

        let message;
        try {
          message = JSON.parse(textData);
        } catch (parseErr) {
          console.error('[WS JSON] Parse failed:', parseErr.message);
          this._sendError(ws, { type: 'invalid_json', message: 'Invalid JSON format' });
          return;
        }

        console.log(`[WS JSON] Parsed type: ${message.type}`);
        await this._handleJsonMessage(ws, message, deepgramConn);
      }
    } catch (error) {
      console.error('[WS CRITICAL] Error in _handleClientMessage:', error.message);
      console.error(error.stack);
      this._sendError(ws, {
        type: 'internal_error',
        message: 'Internal server error processing message'
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
    console.log(`[WS JSON] Handling message type: ${type}`);

    switch (type) {
      case 'Authenticate':
        console.log('[WS AUTH] Processing Authentication request...');
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
    console.log('[WS AUTH] Token received? ' + (token ? 'Yes (length: ' + token.length + ')' : 'No'));

    if (!token) {
      console.error('[WS AUTH] Missing token in Authenticate message');
      this._sendError(ws, { type: 'auth_error', message: 'Token required' });
      return;
    }

    try {
      console.log('[WS AUTH] Verifying JWT...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[WS AUTH] JWT Verified. User ID:', decoded.userId);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { creditBalance: true }
      });

      if (!user) {
        console.error('[WS AUTH] User not found in database for ID:', decoded.userId);
        throw new Error('User not found');
      }

      console.log('[WS AUTH] User found:', user.email);

      if (!user.creditBalance) {
        console.error('[WS AUTH] User has no CreditBalance record!');
        this._sendError(ws, { type: 'insufficient_credits', message: 'No credit record found' });
        ws.close(1008, 'Credit record missing');
        return;
      }

      const balance = Number(user.creditBalance.balance);
      console.log('[WS AUTH] User balance:', balance);

      if (balance <= 0) {
        console.warn('[WS AUTH] Insufficient balance for user:', user.email);
        this._sendError(ws, { type: 'insufficient_credits', message: 'Please refill your credits' });
        ws.close(1008, 'Insufficient credits');
        return;
      }

      // Store user info and start time
      ws.user = user;
      ws.sessionStartTime = Date.now();

      // Determine agent config
      let agentConfig = this.defaultAgentConfig;

      // Use Deepgram's native LLM by default if no agent is specified
      // This avoids external API key issues
      if (!ws.agentId) {
        agentConfig = {
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
        };
      }

      if (ws.agentId) {
        const agent = await prisma.agent.findFirst({
          where: { id: ws.agentId, userId: user.id }
        });

        if (agent) {
          agentConfig = this._buildAgentConfigFromAgent(agent, user);
          ws.agentRecord = agent;
        } else {
          console.warn(`Agent ${ws.agentId} not found, using default Deepgram config`);
        }
      }

      console.log(`[AUTH] Starting Deepgram for ${user.email} (Agent: ${ws.agentRecord?.name || 'Default'})`);
      this._startDeepgramConnection(ws, agentConfig);

      this._sendJson(ws, {
        type: 'Authenticated',
        data: {
          email: user.email,
          balance: user.creditBalance.balance,
          agentName: ws.agentRecord?.name || 'Default'
        }
      });

    } catch (error) {
      console.error('[WS AUTH ERROR]:', error.message);
      // Send the actual error message so we can debug!
      this._sendError(ws, {
        type: 'auth_error',
        message: error.message || 'Authentication failed',
        details: error.stack
      });
      ws.close(1008, (error.message || 'Auth failed').substring(0, 120));
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
    // If Deepgram closes, we should close the user session too
    setTimeout(() => {
      if (ws.readyState === 1) ws.close(1000, 'Deepgram closed: ' + (event.reason || 'No reason'));
    }, 2000);
  }

  _onDeepgramError(ws, error) {
    const errorString = typeof error === 'string' ? error : JSON.stringify(error);
    debugLog(`[DG ERROR] ${errorString}`);
    console.error('[WS] Deepgram error received:', errorString);

    this._sendError(ws, {
      type: error?.type || 'connection_error',
      message: error?.message || 'Unknown Deepgram error',
      code: error?.code || null,
      details: error
    });
  }

  async _onDeepgramMessage(ws, message) {
    // Rely message to client as usual
    this._sendJson(ws, message);

    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;

      // Handle user speech transcripts from Deepgram Voice Agent API
      if (data.type === 'ConversationText' && data.role === 'user') {
        const userText = data.content;
        console.log(`[Workflow Context] User said: ${userText}`);

        // If workflow is enabled, let the executor decide the next move
        if (ws.agentRecord?.workflowEnabled && ws.agentRecord?.workflowJson) {
          await this._handleWorkflowStep(ws, userText);
        }
      }
    } catch (error) {
      console.error('[WS] Workflow intercept error:', error.message);
    }
  }

  async _handleWorkflowStep(ws, userText) {
    if (!ws.workflowExecutor) {
      ws.workflowExecutor = new WorkflowExecutor(
        ws.agentRecord.workflowJson,
        {
          userEmail: ws.user?.email,
          agentName: ws.agentRecord?.name,
          lastUserMessage: userText
        }
      );
    }

    const result = await ws.workflowExecutor.executeNext(userText);

    if (result) {
      console.log(`[Workflow] Result Type: ${result.type}`);

      // If the node produces a message, tell Deepgram to speak it
      if (result.message) {
        const dgConn = this.deepgramConnections.get(ws);
        if (dgConn) {
          console.log(`[Workflow] Injecting agent message: ${result.message}`);
          dgConn.sendJson({
            type: 'InjectAgentMessage',
            message: result.message
          });
        }
      }

      // If the node is a prompt node, we might want to update the agent's instructions for the next turn
      if (result.type === 'prompt' && result.config) {
        const dgConn = this.deepgramConnections.get(ws);
        if (dgConn) {
          console.log(`[Workflow] Updating agent settings for prompt node`);
          dgConn.sendJson({
            type: 'UpdateSettings',
            settings: {
              agent: {
                think: {
                  instructions: result.config.systemPrompt,
                  model: result.config.model
                }
              }
            }
          });
        }
      }

      // If the node is a transfer node
      if (result.type === 'transfer') {
        this._sendJson(ws, { type: 'TransferCall', data: result });
      }

      // If the call should end
      if (result.type === 'end_call') {
        setTimeout(() => {
          this._handleClientDisconnect(ws);
          ws.close(1000, 'Call ended by workflow');
        }, 2000);
      }
    }
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

    if (ws.readyState === 1) ws.close(1000, 'Session ended safely');
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
        ws.close(1001, 'Server shutting down');
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
