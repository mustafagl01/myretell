import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function findWorkingConfig() {
    const dg = createClient(process.env.DEEPGRAM_API_KEY);
    console.log(`\n--- Testing OPENAI with CORRECT UNDERSCORE ---`);
    const agent = dg.agent();

    const result = await new Promise((resolve) => {
        agent.on('Open', () => console.log('  [DG] Connection open'));
        agent.on('Welcome', () => {
            console.log('  [DG] Welcome received');
            const payload = {
                type: "Settings",
                audio: {
                    input: { encoding: "linear16", sample_rate: 16000 },
                    output: { encoding: "linear16", sample_rate: 16000, container: "none" }
                },
                agent: {
                    listen: { provider: { type: "deepgram", model: "nova-2" } },
                    think: {
                        provider: {
                            type: "open_ai",
                            model: "gpt-4o"
                        },
                        prompt: "Be helpful.",
                        endpoint: {
                            url: "https://api.openai.com/v1/chat/completions",
                            headers: {
                                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                            }
                        }
                    },
                    speak: { provider: { type: "deepgram", model: "aura-asteria-en" } }
                }
            };
            agent.send(JSON.stringify(payload));
        });
        agent.on('SettingsApplied', () => resolve('SUCCESS'));
        agent.on('Error', (err) => resolve(`FAIL: ${err.description || err.message || JSON.stringify(err)}`));

        agent.setupConnection();
        setTimeout(() => resolve('TIMEOUT'), 10000);
    });

    console.log(`  Result: ${result}`);
    process.exit(0);
}

findWorkingConfig();
