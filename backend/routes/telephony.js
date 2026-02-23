import express from 'express';
import twilio from 'twilio';
import prisma from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Sadece giriş yapmış kullanıcılar
router.use(authenticateToken);

/**
 * GET /api/telephony/numbers - Kullanıcının bağlı numaralarını listele
 */
router.get('/numbers', async (req, res) => {
    try {
        const agents = await prisma.agent.findMany({
            where: { 
                userId: req.user.id,
                phoneNumber: { not: null }
            },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                status: true
            }
        });
        
        // Şimdilik Agent tablosundaki numaraları dönüyoruz. 
        // İleride bağımsız bir 'PhoneNumber' tablosu da eklenebilir.
        res.json(agents.map(a => ({
            id: a.id,
            phoneNumber: a.phoneNumber,
            name: a.name,
            status: 'active'
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch numbers' });
    }
});

/**
 * POST /api/telephony/numbers - Yeni numara bağla ve Twilio'yu OTO-YAPILANDIR
 */
router.post('/numbers', async (req, res) => {
    const { phoneNumber, name } = req.body;

    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

    try {
        // 1. Twilio Client Hazırla
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // 2. Twilio'da numarayı bul ve Webhook'u otomatik güncelle (SaaS Magic!)
        const incomingNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: phoneNumber });
        
        if (incomingNumbers.length === 0) {
            return res.status(404).json({ error: 'Number not found in your Twilio account' });
        }

        const twilioNum = incomingNumbers[0];
        const webhookUrl = `https://${req.headers.host}/api/twilio/incoming`;

        await client.incomingPhoneNumbers(twilioNum.sid).update({
            voiceUrl: webhookUrl,
            voiceMethod: 'POST'
        });

        // 3. Veritabanında bir "Placeholder Agent" oluştur veya mevcut olana bağla
        const agent = await prisma.agent.create({
            data: {
                userId: req.user.id,
                name: name || `Phone Agent (${phoneNumber})`,
                phoneNumber: phoneNumber,
                twilioSid: twilioNum.sid,
                systemPrompt: "You are a helpful phone assistant.",
                status: 'active'
            }
        });

        res.status(201).json(agent);
    } catch (error) {
        console.error('Telephony Error:', error);
        res.status(500).json({ error: `Twilio Error: ${error.message}` });
    }
});

/**
 * DELETE /api/telephony/numbers/:id - Numarayı sistemden ayır
 */
router.delete('/numbers/:id', async (req, res) => {
    try {
        await prisma.agent.update({
            where: { id: req.params.id, userId: req.user.id },
            data: { phoneNumber: null, twilioSid: null }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove number' });
    }
});

export default router;
