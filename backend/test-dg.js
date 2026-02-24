import { createClient, AgentEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const client = createClient(process.env.DEEPGRAM_API_KEY);
  const agent = client.agent();

  agent.on(AgentEvents.Welcome, (data) => {
    const settings = {
      type: 'Settings',
      audio: {
        input: { encoding: 'mulaw', sample_rate: 8000 },
        output: { encoding: 'mulaw', sample_rate: 8000, container: 'none' }
      },
      agent: {
        listen: { model: 'nova-2', provider: { type: 'deepgram' } },
        think: { provider: { type: 'deepgram', model: 'llama-3-70b-instruct' } },
        speak: { provider: { type: 'deepgram', model: 'aura-asteria-en' } }
      }
    };
    agent.send(JSON.stringify(settings));
  });

  agent.on(AgentEvents.Error, (err) => console.error('DG Error:', err));
  agent.setupConnection();
}

test();