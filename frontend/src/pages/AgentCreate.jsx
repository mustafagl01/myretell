import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import './AgentCreate.css';

const LLM_OPTIONS = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fastest)', provider: 'google' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Premium)', provider: 'anthropic' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Ultra-fast)', provider: 'groq' },
];

const VOICE_OPTIONS = [
    { value: 'aura-2-thalia-en', label: 'Thalia (Female) - Deepgram', provider: 'deepgram' },
    { value: 'aura-2-orion-en', label: 'Orion (Male) - Deepgram', provider: 'deepgram' },
    { value: 'cgS8vJhk66vDX8O6m62a', label: 'Serena (Female) - ElevenLabs', provider: 'elevenlabs' },
    { value: 'nPczCAnBy9noDW9As69E', label: 'Brian (Male) - ElevenLabs', provider: 'elevenlabs' },
    { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Female) - ElevenLabs v3', provider: 'elevenlabs' },
];

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Turkish' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
];

export const AgentCreate = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        systemPrompt: '',
        llmModel: 'gemini-2.0-flash',
        voice: 'aura-2-thalia-en',
        sttModel: 'nova-3',
        language: 'en',
        greeting: '',
    });

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const isFormValid = form.name.trim().length >= 3 && form.systemPrompt.trim().length >= 10;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isFormValid) {
            setError('System prompt must be at least 10 characters and Name at least 3.');
            return;
        }

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

            const data = await res.json();
            if (res.ok) {
                navigate(`/agents/${data.id}`);
            } else {
                setError(data.error || data.message || 'Failed to create agent');
            }
        } catch (err) {
            setError('Network error. Please check your connection.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Create New Agent">
            <form className="agent-form" onSubmit={handleSubmit}>
                <div className="form-main">
                    <div className="form-card">
                        <h3 className="form-card-title">General Information</h3>
                        <div className="form-group">
                            <label className="form-label">Agent Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. My Helpful Assistant"
                                value={form.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                minLength={3}
                                maxLength={50}
                                required
                            />
                            <span className="char-count">{form.name.length}/50</span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">System Prompt</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Define how the agent should behave. Minimum 10 characters..."
                                value={form.systemPrompt}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                minLength={10}
                                required
                            />
                            <span className={`char-count ${form.systemPrompt.length < 10 ? 'error' : 'success'}`}>
                                {form.systemPrompt.length} characters (min 10)
                            </span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Greeting (Optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Hello, I am your voice assistant. How can I help?"
                                value={form.greeting}
                                onChange={(e) => handleChange('greeting', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-sidebar">
                    <div className="form-card">
                        <h3 className="form-card-title">LLM Model</h3>
                        <p className="form-card-desc">Choose the brain of your agent.</p>
                        <div className="model-options" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {LLM_OPTIONS.map(opt => (
                                <label key={opt.value} className={`model-option ${form.llmModel === opt.value ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="llmModel"
                                        value={opt.value}
                                        checked={form.llmModel === opt.value}
                                        onChange={() => handleChange('llmModel', opt.value)}
                                    />
                                    <span className="model-name">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-card">
                        <h3 className="form-card-title">Voice & Language</h3>
                        <div className="form-group">
                            <label className="form-label">Language</label>
                            <select className="form-select" value={form.language} onChange={(e) => handleChange('language', e.target.value)}>
                                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Voice</label>
                            <select className="form-select" value={form.voice} onChange={(e) => handleChange('voice', e.target.value)}>
                                {VOICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-actions-sidebar">
                        <button type="submit" className="btn-create" disabled={saving}>
                            {saving ? 'Creating...' : '+ Create Agent'}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => navigate('/agents')}>
                            Cancel
                        </button>
                    </div>

                    {error && <div className="form-error" style={{ marginTop: '1rem' }}>{error}</div>}
                </div>
            </form>
        </DashboardLayout>
    );
};
