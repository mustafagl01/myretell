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
        console.log(`⌛ TIMEOUT: ${name}`);
        agent.disconnect();
        resolve(false);
    }, 5000);
  });
}

async function run() {
  const models = ['llama-3-8b-instruct', 'llama-3-70b-instruct', 'llama-3.1-70b-instruct', 'llama-3.1-8b-instruct'];
  
  for (const model of models) {
    // Test with instructions
    await testConfig(`${model} with instructions`, {
      provider: { type: 'deepgram', model: model },
      instructions: 'Be helpful AI.'
    });
    
    // Test with prompt
    await testConfig(`${model} with prompt`, {
      provider: { type: 'deepgram', model: model },
      prompt: 'Be helpful AI.'
    });
    
    // Test with model outside provider
    await testConfig(`${model} outside provider`, {
      provider: { type: 'deepgram' },
      model: model,
      prompt: 'Be helpful AI.'
    });
  }
}

run();