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
        input: { encoding: 'linear16', sample_rate: 16000 },
        output: { encoding: 'linear16', sample_rate: 16000, container: 'none' }
      },
      agent: {
        listen: { provider: { type: 'deepgram', model: 'nova-2' } },
        think: {
          provider: { type: 'deepgram' },
          model: 'llama-3-70b-instruct',
          instructions: 'Be helpful.'
        },
        speak: { provider: { type: 'deepgram', model: 'aura-asteria-en' } }
      }
    };
    agent.send(JSON.stringify(settings));
  });

  agent.on(AgentEvents.SettingsApplied, () => {
    console.log('✅ SUCCESS!');
    agent.disconnect();
  });
  
  agent.on(AgentEvents.Error, (err) => {
    console.log(`❌ FAIL: ${err.description || JSON.stringify(err)}`);
    agent.disconnect();
  });
  
  agent.setupConnection();
}

test();