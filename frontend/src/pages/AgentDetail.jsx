import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import './AgentDetail.css';

const VOICE_OPTIONS = [
    { value: 'aura-2-thalia-en', label: 'Thalia (Female) - Deepgram' },
    { value: 'aura-2-orion-en', label: 'Orion (Male) - Deepgram' },
    { value: 'cgS8vJhk66vDX8O6m62a', label: 'Serena (Female) - ElevenLabs Premium' },
    { value: 'nPczCAnBy9noDW9As69E', label: 'Brian (Male) - ElevenLabs Premium' },
    { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Female) - ElevenLabs v3' },
];

const STT_OPTIONS = [
    { value: 'nova-3', label: 'Deepgram Nova-3 (Fastest)' },
    { value: 'whisper-1', label: 'OpenAI Whisper-1 (Accurate)' },
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

const LLM_OPTIONS = [
    { value: 'deepgram-default', label: 'Deepgram Default (Free / Testing)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fastest)' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Premium)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Groq)' },
];

export const AgentDetail = ({ user, onLogout }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [activeTab, setActiveTab] = useState('config');

    const {
        isActive,
        connectionState,
        isAudioPlaying,
        error,
        start,
        stop
    } = useVoiceAssistant({ agentId: id });

    useEffect(() => {
        fetchAgent();
    }, [id]);

    const fetchAgent = async () => {
        try {
            const res = await fetch(`/api/agents/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgent(data);
                setEditForm({
                    name: data.name,
                    systemPrompt: data.systemPrompt,
                    llmModel: data.llmModel,
                    voice: data.voice,
                    language: data.language || 'en',
                    sttModel: data.sttModel || 'nova-3',
                    greeting: data.greeting || '',
                });
            } else {
                navigate('/agents');
            }
        } catch (err) {
            console.error('Failed to fetch agent:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch(`/api/agents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                const updated = await res.json();
                setAgent(prev => ({ ...prev, ...updated }));
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            console.error('Failed to save agent:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this agent? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await fetch(`/api/agents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            navigate('/agents');
        } catch (err) {
            console.error('Failed to delete agent:', err);
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout user={user} onLogout={onLogout} title="Agent">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    Loading agent...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            user={user}
            onLogout={onLogout}
            title={agent?.name || 'Agent'}
            actions={
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
                    </button>
                    <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                        {deleting ? '...' : 'Delete'}
                    </button>
                </div>
            }
        >
            {/* Tabs */}
            <div className="detail-tabs">
                <button className={`tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
                    Configuration
                </button>
                <button className={`tab ${activeTab === 'test' ? 'active' : ''}`} onClick={() => setActiveTab('test')}>
                    Test Console
                </button>
                <button className={`tab ${activeTab === 'embed' ? 'active' : ''}`} onClick={() => setActiveTab('embed')}>
                    Embed Code
                </button>
                <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    Sessions
                </button>
            </div>

            {/* Config Tab */}
            {activeTab === 'config' && (
                <div className="detail-grid">
                    <div className="detail-main">
                        <div className="form-card">
                            <h3 className="form-card-title">System Prompt</h3>
                            <textarea
                                className="form-textarea"
                                value={editForm.systemPrompt || ''}
                                onChange={(e) => setEditForm(p => ({ ...p, systemPrompt: e.target.value }))}
                                rows={14}
                            />
                        </div>
                        <div className="form-card">
                            <h3 className="form-card-title">Greeting Message</h3>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Optional greeting when call starts"
                                value={editForm.greeting || ''}
                                onChange={(e) => setEditForm(p => ({ ...p, greeting: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="detail-sidebar">
                        <div className="form-card">
                            <h3 className="form-card-title">Agent Name</h3>
                            <input
                                type="text"
                                className="form-input"
                                value={editForm.name || ''}
                                onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div className="form-card">
                            <h3 className="form-card-title">LLM Model</h3>
                            <select className="form-select" value={editForm.llmModel} onChange={(e) => setEditForm(p => ({ ...p, llmModel: e.target.value }))}>
                                {LLM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-card">
                            <h3 className="form-card-title">Voice</h3>
                            <select className="form-select" value={editForm.voice} onChange={(e) => setEditForm(p => ({ ...p, voice: e.target.value }))}>
                                {VOICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-card">
                            <h3 className="form-card-title">Transcriber (STT)</h3>
                            <select className="form-select" value={editForm.sttModel} onChange={(e) => setEditForm(p => ({ ...p, sttModel: e.target.value }))}>
                                {STT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-card">
                            <h3 className="form-card-title">Language</h3>
                            <select className="form-select" value={editForm.language} onChange={(e) => setEditForm(p => ({ ...p, language: e.target.value }))}>
                                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="form-card">
                            <div className="agent-meta-info">
                                <div className="meta-row">
                                    <span className="meta-k">Created</span>
                                    <span className="meta-v">{new Date(agent.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-k">Sessions</span>
                                    <span className="meta-v">{agent._count?.sessions || 0}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-k">STT</span>
                                    <span className="meta-v">{agent.sttModel || 'Deepgram Nova-3'}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-k">Status</span>
                                    <span className="meta-v" style={{ color: agent.status === 'active' ? '#6ee7b7' : '#f87171' }}>{agent.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Console Tab */}
            {activeTab === 'test' && (
                <div className="test-console">
                    <div className="test-stage">
                        <div className={`test-status ${isActive ? 'active' : ''}`}>
                            <div className="status-dot"></div>
                            {isActive ? 'Session Active' : 'Ready to Test'}
                        </div>

                        <div className="test-visualizer">
                            <div className={`test-ring ${isActive ? 'pulse' : ''}`}></div>
                            <div className={`test-ring r2 ${isActive ? 'pulse' : ''}`}></div>
                            <div className={`test-glow ${isAudioPlaying ? 'playing' : ''}`}></div>
                            <div className="test-avatar">
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
                                    <circle cx="50" cy="50" r="28" fill="#6366f1" />
                                </svg>
                            </div>
                        </div>

                        <div className="test-controls">
                            {!isActive ? (
                                <button className="btn-test-start" onClick={start}>
                                    ▶ Start Test Call
                                </button>
                            ) : (
                                <button className="btn-test-stop" onClick={stop}>
                                    ■ End Call
                                </button>
                            )}
                        </div>

                        {error && <div className="test-error">{error}</div>}

                        <div className="test-info">
                            <span>Connection: <b className={connectionState}>{connectionState}</b></span>
                            <span>Agent: <b>{agent.name}</b></span>
                            <span>Voice: <b>{VOICE_OPTIONS.find(v => v.value === agent.voice)?.label || agent.voice}</b></span>
                        </div>
                    </div>
                </div>
            )}

            {/* Embed Code Tab */}
            {activeTab === 'embed' && (
                <div className="embed-section">
                    <div className="form-card">
                        <h3 className="form-card-title">Embed Widget</h3>
                        <p className="form-card-desc">Copy this code and paste it into your website's HTML to add a voice agent widget.</p>
                        <div className="embed-code-block">
                            <pre className="embed-code">{`<script src="https://myretell.vercel.app/widget.js" 
  data-agent-id="${agent.id}">
</script>`}</pre>
                            <button className="btn-copy" onClick={() => {
                                navigator.clipboard.writeText(`<script src="https://myretell.vercel.app/widget.js" data-agent-id="${agent.id}"></script>`);
                            }}>
                                📋 Copy
                            </button>
                        </div>
                    </div>
                    <div className="form-card">
                        <h3 className="form-card-title">How it works</h3>
                        <div className="embed-steps">
                            <div className="embed-step">
                                <span className="step-num">1</span>
                                <span>Copy the embed code above</span>
                            </div>
                            <div className="embed-step">
                                <span className="step-num">2</span>
                                <span>Paste it before the closing <code>&lt;/body&gt;</code> tag</span>
                            </div>
                            <div className="embed-step">
                                <span className="step-num">3</span>
                                <span>A floating voice button will appear on your website</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'history' && (
                <div className="sessions-section">
                    {agent.sessions && agent.sessions.length > 0 ? (
                        <div className="agents-table-wrapper">
                            <table className="agents-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Duration</th>
                                        <th>Credits Used</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agent.sessions.map(s => (
                                        <tr key={s.id}>
                                            <td>{new Date(s.startTime).toLocaleString()}</td>
                                            <td>{s.durationSeconds ? `${Math.ceil(s.durationSeconds / 60)} min` : '—'}</td>
                                            <td>{s.creditsUsed || 0}</td>
                                            <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3>No sessions yet</h3>
                            <p>Test your agent to create session records</p>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
};
