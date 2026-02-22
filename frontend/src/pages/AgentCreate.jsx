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
    { value: 'deepgram-default', label: 'Deepgram Default (Fastest / Free)' },
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
];

export const AgentCreate = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        systemPrompt: '',
        llmModel: 'deepgram-default',
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
                setError(data.error || 'Failed to create agent');
            }
        } catch (err) {
            setError('Network error. Please try again.');
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
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">System Prompt</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Instructions for the agent..."
                                value={form.systemPrompt}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Greeting (Optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Hello, I am your agent..."
                                value={form.greeting}
                                onChange={(e) => handleChange('greeting', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

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

                    <div className="form-actions">
                        <button type="submit" className="btn-create" disabled={saving}>
                            {saving ? 'Creating...' : '+ Create Agent'}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => navigate('/agents')}>
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
            {error && <div className="form-error-sticky">{error}</div>}
        </DashboardLayout>
    );
};
