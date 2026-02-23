import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const VARIATIONS = [
    // A. Official "Getting Started" Style (No language, simple listen/speak)
    {
        name: 'Official Minimal (No language, simple listen/speak)',
        config: {
            type: "Settings",
            audio: {
                input: { encoding: "linear16", sample_rate: 16000 },
                output: { encoding: "linear16", sample_rate: 16000, container: "none" }
            },
            agent: {
                listen: { model: "nova-2" },
                think: { model: "gpt-4o", provider: { type: "open_ai" }, instructions: "Hello." },
                speak: { model: "aura-asteria-en" }
            }
        }
    },
    // B. With root language (Option 1 from user)
    {
        name: 'With Root Language',
        config: {
            type: "Settings",
            audio: {
                input: { encoding: "linear16", sample_rate: 16000 },
                output: { encoding: "linear16", sample_rate: 16000, container: "none" }
            },
            agent: {
                language: "en",
                listen: { model: "nova-2" },
                think: { model: "gpt-4o", provider: { type: "open_ai" }, instructions: "Hello." },
                speak: { model: "aura-asteria-en" }
            }
        }
    },
    // C. Deepgram provider for think
    {
        name: 'Deepgram provider for think',
        config: {
            type: "Settings",
            audio: {
                input: { encoding: "linear16", sample_rate: 16000 },
                output: { encoding: "linear16", sample_rate: 16000, container: "none" }
            },
            agent: {
                listen: { model: "nova-2" },
                think: { model: "llama-3-70b-instruct", provider: { type: "deepgram" }, instructions: "Hello." },
                speak: { model: "aura-asteria-en" }
            }
        }
    }
];

async function runTests() {
    for (const variation of VARIATIONS) {
        console.log(`\n--- Testing Variation: ${variation.name} ---`);
        const success = await testOne(variation.config);
        if (success) {
            console.log(`✅ FOUND IT! Working Schema: ${variation.name}`);
            console.log('Full JSON:', JSON.stringify(variation.config, null, 2));
            process.exit(0);
        }
    }
    console.log('\n❌ All variations failed.');
    process.exit(1);
}

async function testOne(config) {
    return new Promise((resolve) => {
        const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
        const agent = deepgram.agent();
        let resolved = false;

        const cleanup = () => { if (!resolved) { resolved = true; resolve(false); } };

        agent.on('open', () => { console.log('  WS Open'); });
        agent.on('welcome', () => {
            console.log('  Welcome. Sending Settings...');
            agent.send(JSON.stringify(config));
        });

        agent.on('settings_applied', () => {
            console.log('  ⚡ Settings Applied!');
            resolved = true;
            resolve(true);
        });

        agent.on('error', (err) => {
            console.log('  ❌ Error:', err.description || err.message || JSON.stringify(err));
            cleanup();
        });

        agent.on('close', () => { cleanup(); });

        agent.setupConnection();
        setTimeout(cleanup, 12000); // 12s timeout per test
    });
}

runTests();
