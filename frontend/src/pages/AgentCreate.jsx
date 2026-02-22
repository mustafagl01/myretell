import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import './AgentCreate.css';

const LLM_OPTIONS = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Seçim: Hız + Fiyat)', provider: 'google' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Premium: En İyi Kalite)', provider: 'anthropic' },
    { value: 'gpt-4o', label: 'OpenAI GPT-4o (Standard)', provider: 'openai' },
    { value: 'gpt-4o-mini', label: 'OpenAI GPT-4o-mini (Economy)', provider: 'openai' },
    { value: 'llama-3.1-70b-versatile', label: 'Groq Llama 3.1 (Ultra-fast)', provider: 'groq' },
    { value: 'deepgram-default', label: 'Deepgram Default (Test / Free)', provider: 'deepgram' },
];

const STT_OPTIONS = [
    { value: 'nova-3', label: 'Deepgram Nova-3 (Seçim: Gecikme + Kalite)', provider: 'deepgram' },
    { value: 'whisper-1', label: 'OpenAI Whisper v3 (Alternatif: 99 Dil)', provider: 'openai' },
    { value: 'azure-speech', label: 'Azure Speech Neural (Hız: 400ms)', provider: 'azure' },
    { value: 'assembly-ai', label: 'AssemblyAI Best (Doğruluk: 94%)', provider: 'assembly' },
];

const STACK_TTS_OPTIONS = [
    { value: 'eleven_turbo_v3', label: 'ElevenLabs Turbo v3 (Seçim: En Doğal)', provider: 'elevenlabs' },
    { value: 'eleven_multilingual_v2', label: 'ElevenLabs Multilingual v2', provider: 'elevenlabs' },
    { value: 'playht_2_turbo', label: 'PlayHT 2.0 Turbo (Hızlı: 350ms)', provider: 'playht' },
    { value: 'aura-2-thalia-en', label: 'Deepgram Aura 2 (Budget: Çok Ucuz)', provider: 'deepgram' },
    { value: 'azure-neural', label: 'Azure Neural (75 Dil)', provider: 'azure' },
];

const VOICE_OPTIONS = [
    { value: 'cgS8vJhk66vDX8O6m62a', label: 'Serena (Female) - ElevenLabs', provider: 'elevenlabs' },
    { value: 'nPczCAnBy9noDW9As69E', label: 'Brian (Male) - ElevenLabs', provider: 'elevenlabs' },
    { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Female) - ElevenLabs', provider: 'elevenlabs' },
    { value: 'aura-2-thalia-en', label: 'Thalia (Female) - Deepgram', provider: 'deepgram' },
    { value: 'aura-2-orion-en', label: 'Orion (Male) - Deepgram', provider: 'deepgram' },
];

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English (US)' },
    { value: 'tr', label: 'Turkish (TR)' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
];

export const AgentCreate = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        systemPrompt: '',
        llmModel: 'gemini-2.0-flash',
        ttsModel: 'eleven_turbo_v3',
        voice: 'cgS8vJhk66vDX8O6m62a',
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
                            <label className="form-label">TTS Engine (Seçim Tablosu)</label>
                            <select className="form-select" value={form.ttsModel} onChange={(e) => handleChange('ttsModel', e.target.value)}>
                                {STACK_TTS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Select Voice</label>
                            <select className="form-select" value={form.voice} onChange={(e) => handleChange('voice', e.target.value)}>
                                {VOICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Transcriber Engine (STT)</label>
                            <select className="form-select" value={form.sttModel} onChange={(e) => handleChange('sttModel', e.target.value)}>
                                {STT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
