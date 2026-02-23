import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Mic,
    Bot,
    Cpu,
    Waves,
    Phone,
    Share2,
    Save,
    ChevronRight,
    Zap,
    Globe,
    Trash2
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import './AgentList.css';

export const AgentList = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('model');
    const [saveStatus, setSaveStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            const agentList = Array.isArray(data) ? data : [];
            setAgents(agentList);
            if (agentList.length > 0 && !selectedAgent) setSelectedAgent(agentList[0]);
        } catch (err) {
            console.error(err);
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaveStatus('Saving...');
        try {
            const res = await fetch(`/api/agents/${selectedAgent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(selectedAgent)
            });
            if (res.ok) {
                setSaveStatus('Success! 🎉');
                fetchAgents();
            } else {
                setSaveStatus('Error ❌');
            }
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (err) {
            setSaveStatus('Error');
        }
    };

    const handleDelete = async () => {
        if (!selectedAgent) return;
        if (!window.confirm(`Are you sure you want to delete "${selectedAgent.name}"? This cannot be undone.`)) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/agents/${selectedAgent.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (res.ok) {
                const updatedList = agents.filter(a => a.id !== selectedAgent.id);
                setAgents(updatedList);
                setSelectedAgent(updatedList.length > 0 ? updatedList[0] : null);
            } else {
                alert('Failed to delete agent');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('An error occurred while deleting');
        } finally {
            setDeleting(false);
        }
    };

    const filteredAgents = agents.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getProviderName = (model) => {
        if (!model) return 'deepgram';
        const m = model.toLowerCase();
        if (m.includes('gpt')) return 'OpenAI';
        if (m.includes('claude')) return 'Anthropic';
        if (m.includes('gemini')) return 'Google';
        if (m.includes('llama')) return 'Meta';
        return 'Deepgram';
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Assistants" hideContentPadding={true}>
            <div className="agents-page-layout">
                {/* MASTER COLUMN: Assistants List */}
                <div className="agents-sidebar">
                    <div className="agents-sidebar-header">
                        <button className="btn-save-vapi" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => navigate('/agents/create')}>
                            <Plus size={18} /> Create Assistant
                        </button>
                        <div className="search-container">
                            <Search size={16} style={{ color: '#4a4a5a', marginRight: '0.75rem' }} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search assistants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="agent-list-scroll">
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                <div className="loading-spinner"></div>
                            </div>
                        ) : filteredAgents.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#4a4a5a', fontSize: '0.875rem' }}>
                                No assistants found
                            </div>
                        ) : (
                            filteredAgents.map((a, index) => (
                                <div
                                    key={a.id}
                                    className={`agent-list-item ${selectedAgent?.id === a.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedAgent(a)}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <span className="item-name">{a.name}</span>
                                    <div className="item-meta">
                                        <Bot size={12} />
                                        <span>{getProviderName(a.llmModel)} · {a.language === 'tr' ? 'Turkish' : 'English'}</span>
                                    </div>
                                    {selectedAgent?.id === a.id && <ChevronRight size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DETAIL COLUMN: Configuration */}
                <div className="agent-detail-view">
                    {selectedAgent ? (
                        <>
                            <div className="detail-view-header">
                                <div className="agent-title-info">
                                    <h2>{selectedAgent.name}</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="agent-id-tag">{selectedAgent.id}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></div>
                                            Active
                                        </span>
                                    </div>
                                </div>
                                <div className="header-actions">
                                    <button className="btn-test" onClick={() => navigate(`/agents/${selectedAgent.id}`)}>
                                        <Phone size={16} /> Test Assistant
                                    </button>
                                    <button className="btn-save-vapi" onClick={handleSave} disabled={!!saveStatus}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {saveStatus ? <span>{saveStatus}</span> : (
                                                <>
                                                    <Save size={16} />
                                                    <span>Publish Changes</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                    <button className="btn-delete-vapi" onClick={handleDelete} disabled={deleting} title="Delete Assistant">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="vapi-tabs">
                                <button className={`vapi-tab ${activeTab === 'model' ? 'active' : ''}`} onClick={() => setActiveTab('model')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Cpu size={16} /> Model
                                    </div>
                                </button>
                                <button className={`vapi-tab ${activeTab === 'voice' ? 'active' : ''}`} onClick={() => setActiveTab('voice')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Waves size={16} /> Voice
                                    </div>
                                </button>
                                <button className={`vapi-tab ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Globe size={16} /> Transcriber
                                    </div>
                                </button>
                            </div>

                            <div className="detail-pannel">
                                <div className="vapi-stats-grid">
                                    <div className="vapi-stat-card">
                                        <div className="stat-header">
                                            <span>Efficiency Score</span>
                                            <span>94%</span>
                                        </div>
                                        <div className="stat-bar-bg">
                                            <div className="stat-bar-fill" style={{ width: '94%', background: 'linear-gradient(90deg, #10b981, #6366f1)' }}></div>
                                        </div>
                                    </div>
                                    <div className="vapi-stat-card">
                                        <div className="stat-header">
                                            <span>Avg. Latency</span>
                                            <span>420ms</span>
                                        </div>
                                        <div className="stat-bar-bg">
                                            <div className="stat-bar-fill" style={{ width: '30%', background: 'linear-gradient(90deg, #34d399, #10b981)' }}></div>
                                        </div>
                                    </div>
                                </div>

                                {activeTab === 'model' && (
                                    <div className="vapi-form-section">
                                        <div className="vapi-field">
                                            <label>First Message (Greeting)</label>
                                            <input
                                                className="vapi-input"
                                                placeholder="Hello! How can I help you today?"
                                                value={selectedAgent.greeting || ''}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, greeting: e.target.value })}
                                            />
                                        </div>
                                        <div className="vapi-field">
                                            <label>Intelligence Provider (LLM)</label>
                                            <select
                                                className="vapi-input"
                                                value={selectedAgent.llmModel}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, llmModel: e.target.value })}
                                            >
                                                <optgroup label="⚡ Google Gemini">
                                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Powerful)</option>
                                                </optgroup>
                                                <optgroup label="🏆 OpenAI">
                                                    <option value="gpt-4o">GPT-4o (Standard)</option>
                                                    <option value="gpt-4o-mini">GPT-4o Mini (Economic)</option>
                                                </optgroup>
                                                <optgroup label="✨ Anthropic Claude">
                                                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                                                </optgroup>
                                                <optgroup label="🆓 Deepgram Native">
                                                    <option value="llama-3.1-70b-instruct">Deepgram Llama 3.1 (Free Tier)</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="vapi-field">
                                            <label>System Instructions (Prompt)</label>
                                            <textarea
                                                className="vapi-textarea"
                                                placeholder="Define how the assistant should behave..."
                                                value={selectedAgent.systemPrompt}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'voice' && (
                                    <div className="vapi-form-section">
                                        <div className="vapi-field">
                                            <label>Voice Synthesis Engine</label>
                                            <select
                                                className="vapi-input"
                                                value={selectedAgent.ttsModel || 'deepgram'}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, ttsModel: e.target.value })}
                                            >
                                                <option value="deepgram">Deepgram Aura (Ultra Low Latency)</option>
                                                <option value="eleven_turbo_v3">ElevenLabs Turbo v3 (High Quality)</option>
                                                <option value="eleven_multilingual_v2">ElevenLabs Multilingual v2</option>
                                            </select>
                                        </div>
                                        <div className="vapi-field">
                                            <label>Active Voice Persona</label>
                                            <select
                                                className="vapi-input"
                                                value={selectedAgent.voice}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, voice: e.target.value })}
                                            >
                                                <optgroup label="Deepgram Aura">
                                                    <option value="aura-2-thalia-en">Thalia (Default)</option>
                                                    <option value="aura-2-orion-en">Orion (Confident)</option>
                                                </optgroup>
                                                <optgroup label="ElevenLabs Premium">
                                                    <option value="cgS8vJhk66vDX8O6m62a">Serena (Natural Female)</option>
                                                    <option value="nPczCAnBy9noDW9As69E">Brian (Professional Male)</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'advanced' && (
                                    <div className="vapi-form-section">
                                        <div className="vapi-field">
                                            <label>STT Provider (Transcription)</label>
                                            <select
                                                className="vapi-input"
                                                value={selectedAgent.sttModel}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, sttModel: e.target.value })}
                                            >
                                                <option value="nova-2">Deepgram Nova-2 (Stable & Fast)</option>
                                                <option value="whisper-1">OpenAI Whisper (Turkish Support)</option>
                                            </select>
                                        </div>
                                        <div className="vapi-field">
                                            <label>Primary Language</label>
                                            <select
                                                className="vapi-input"
                                                value={selectedAgent.language}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, language: e.target.value })}
                                            >
                                                <option value="tr">Turkish (TR)</option>
                                                <option value="en">English (US)</option>
                                                <option value="es">Spanish</option>
                                                <option value="fr">French</option>
                                                <option value="de">German</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div style={{ textAlign: 'center' }}>
                                <Zap size={48} style={{ color: '#4a4a5a', marginBottom: '1.5rem', opacity: 0.5 }} />
                                <p>Select an assistant from the list to begin configuration</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};
