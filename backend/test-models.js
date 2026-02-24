import { createClient, AgentEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}`);
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
          listen: { provider: { type: 'deepgram', model: 'nova-3' } },
          think: { provider: { type: 'deepgram', model: modelName } },
          speak: { provider: { type: 'deepgram', model: 'aura-asteria-en' } }
        }
      };
      agent.send(JSON.stringify(settings));
    });

    agent.on(AgentEvents.SettingsApplied, () => {
      console.log(`✅ Model ${modelName} works!`);
      agent.disconnect();
      resolve(true);
    });

    agent.on(AgentEvents.Error, (err) => {
      console.log(`❌ Model ${modelName} failed: ${err.description || JSON.stringify(err)}`);
      agent.disconnect();
      resolve(false);
    });
    
    agent.setupConnection();
  });
}

async function run() {
  const models = ['llama-3-70b', 'llama-3.1-70b-instruct', 'llama-3.1-8b-instruct', 'mixtral-8x7b-instruct'];
  for (const model of models) {
    const success = await testModel(model);
    if (success) break;
  }
}

run();