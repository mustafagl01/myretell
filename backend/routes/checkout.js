import express from 'express';
import stripePackage from 'stripe';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Create a checkout session
router.post('/create-session', authenticateToken, async (req, res) => {
    const { planName, amount, credits } = req.body;
    const userId = req.user.id;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: planName,
                            description: `${credits} of voice assistant talk time`,
                        },
                        unit_amount: amount * 100, // amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
            client_reference_id: userId,
            customer_email: req.user.email,
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Session Error:', error.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

export default router;
