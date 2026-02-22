import express from 'express';
import stripePackage from 'stripe';
import prisma from '../config/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Stripe requires the raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const amountTotal = Number(session.amount_total || 0) / 100;

        if (userId && amountTotal > 0) {
            try {
                await prisma.$transaction([
                    prisma.creditBalance.upsert({
                        where: { userId },
                        update: { balance: { increment: amountTotal } },
                        create: { userId, balance: amountTotal },
                    }),
                    prisma.transaction.create({
                        data: {
                            userId,
                            amount: amountTotal,
                            creditsAdded: amountTotal,
                            type: session.metadata?.checkoutType || 'purchase',
                            stripeSessionId: session.id,
                            stripePaymentId: session.payment_intent?.toString() || null,
                        }
                    })
                ]);
                console.log(`Successfully added $${amountTotal.toFixed(2)} balance to user ${userId}`);
            } catch (error) {
                console.error('Failed to update balance after purchase:', error.message);
            }
        }
    }

    res.json({ received: true });
});

export default router;
