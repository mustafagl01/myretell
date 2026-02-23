import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BACKEND_URL = 'wss://myretell.onrender.com/ws?agentId=7facd13c-a220-415b-8b5c-1208a86da24d';

async function testBackend() {
    const token = jwt.sign({ userId: '912f5657-bfa4-41d7-9c99-868f63f17ef6', email: 'test@example.com' }, SECRET);
    console.log('Generated Token:', token);

    const ws = new WebSocket(BACKEND_URL);

    ws.on('open', () => {
        console.log('✅ Connected to Backend WS');
        ws.send(JSON.stringify({ type: 'Authenticate', data: { token } }));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log('📩 Received:', JSON.stringify(msg, null, 2));

        if (msg.type === 'Authenticated') {
            console.log('🔑 Authenticated Successfully');
        }
    });

    ws.on('error', (err) => {
        console.error('❌ WS Error:', err.message);
    });

    ws.on('close', (code, reason) => {
        console.log(`🔌 Closed: ${code} - ${reason}`);
        process.exit(0);
    });

    setTimeout(() => {
        console.log('⏰ Timeout');
        ws.close();
    }, 20000);
}

testBackend();
