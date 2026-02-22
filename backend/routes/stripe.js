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

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // session.client_reference_id should be the userId
        const userId = session.client_reference_id;
        const amountTotal = session.amount_total / 100; // in dollars

        // Dollar-based balance: $1 paid = $1.00 added to balance
        // No more minutes/credits conversion — pure dollar balance
        const balanceToAdd = amountTotal;

        if (userId && balanceToAdd > 0) {
            try {
                await prisma.$transaction([
                    // 1. Add dollar amount to balance
                    prisma.creditBalance.update({
                        where: { userId },
                        data: { balance: { increment: balanceToAdd } }
                    }),
                    // 2. Log transaction
                    prisma.transaction.create({
                        data: {
                            userId,
                            amount: amountTotal,
                            type: 'purchase',
                            stripeSessionId: session.id,
                            stripePaymentId: session.payment_intent
                        }
                    })
                ]);
                console.log(`Successfully added $${balanceToAdd.toFixed(2)} to user ${userId} balance`);
            } catch (error) {
                console.error('Failed to update balance after purchase:', error.message);
            }
        }
    }

    res.json({ received: true });
});

export default router;
