import { createClient, AgentEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function testConfig(name, settings_agent_think) {
  console.log(`Testing: ${name}`);
  const client = createClient(process.env.DEEPGRAM_API_KEY);
  const agent = client.agent();

  return new Promise((resolve) => {
    agent.on(AgentEvents.Welcome, (data) => {
      const settings = {
        type: 'Settings',
        audio: {
          input: { encoding: 'linear16', sample_rate: 16000 },
          output: { encoding: 'linear16', sample_rate: 16000, container: 'none' }
        },
        agent: {
          listen: { provider: { type: 'deepgram', model: 'nova-2' } },
          think: settings_agent_think,
          speak: { provider: { type: 'deepgram', model: 'aura-asteria-en' } }
        }
      };
      agent.send(JSON.stringify(settings));
    });

    agent.on(AgentEvents.SettingsApplied, () => {
      console.log(`✅ SUCCESS: ${name}`);
      agent.disconnect();
      resolve(true);
    });

    agent.on(AgentEvents.Error, (err) => {
      console.log(`❌ FAIL: ${name} - ${err.description || JSON.stringify(err)}`);
      agent.disconnect();
      resolve(false);
    });
    
    agent.setupConnection();
    setTimeout(() => {
        agent.disconnect();
        resolve(false);
    }, 5000);
  });
}

async function run() {
  const models = ['llama-3-70b', 'mixtral-8x7b', 'llama-3-8b'];
  
  for (const model of models) {
    // Standard structure
    await testConfig(`${model} standard`, {
      provider: { type: 'deepgram', model: model },
      prompt: 'Be helpful AI.'
    });
  }
}

run();