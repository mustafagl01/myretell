import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function finalTest() {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const agent = deepgram.agent();

    agent.on('open', () => { console.log('✅ WS Open'); });
    agent.on('welcome', () => {
        console.log('📩 Welcome. Sending Getting Started Config...');
        // EXACTLY AS IN DOCS
        const config = {
            type: "Settings",
            audio: {
                input: { encoding: "linear16", sample_rate: 16000 },
                output: { encoding: "linear16", sample_rate: 16000, container: "none" }
            },
            agent: {
                listen: { model: "nova-2" },
                think: {
                    model: "gpt-4o",
                    provider: { type: "open_ai" },
                    instructions: "You are a helpful assistant."
                },
                speak: { model: "aura-asteria-en" }
            }
        };
        agent.send(JSON.stringify(config));
    });

    agent.on('settings_applied', (data) => {
        console.log('⚡ SUCCESS: Settings Applied!', JSON.stringify(data));
        process.exit(0);
    });

    agent.on('error', (err) => {
        console.error('❌ FAILED:', err.description || err.message || JSON.stringify(err));
        process.exit(1);
    });

    agent.setupConnection();
    setTimeout(() => { console.log('⏰ Timeout'); process.exit(1); }, 15000);
}

finalTest();
