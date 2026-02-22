import React, { useState } from 'react';
import './Pricing.css';

export const Pricing = () => {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');

    const plans = [
        {
            name: 'Starter Bundle',
            price: 10,
            credits: '60 min',
            features: ['Nova-3 STT', 'GPT-4o-mini', 'Aura-2 TTS'],
            btnClass: 'btn-plan-outline'
        },
        {
            name: 'Pro Pack',
            price: 29,
            credits: '200 min',
            features: ['Everything in Starter', 'Priority Latency', 'Email Support'],
            popular: true,
            btnClass: 'btn-plan-primary'
        },
        {
            name: 'Ultra Scale',
            price: 99,
            credits: '1000 min',
            features: ['Everything in Pro', 'Unlimited Sessions', 'Direct API Access'],
            btnClass: 'btn-plan-outline'
        }
    ];

    const handleCheckout = async (plan) => {
        setLoading(plan.name);
        setError('');

        try {
            const response = await fetch('/api/checkout/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    planName: plan.name,
                    amount: plan.price,
                    credits: plan.credits
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Checkout failed');
            }

            // Redirect to Stripe Checkout URL
            window.location.href = data.url;
        } catch (err) {
            setError(err.message);
            setLoading(null);
        }
    };

    return (
        <div className="pricing-container">
            <header className="pricing-header">
                <h1>Refill Your Credits</h1>
                <p>Choose the pack that fits your voice assistant's scale</p>
            </header>

            {error && <div className="pricing-error">{error}</div>}

            <div className="pricing-grid">
                {plans.map((plan, idx) => (
                    <div key={idx} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                        {plan.popular && <div className="popular-badge">Most Popular</div>}
                        <h3>{plan.name}</h3>
                        <div className="price-display">
                            <span className="amount">${plan.price}</span>
                        </div>
                        <div className="credit-line">{plan.credits} of talk time</div>

                        <ul className="feature-list">
                            {plan.features.map((f, i) => (
                                <li key={i}>{f}</li>
                            ))}
                        </ul>

                        <button
                            className={`btn-checkout ${plan.btnClass}`}
                            onClick={() => handleCheckout(plan)}
                            disabled={loading === plan.name}
                        >
                            {loading === plan.name ? 'Processing...' : 'Get Credits'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
