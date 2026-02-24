import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BACKEND_URL = 'ws://localhost:3001/ws?agentId=7facd13c-a220-415b-8b5c-1208a86da24d';

async function testLocal() {
    const token = jwt.sign({ userId: '912f5657-bfa4-41d7-9c99-868f63f17ef6', email: 'test@example.com' }, SECRET);
    console.log('Testing LOCAL. Generated Token:', token);

    const ws = new WebSocket(BACKEND_URL);

    ws.on('open', () => {
        console.log('✅ Connected to LOCAL Backend WS');
        ws.send(JSON.stringify({ type: 'Authenticate', data: { token } }));
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            console.log('📩 From Local FULL:', JSON.stringify(msg));
            if (msg.type === 'Authenticated') {
                console.log('🔑 Authenticated Locally');
            }
            if (msg.type === 'Error') {
                console.log('❌ FATAL DG ERROR:', msg.description || msg.message);
                process.exit(1);
            }
        } catch (e) {
            console.log('📩 Binary message received or parse error');
        }
    });

    ws.on('error', (err) => {
        console.error('❌ Local WS Error:', err.message);
    });

    ws.on('close', (code, reason) => {
        console.log(`🔌 Local Closed: ${code} - ${reason}`);
        process.exit(0);
    });

    setTimeout(() => {
        console.log('⏰ Local Timeout');
        ws.close();
    }, 15000);
}

testLocal();
