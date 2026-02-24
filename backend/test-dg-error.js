import { createClient, AgentEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const client = createClient(process.env.DEEPGRAM_API_KEY);
  const agent = client.agent();

  agent.on(AgentEvents.Welcome, (data) => {
    // Malformed settings
    const settings = {
      type: 'Settings',
      agent: {
        listen: {
          typo: 'yes'
        },
        think: { provider: { type: 'open_ai', model: 'gpt-4o-mini' } },
        speak: { provider: { type: 'deepgram', model: 'aura-asteria-en' } }
      }
    };
    agent.send(JSON.stringify(settings));
  });

  agent.on(AgentEvents.Error, (err) => console.error('DG Error:', err));
  agent.setupConnection();
}

test();