import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Check, Zap, Rocket, Crown, Star } from 'lucide-react';
import './Pricing.css';

export const Pricing = ({ user, onLogout }) => {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');
    const [customAmount, setCustomAmount] = useState(10);

    // $0.20 per minute → $1 = 5 minutes
    const RATE_PER_MINUTE = 0.20;
    const estimatedMinutes = Math.floor(customAmount / RATE_PER_MINUTE);

    const tiers = [
        {
            name: 'FREE',
            price: 0,
            balance: 2.00,  // $2.00 free = 10 min
            desc: 'Deneme ve küçük testler için',
            icon: Star,
            features: [
                '1 Voice Agent',
                '$2.00 free balance (~10 min)',
                'Economy stack (Deepgram + Gemini)',
                'Gemini 2.0 Flash LLM',
                'English Only',
                'Community Support'
            ],
            btnText: 'Current Plan',
            btnClass: 'btn-plan-ghost'
        },
        {
            name: 'STARTER',
            price: 19,
            balance: 19.00,
            desc: 'Küçük ekipler için en iyi başlangıç',
            icon: Zap,
            features: [
                '3 Voice Agents',
                '$19.00 balance (~95 min)',
                'Economy stack (Deepgram + Gemini)',
                'English & Turkish Support',
                'Remove Branding',
                'Email Support'
            ],
            popular: false,
            btnText: 'Upgrade to Starter',
            btnClass: 'btn-plan-outline'
        },
        {
            name: 'PRO',
            price: 49,
            balance: 49.00,
            desc: 'Kalite ve ölçek için en popüler plan',
            icon: Rocket,
            features: [
                '10 Voice Agents',
                '$49.00 balance (~245 min)',
                'ElevenLabs v3 (High Definition)',
                'Claude 3.5 Sonnet Support',
                '10+ Languages Included',
                'Full API Access',
                'Priority Support'
            ],
            popular: true,
            btnText: 'Go Pro',
            btnClass: 'btn-plan-primary'
        },
        {
            name: 'SCALE',
            price: 149,
            balance: 149.00,
            desc: 'Yüksek hacimli kullanım ve ekipler için',
            icon: Crown,
            features: [
                'Unlimited Voice Agents',
                '$149.00 balance (~745 min)',
                'All Premium Models',
                'Voice Cloning Included',
                'All 99 Languages (Whisper)',
                'Custom Integrations',
                'White-label Option',
                'Dedicated Support'
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
                    credits: `$${tier.balance.toFixed(2)} balance`
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
                    planName: 'Pay As You Go Top-up',
                    amount: customAmount,
                    credits: `$${customAmount.toFixed(2)} balance`,
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
        <DashboardLayout user={user} onLogout={onLogout} title="Credits & Plans">
            <div className="pricing-container-v2">
                <header className="pricing-v2-header">
                    <span className="badge-promo">$0.20 / minute — Simple, Transparent Pricing</span>
                    <h1>Choose Your Plan</h1>
                    <p>$1 paid = $1.00 balance. Usage billed at $0.20 per minute, pro-rated to the second.</p>
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
                                    <span className="period">{tier.price === 0 ? '' : '/mo'}</span>
                                </div>
                                <div className="tier-minutes">~{Math.floor(tier.balance / RATE_PER_MINUTE)} minutes of usage</div>
                                <div className="tier-rate">${RATE_PER_MINUTE.toFixed(2)} / minute</div>
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
                        <h2>💳 Pay As You Go Top-up</h2>
                        <p>
                            Load any amount from $10 to $300. $1 paid = $1.00 balance.
                            Usage is billed at <strong>$0.20/min</strong>, pro-rated to the second.
                        </p>
                    </div>

                    <div className="custom-topup-amount">${customAmount}</div>
                    <div className="custom-topup-highlight">~{estimatedMinutes} minutes for ${customAmount}</div>
                    <input
                        type="range"
                        min={10}
                        max={300}
                        step={5}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                        className="custom-topup-slider"
                    />

                    <div className="custom-topup-meta">
                        <span>Estimated: ~{estimatedMinutes} minutes</span>
                        <span>Rate: $0.20 / min</span>
                    </div>

                    <button
                        className="btn-tier-action btn-plan-primary"
                        onClick={handleCustomCheckout}
                        disabled={loading === 'CUSTOM_TOPUP'}
                    >
                        {loading === 'CUSTOM_TOPUP' ? 'Processing...' : `Top up $${customAmount}`}
                    </button>
                </section>

                <div className="pricing-footer-info">
                    <p>Need more? <strong>Contact us</strong> for Enterprise custom pricing.</p>
                </div>
            </div>
        </DashboardLayout>
    );
};
