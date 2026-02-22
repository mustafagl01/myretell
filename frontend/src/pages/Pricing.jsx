import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Check, Zap, Rocket, Crown, Star } from 'lucide-react';
import './Pricing.css';

export const Pricing = ({ user, onLogout }) => {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');
    const [customAmount, setCustomAmount] = useState(10);

    const RATE_PER_MINUTE = 0.20;
    const estimatedMinutes = Math.floor(customAmount / RATE_PER_MINUTE);

    const tiers = [
        {
            name: 'FREE',
            price: 0,
            balance: 2.00,
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

                {/* ═══ Hero Header ═══ */}
                <header className="pricing-v2-header">
                    <span className="badge-promo">💎 No Hidden Fees — Guaranteed</span>
                    <h1>Transparent Pricing</h1>
                    <p>$1 paid = $1.00 balance. All-inclusive at $0.20/min. No surprises. Ever.</p>
                </header>

                {/* ═══ Transparency Banner ═══ */}
                <div className="transparency-banner">
                    <div className="transparency-header">
                        <h2>💎 No Hidden Fees. Really.</h2>
                        <p>
                            Unlike competitors who advertise $0.05/min but charge $0.19–$0.31/min
                            after adding STT, LLM, and TTS fees — we show you the <strong>REAL</strong> all-inclusive price upfront.
                        </p>
                    </div>
                    <div className="price-breakdown">
                        <div className="breakdown-row">
                            <span className="breakdown-service">STT (Deepgram Nova-3)</span>
                            <span className="breakdown-status included">Included ✓</span>
                        </div>
                        <div className="breakdown-row">
                            <span className="breakdown-service">LLM (Gemini / Claude / GPT)</span>
                            <span className="breakdown-status included">Included ✓</span>
                        </div>
                        <div className="breakdown-row">
                            <span className="breakdown-service">TTS (Deepgram Aura / ElevenLabs)</span>
                            <span className="breakdown-status included">Included ✓</span>
                        </div>
                        <div className="breakdown-row">
                            <span className="breakdown-service">Platform & Infrastructure</span>
                            <span className="breakdown-status included">Included ✓</span>
                        </div>
                        <div className="breakdown-total">
                            <strong>YOUR ALL-IN PRICE</strong>
                            <strong className="total-price">$0.20/min</strong>
                        </div>
                    </div>
                    <p className="guarantee-text">
                        🛡️ <strong>100% Transparent Pricing Guarantee:</strong> The price you see is the price you pay.
                        If you find ANY hidden fee, we'll refund your entire balance. No questions asked.
                    </p>
                </div>

                {error && <div className="pricing-error-v2">{error}</div>}

                {/* ═══ Trust Badges ═══ */}
                <div className="trust-badges">
                    <div className="trust-badge">
                        <div className="trust-badge-icon">💎</div>
                        <h4>Transparent Pricing</h4>
                        <p>No hidden fees guaranteed</p>
                    </div>
                    <div className="trust-badge">
                        <div className="trust-badge-icon">🏆</div>
                        <h4>Premium Stack</h4>
                        <p>ElevenLabs v3 + Claude 3.5</p>
                    </div>
                    <div className="trust-badge">
                        <div className="trust-badge-icon">🇹🇷</div>
                        <h4>Turkish Support</h4>
                        <p>Built-in, not an add-on</p>
                    </div>
                    <div className="trust-badge">
                        <div className="trust-badge-icon">⚡</div>
                        <h4>40% Cheaper</h4>
                        <p>vs competitors' real price</p>
                    </div>
                </div>

                {/* ═══ Plan Cards ═══ */}
                <div className="pricing-grid-v2">
                    {tiers.map((tier) => (
                        <div key={tier.name} className={`tier-card ${tier.popular ? 'popular' : ''}`}>
                            {tier.popular && <div className="popular-ribbon">Most Popular</div>}

                            <div className="allinclusive-badge">✓ All-inclusive · No hidden fees</div>

                            <div className="tier-header">
                                <tier.icon className="tier-icon" size={24} />
                                <h3 className="tier-name">{tier.name}</h3>
                                <div className="tier-price">
                                    <span className="currency">$</span>
                                    <span className="value">{tier.price}</span>
                                    <span className="period">{tier.price === 0 ? '' : '/mo'}</span>
                                </div>
                                <div className="tier-minutes">~{Math.floor(tier.balance / RATE_PER_MINUTE)} minutes of usage</div>
                                <div className="tier-rate">
                                    ${RATE_PER_MINUTE.toFixed(2)} / minute
                                    <span className="rate-detail">(STT + LLM + TTS + Platform)</span>
                                </div>
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

                {/* ═══ Comparison Table ═══ */}
                <section className="pricing-comparison">
                    <h2>MyRetell vs Competition</h2>
                    <p className="comparison-subtitle">See why transparent pricing wins</p>

                    <div className="comparison-table-wrapper">
                        <table className="comparison-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th className="col-highlight">MyRetell</th>
                                    <th>Retell AI</th>
                                    <th>Vapi AI</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Advertised Price</strong></td>
                                    <td className="cell-highlight">$0.20/min</td>
                                    <td>$0.05/min*</td>
                                    <td>$0.05/min*</td>
                                </tr>
                                <tr>
                                    <td><strong>REAL All-In Price</strong></td>
                                    <td className="cell-highlight cell-green">$0.20/min ✓</td>
                                    <td className="cell-warning">$0.13–$0.31/min</td>
                                    <td className="cell-warning">$0.13–$0.18/min</td>
                                </tr>
                                <tr>
                                    <td>STT Included</td>
                                    <td className="cell-highlight">✅ Yes</td>
                                    <td>❌ Extra charge</td>
                                    <td>❌ Extra charge</td>
                                </tr>
                                <tr>
                                    <td>LLM Included</td>
                                    <td className="cell-highlight">✅ Yes</td>
                                    <td>❌ Extra charge</td>
                                    <td>❌ Extra charge</td>
                                </tr>
                                <tr>
                                    <td>Premium TTS</td>
                                    <td className="cell-highlight">✅ ElevenLabs v3</td>
                                    <td>💰 +$0.07/min</td>
                                    <td>💰 +$0.07/min</td>
                                </tr>
                                <tr>
                                    <td>Turkish Support</td>
                                    <td className="cell-highlight">✅ Built-in</td>
                                    <td>❌ Not supported</td>
                                    <td>❌ Limited</td>
                                </tr>
                                <tr>
                                    <td><strong>Hidden Fees</strong></td>
                                    <td className="cell-highlight cell-green">❌ NONE</td>
                                    <td className="cell-warning">⚠️ Multiple</td>
                                    <td className="cell-warning">⚠️ Multiple</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="comparison-disclaimer">
                        * Competitor "base prices" exclude STT, LLM, premium TTS, and platform fees.
                        Real costs are 2–6× higher than advertised.
                    </p>
                </section>

                {/* ═══ Custom Top-up ═══ */}
                <section className="custom-topup-card">
                    <div className="custom-topup-header">
                        <h2>💳 Pay As You Go Top-up</h2>
                        <p>
                            Load any amount from $10 to $300. $1 paid = $1.00 balance.
                            Usage billed at <strong>$0.20/min</strong>, pro-rated to the second.
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

                {/* ═══ FAQ Section ═══ */}
                <section className="pricing-faq">
                    <h2>Pricing FAQ</h2>

                    <div className="faq-item">
                        <h3>🤔 Why is your price higher than competitors?</h3>
                        <p>
                            <strong>It's not.</strong> Our $0.20/min is the REAL price.
                            Retell shows "$0.05/min" but charges $0.19–$0.31/min after adding
                            STT, LLM, and TTS fees. We show you the real cost upfront — no surprises.
                        </p>
                    </div>

                    <div className="faq-item">
                        <h3>💰 Are there any extra charges?</h3>
                        <p>
                            <strong>No.</strong> $0.20/min includes everything:
                        </p>
                        <ul className="faq-list">
                            <li>Speech-to-Text (Deepgram Nova-3)</li>
                            <li>LLM processing (Gemini 2.0, Claude 3.5, or GPT-4o)</li>
                            <li>Text-to-Speech (Deepgram Aura / ElevenLabs v3)</li>
                            <li>Infrastructure & bandwidth</li>
                            <li>Analytics & API access</li>
                        </ul>
                        <p>Zero surprise charges. Ever.</p>
                    </div>

                    <div className="faq-item">
                        <h3>📊 Can I see cost breakdown per call?</h3>
                        <p>
                            <strong>Yes!</strong> Every call shows exact duration and dollar cost
                            in your <strong>Call History</strong> page. Full transparency, down to the second.
                        </p>
                    </div>

                    <div className="faq-item">
                        <h3>🔄 What if I want to switch AI models?</h3>
                        <p>
                            Same price. Use Gemini Flash, Claude Sonnet, GPT-4o, or Llama —
                            all included at $0.20/min. No model-based upcharges.
                        </p>
                    </div>

                    <div className="faq-item">
                        <h3>🌍 Is Turkish language support extra?</h3>
                        <p>
                            <strong>No.</strong> Turkish (and all other supported languages) is included
                            at no extra cost. Our competitors don't even offer it!
                        </p>
                    </div>
                </section>

                {/* ═══ Footer ═══ */}
                <div className="pricing-footer-info">
                    <p>Need more? <strong>Contact us</strong> for Enterprise custom pricing.</p>
                </div>
            </div>
        </DashboardLayout>
    );
};
