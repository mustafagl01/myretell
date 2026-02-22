import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import './AgentCreate.css';

const VOICE_OPTIONS = [
    { value: 'aura-2-thalia-en', label: 'Thalia (English, Female)' },
    { value: 'aura-2-luna-en', label: 'Luna (English, Female)' },
    { value: 'aura-2-stella-en', label: 'Stella (English, Female)' },
    { value: 'aura-2-athena-en', label: 'Athena (English, Female)' },
    { value: 'aura-2-hera-en', label: 'Hera (English, Female)' },
    { value: 'aura-2-orion-en', label: 'Orion (English, Male)' },
    { value: 'aura-2-arcas-en', label: 'Arcas (English, Male)' },
    { value: 'aura-2-perseus-en', label: 'Perseus (English, Male)' },
];

const LLM_OPTIONS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
    { value: 'gpt-4o', label: 'GPT-4o (Best Quality)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Economy)' },
];

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Turkish' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'multi', label: 'Multi-language' },
];

export const AgentCreate = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        systemPrompt: '',
        llmModel: 'gpt-4o-mini',
        voice: 'aura-2-thalia-en',
        sttModel: 'nova-3',
        language: 'en',
        greeting: '',
    });

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.systemPrompt.trim()) return;

        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                const agent = await res.json();
                navigate(`/agents/${agent.id}`);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create agent');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Create Agent">
            <form className="agent-form" onSubmit={handleSubmit}>
                {/* Left Column - Main Config */}
                <div className="form-main">
                    <div className="form-card">
                        <h3 className="form-card-title">General</h3>

                        <div className="form-group">
                            <label className="form-label">Agent Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Customer Support Agent"
                                value={form.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                maxLength={50}
                                required
                            />
                            <span className="char-count">{form.name.length}/50</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Language</label>
                            <select className="form-select" value={form.language} onChange={(e) => handleChange('language', e.target.value)}>
                                {LANGUAGE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-card">
                        <h3 className="form-card-title">System Prompt</h3>
                        <p className="form-card-desc">Define how your agent behaves. This is the main instruction that guides the AI's responses.</p>
                        <div className="form-group">
                            <textarea
                                className="form-textarea"
                                placeholder="You are a helpful customer support agent for [Company]. You help users with their questions about products, billing, and technical issues. Be friendly, professional, and concise."
                                value={form.systemPrompt}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                rows={10}
                                required
                            />
                            <span className="char-count">{form.systemPrompt.length} characters (min 20)</span>
                        </div>
                    </div>

                    <div className="form-card">
                        <h3 className="form-card-title">Greeting Message</h3>
                        <p className="form-card-desc">Optional first message the agent says when a call starts.</p>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Hello! How can I help you today?"
                                value={form.greeting}
                                onChange={(e) => handleChange('greeting', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column - Settings */}
                <div className="form-sidebar">
                    <div className="form-card">
                        <h3 className="form-card-title">LLM Model</h3>
                        <div className="model-options">
                            {LLM_OPTIONS.map(opt => (
                                <label key={opt.value} className={`model-option ${form.llmModel === opt.value ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="llmModel"
                                        value={opt.value}
                                        checked={form.llmModel === opt.value}
                                        onChange={() => handleChange('llmModel', opt.value)}
                                    />
                                    <div className="model-option-content">
                                        <span className="model-name">{opt.label}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-card">
                        <h3 className="form-card-title">Voice</h3>
                        <select className="form-select" value={form.voice} onChange={(e) => handleChange('voice', e.target.value)}>
                            {VOICE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="form-actions-sidebar">
                        <button type="submit" className="btn-create" disabled={saving || !form.name.trim() || form.systemPrompt.trim().length < 20}>
                            {saving ? 'Creating...' : '✦ Create Agent'}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => navigate('/agents')}>
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </DashboardLayout>
    );
};
