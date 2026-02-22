import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import './Settings.css';

export const Settings = ({ user, onLogout }) => {
    const [keys, setKeys] = useState({
        openaiApiKey: '',
        anthropicApiKey: '',
        googleApiKey: '',
        groqApiKey: '',
        elevenlabsApiKey: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setKeys({
                    openaiApiKey: data.openaiApiKey || '',
                    anthropicApiKey: data.anthropicApiKey || '',
                    googleApiKey: data.googleApiKey || '',
                    groqApiKey: data.groqApiKey || '',
                });
            }
        } catch (err) {
            console.error('Failed to fetch keys', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/auth/keys', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(keys)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'API Keys updated successfully!' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Failed to update keys' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Settings">
            <div className="settings-container">
                <div className="settings-card">
                    <h2 className="settings-title">External API Keys (BYOK)</h2>
                    <p className="settings-desc">
                        Bring your own keys to use models like Claude, Gemini, and GPT-4 without relying on platform defaults.
                        Keys are stored securely and used only for your agents.
                    </p>

                    {loading ? (
                        <div className="loading-spinner"></div>
                    ) : (
                        <form className="settings-form" onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">OpenAI API Key</label>
                                <input
                                    type="password"
                                    className="vapi-input"
                                    placeholder="sk-..."
                                    value={keys.openaiApiKey}
                                    onChange={(e) => setKeys({ ...keys, openaiApiKey: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Anthropic API Key (Claude)</label>
                                <input
                                    type="password"
                                    className="vapi-input"
                                    placeholder="sk-ant-..."
                                    value={keys.anthropicApiKey}
                                    onChange={(e) => setKeys({ ...keys, anthropicApiKey: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Google AI API Key (Gemini)</label>
                                <input
                                    type="password"
                                    className="vapi-input"
                                    placeholder="AIza..."
                                    value={keys.googleApiKey}
                                    onChange={(e) => setKeys({ ...keys, googleApiKey: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Groq API Key</label>
                                <input
                                    type="password"
                                    className="vapi-input"
                                    placeholder="gsk_..."
                                    value={keys.groqApiKey}
                                    onChange={(e) => setKeys({ ...keys, groqApiKey: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">ElevenLabs API Key</label>
                                <input
                                    type="password"
                                    className="vapi-input"
                                    placeholder="your-elevenlabs-api-key"
                                    value={keys.elevenlabsApiKey}
                                    onChange={(e) => setKeys({ ...keys, elevenlabsApiKey: e.target.value })}
                                />
                            </div>

                            {message.text && (
                                <div className={`settings-message ${message.type}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="settings-actions">
                                <button type="submit" className="btn-save-vapi" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save API Keys'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};
