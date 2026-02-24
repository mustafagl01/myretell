import { createClient, AgentEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function testConfig(model) {
  console.log(`Testing model: ${model}`);
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
          think: {
            provider: { type: 'deepgram', model: model },
            prompt: 'Be helpful.'
          },
          speak: { provider: { type: 'deepgram', model: 'aura-asteria-en' } }
        }
      };
      agent.send(JSON.stringify(settings));
    });

    agent.on(AgentEvents.SettingsApplied, () => {
      console.log(`✅ SUCCESS: ${model}`);
      agent.disconnect();
      resolve(true);
    });

    agent.on(AgentEvents.Error, (err) => {
      console.log(`❌ FAIL: ${model} - ${err.description || JSON.stringify(err)}`);
      agent.disconnect();
      resolve(false);
    });
    
    agent.setupConnection();
    setTimeout(() => {
        agent.disconnect();
        resolve(false);
    }, 3000);
  });
}

async function run() {
  const models = [
    'llama-3-8b-instruct',
    'llama-3-70b-instruct',
    'llama3-8b-instruct',
    'llama3-70b-instruct',
    'meta-llama/Llama-3-8b-instruct',
    'meta-llama/Llama-3-70b-instruct',
    'mixtral-8x7b-instruct',
    'mistral-7b-instruct'
  ];
  
  for (const model of models) {
    await testConfig(model);
  }
}

run();