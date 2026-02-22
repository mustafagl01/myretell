import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Check, Zap, Rocket, Crown, Star } from 'lucide-react';
import './Pricing.css';

const BASE_RATE = 0.20;

export const Pricing = ({ user, onLogout }) => {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');
    const [customAmount, setCustomAmount] = useState(10);

    const currentBalance = Number(user?.creditBalance?.balance || 0);

    const customTopup = {
        min: 10,
        max: 300,
        step: 5,
    };

    const projectedBalance = currentBalance + customAmount;
    const estimatedMinutes = Math.floor(customAmount / BASE_RATE);

    const tiers = [
        {
            name: 'FREE',
            price: 0,
            monthlyBalance: 5,
            rate: 0.20,
            desc: 'Start free with a $5.00 signup balance.',
            icon: Star,
            features: [
                '$5.00 free balance on signup',
                'Usage rate: $0.20 / minute',
                `~${Math.floor(5 / 0.2)} minutes at this rate`,
                '1 Voice Agent',
                'Community Support'
            ],
            btnText: 'Current Plan',
            btnClass: 'btn-plan-ghost'
        },
        {
            name: 'STARTER',
            price: 19,
            monthlyBalance: 19,
            rate: 0.18,
            desc: 'Best for individuals and small teams.',
            icon: Zap,
            features: [
                '$19 added to balance each month',
                'Usage rate: $0.18 / minute',
                `~${Math.floor(19 / 0.18)} minutes at this rate`,
                'Up to 3 agents'
            ],
            popular: false,
            btnText: 'Upgrade to Starter',
            btnClass: 'btn-plan-outline'
        },
        {
            name: 'PRO',
            price: 49,
            monthlyBalance: 49,
            rate: 0.16,
            desc: 'Most popular for growing teams.',
            icon: Rocket,
            features: [
                '$49 added to balance each month',
                'Usage rate: $0.16 / minute',
                `~${Math.floor(49 / 0.16)} minutes at this rate`,
                'Up to 10 agents'
            ],
            popular: true,
            btnText: 'Go Pro',
            btnClass: 'btn-plan-primary'
        },
        {
            name: 'SCALE',
            price: 149,
            monthlyBalance: 149,
            rate: 0.15,
            desc: 'For high-volume production usage.',
            icon: Crown,
            features: [
                '$149 added to balance each month',
                'Usage rate: $0.15 / minute',
                `~${Math.floor(149 / 0.15)} minutes at this rate`,
                'Unlimited agents'
            ],
            btnText: 'Go Scale',
            btnClass: 'btn-plan-outline'
        }
    ];

    const handleCheckout = async (tier) => {
        if (tier.price === 0) return;
        setLoading(tier.name);
        setError('');

        try {
            const response = await fetch('/api/checkout/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    planName: tier.name,
                    amount: tier.price,
                    checkoutType: 'subscription-balance'
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Checkout failed');
            window.location.href = data.url;
        } catch (err) {
            setError(err.message);
            setLoading(null);
        }
    };

    const handleCustomCheckout = async () => {
        setLoading('CUSTOM_TOPUP');
        setError('');

        try {
            const response = await fetch('/api/checkout/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    planName: 'Pay As You Go Balance Top-up',
                    amount: customAmount,
                    checkoutType: 'topup'
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Checkout failed');
            window.location.href = data.url;
        } catch (err) {
            setError(err.message);
            setLoading(null);
        }
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Balance & Plans">
            <div className="pricing-container-v2">
                <header className="pricing-v2-header">
                    <span className="badge-promo">Dollar Balance Billing</span>
                    <h1>Simple usage-based pricing</h1>
                    <p>All usage is billed from your balance in USD.</p>
                </header>

                {error && <div className="pricing-error-v2">{error}</div>}

                <div className="pricing-grid-v2">
                    {tiers.map((tier) => (
                        <div key={tier.name} className={`tier-card ${tier.popular ? 'popular' : ''}`}>
                            {tier.popular && <div className="popular-ribbon">Most Popular</div>}
                            <div className="tier-header">
                                <tier.icon className="tier-icon" size={24} />
                                <h3 className="tier-name">{tier.name}</h3>
                                <div className="tier-price">
                                    <span className="currency">$</span>
                                    <span className="value">{tier.price}</span>
                                    <span className="period">/mo</span>
                                </div>
                                <div className="tier-minutes">${tier.monthlyBalance.toFixed(2)} balance/month</div>
                                <div className="tier-rate">Usage rate: ${tier.rate.toFixed(2)} / minute</div>
                                <p className="tier-desc">{tier.desc}</p>
                            </div>

                            <ul className="tier-features">
                                {tier.features.map((f, i) => (
                                    <li key={i}><Check size={14} className="check-icon" /> {f}</li>
                                ))}
                            </ul>

                            <button
                                className={`btn-tier-action ${tier.btnClass}`}
                                onClick={() => handleCheckout(tier)}
                                disabled={loading === tier.name || tier.price === 0}
                            >
                                {loading === tier.name ? 'Processing...' : tier.btnText}
                            </button>
                        </div>
                    ))}
                </div>

                <section className="custom-topup-card">
                    <div className="custom-topup-header">
                        <h2>Pay as you go balance top-up</h2>
                        <p>Load any amount from ${customTopup.min} to ${customTopup.max} directly into your USD balance.</p>
                    </div>

                    <div className="custom-topup-amount">Load ${customAmount}</div>
                    <div className="custom-topup-highlight">Your balance becomes ${projectedBalance.toFixed(2)}</div>
                    <input
                        type="range"
                        min={customTopup.min}
                        max={customTopup.max}
                        step={customTopup.step}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                        className="custom-topup-slider"
                    />

                    <div className="custom-topup-meta">
                        <span>Load ${customAmount} → Your balance becomes ${projectedBalance.toFixed(2)}</span>
                        <span>Estimated talk time: ~{estimatedMinutes} minutes at $0.20/min</span>
                    </div>

                    <button
                        className="btn-tier-action btn-plan-primary"
                        onClick={handleCustomCheckout}
                        disabled={loading === 'CUSTOM_TOPUP'}
                    >
                        {loading === 'CUSTOM_TOPUP' ? 'Processing...' : `Top up $${customAmount}`}
                    </button>
                </section>
            </div>
        </DashboardLayout>
    );
};
