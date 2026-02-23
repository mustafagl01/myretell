import { WebSocketServer } from 'ws';
import prisma from './config/prisma.js';
import { DeepgramConnection } from './deepgram-connection.js';

/**
 * TwilioHandler: Twilio Media Stream ile Deepgram Voice Agent arasındaki köprü.
 * Mulaw (8000Hz) formatındaki ses akışını Deepgram'a (Linear16/8000Hz) dönüştürür.
 */
export class TwilioHandler {
  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.connections = new Map(); // Twilio stream SID -> Deepgram connection
    this._initialize();
  }

  close() {
    try {
      for (const [, dgConn] of this.connections) {
        dgConn.disconnect();
      }
      this.connections.clear();
      if (this.wss) this.wss.close();
    } catch (error) {
      console.error('[Twilio] Error during shutdown:', error.message);
    }
  }

  _initialize() {
    this.wss.on('connection', (ws) => {
      console.log('[Twilio] New Media Stream connection');

      let streamSid = null;
      let agentId = null;
      let dgConn = null;

      ws.on('message', async (message) => {
        const msg = JSON.parse(message);

        switch (msg.event) {
          case 'start':
            streamSid = msg.start.streamSid;
            // Twilio start mesajındaki custom parametrelerden agentId'yi çekiyoruz
            agentId = msg.start.customParameters?.agentId;
            console.log(`[Twilio] Stream ${streamSid} started for Agent ${agentId}`);

            try {
              // Agent bilgilerini ve sahibini bul (Kredi kontrolü için)
              const agent = await prisma.agent.findUnique({
                where: { id: agentId },
                include: { user: { include: { creditBalance: true } } }
              });

              if (!agent || !agent.user.creditBalance || Number(agent.user.creditBalance.balance) <= 0) {
                console.warn('[Twilio] Agent not found or no balance, closing stream');
                ws.close();
                return;
              }

              // Deepgram Config (Twilio mulaw 8000Hz formatına uygun)
              const dgConfig = {
                audio: {
                  input: { encoding: 'mulaw', sample_rate: 8000 },
                  output: { encoding: 'mulaw', sample_rate: 8000, container: 'none' }
                },
                agent: {
                  listen: { model: 'nova-2', provider: { type: 'deepgram' } },
                  think: {
                    provider: { type: 'deepgram' },
                    model: agent.llmModel || 'llama-3-70b-instruct',
                    instructions: agent.systemPrompt
                  },
                  speak: { provider: { type: 'deepgram' }, model: agent.voice || 'aura-2-thalia-en' }
                },
                ...(agent.greeting && { greeting: agent.greeting })
              };

              // Deepgram bağlantısı oluştur
              dgConn = new DeepgramConnection({
                onAudio: (audioData) => {
                  // Deepgram'dan gelen AI sesini Twilio'ya bas
                  const base64Audio = Buffer.from(audioData).toString('base64');
                  ws.send(JSON.stringify({
                    event: 'media',
                    streamSid: streamSid,
                    media: { payload: base64Audio }
                  }));
                },
                onMessage: (dgMsg) => {
                  // Deepgram mesajlarını (transcript vb.) logla veya DB'ye kaydet
                  // console.log('[Twilio-DG] Msg:', dgMsg);
                }
              });

              await dgConn.connect(dgConfig);
              this.connections.set(streamSid, dgConn);

            } catch (err) {
              console.error('[Twilio] Error initializing Deepgram:', err.message);
              ws.close();
            }
            break;

          case 'media':
            // Telefondan gelen sesi (user audio) Deepgram'a ilet
            if (dgConn && dgConn.connected) {
              const audioBuffer = Buffer.from(msg.media.payload, 'base64');
              dgConn.sendAudio(audioBuffer);
            }
            break;

          case 'stop':
            console.log(`[Twilio] Stream ${streamSid} stopped`);
            if (dgConn) {
              dgConn.disconnect();
              this.connections.delete(streamSid);
            }
            break;
        }
      });

      ws.on('close', () => {
        if (dgConn) {
          dgConn.disconnect();
          if (streamSid) this.connections.delete(streamSid);
        }
      });
    });
  }
}

// HTTP API: Twilio Webhook (Gelen çağrıyı karşılar)
export const handleTwilioIncoming = async (req, res) => {
  const { To, From, CallSid } = req.body;
  console.log(`[Twilio] Incoming call from ${From} to ${To}`);

  try {
    // Aranan numaraya sahip agent'ı bul
    const agent = await prisma.agent.findFirst({
      where: { phoneNumber: To, status: 'active' }
    });

    if (!agent) {
      return res.status(200).send(`
        <Response>
          <Say voice="alice">Sorry, this number is not assigned to an active AI agent.</Say>
          <Hangup/>
        </Response>
      `);
    }

    // Twilio'ya ses akışını (Media Stream) başlatması için TwiML dön
    // ngrok URL'sini buraya otomatik bağlayacak bir yapı kurulmalı
    const streamUrl = `wss://${req.headers.host}/tw-media-stream`;

    res.type('text/xml');
    res.send(`
      <Response>
        <Connect>
          <Stream url="${streamUrl}">
            <Parameter name="agentId" value="${agent.id}" />
          </Stream>
        </Connect>
      </Response>
    `);

  } catch (error) {
    console.error('[Twilio] Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
