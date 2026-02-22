import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Check, Zap, Rocket, Crown, Star } from 'lucide-react';
import './Pricing.css';

export const Pricing = ({ user, onLogout }) => {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');

    const tiers = [
        {
            name: 'FREE',
            price: 0,
            minutes: '20 min',
            desc: 'For testing and small projects',
            icon: Star,
            features: [
                '1 Voice Agent',
                'Deepgram Aura TTS (Fast)',
                'Gemini 2.0 Flash LLM',
                'English Only',
                'MyRetell Branding',
                'Community Support'
            ],
            btnText: 'Current Plan',
            btnClass: 'btn-plan-ghost'
        },
        {
            name: 'STARTER',
            price: 29,
            minutes: '150 min',
            desc: 'Perfect for local businesses',
            icon: Zap,
            features: [
                '3 Voice Agents',
                'ElevenLabs Turbo v3 TTS',
                'Gemini 2.0 Flash LLM',
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
            price: 79,
            minutes: '500 min',
            desc: 'Best for scale & quality',
            icon: Rocket,
            features: [
                '10 Voice Agents',
                'ElevenLabs v3 (High Definition)',
                'Claude 3.5 Sonnet Support',
                '10+ Languages Included',
                'Advanced Analytics',
                'Full API Access',
                'Priority Support'
            ],
            popular: true,
            btnText: 'Go Pro',
            btnClass: 'btn-plan-primary'
        },
        {
            name: 'SCALE',
            price: 199,
            minutes: '1500 min',
            desc: 'The ultimate enterprise tool',
            icon: Crown,
            features: [
                '25 Voice Agents',
                'All Premium Models (GPT-4o)',
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
                    credits: tier.minutes
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
                    <span className="badge-promo">Best-of-Breed Technology Stack</span>
                    <h1>Choose Your Scale</h1>
                    <p>Powered by Deepgram, ElevenLabs v3 and Gemini 2.0</p>
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
                                <div className="tier-minutes">{tier.minutes} per month</div>
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

                <div className="pricing-footer-info">
                    <p>Need more? <strong>Contact us</strong> for Enterprise custom pricing up to 5000+ minutes.</p>
                </div>
            </div>
        </DashboardLayout>
    );
};
