import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import './AgentList.css';

export const AgentList = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('model');
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            
            // Defensive check: Ensure data is an array
            const agentList = Array.isArray(data) ? data : [];
            setAgents(agentList);
            if (agentList.length > 0) setSelectedAgent(agentList[0]);
        } catch (err) {
            console.error(err);
            setAgents([]); // Reset to empty array on error
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
            if (res.ok) setSaveStatus('Saved!');
            else setSaveStatus('Error saving');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (err) {
            setSaveStatus('Error');
        }
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Assistants" hideContentPadding={true}>
            <div className="agents-page-layout">
                {/* MIDDLE COLUMN: Assistants List */}
                <div className="agents-sidebar">
                <div className="agents-sidebar-header">
                    <button className="btn-save-vapi" style={{ width: '100%' }} onClick={() => navigate('/agents/create')}>
                        Create Assistant +
                    </button>
                    <div className="search-container">
                        <input type="text" className="search-input" placeholder="Search Assistants..." />
                    </div>
                </div>
                <div className="agent-list-scroll">
                    {loading ? <div className="loading-spinner"></div> :
                        agents.map(a => (
                            <div
                                key={a.id}
                                className={`agent-list-item ${selectedAgent?.id === a.id ? 'selected' : ''}`}
                                onClick={() => setSelectedAgent(a)}
                            >
                                <span className="item-name">{a.name}</span>
                                <span className="item-meta">
                                    {a.llmModel.startsWith('gpt') ? 'openai' :
                                        a.llmModel.startsWith('claude') ? 'anthropic' :
                                            a.llmModel.startsWith('gemini') ? 'google' :
                                                a.llmModel.startsWith('llama') ? 'groq' : 'deepgram'} · {a.sttModel === 'whisper-1' ? 'openai' : 'deepgram'}
                                </span>
                            </div>
                        ))}
                </div>
            </div>

                {/* RIGHT COLUMN: Detail View */}
                <div className="agent-detail-view">
                {selectedAgent ? (
                    <>
                        <div className="detail-view-header">
                            <div className="agent-title-info">
                                <h2>{selectedAgent.name}</h2>
                                <span className="agent-id-tag">{selectedAgent.id}</span>
                            </div>
                            <div className="header-actions">
                                <button className="btn-test" onClick={() => navigate(`/agents/${selectedAgent.id}`)}>
                                    Talk to Assistant 📞
                                </button>
                                <button className="btn-save-vapi" onClick={handleSave}>
                                    {saveStatus || 'Publish'}
                                </button>
                            </div>
                        </div>

                        <div className="vapi-tabs">
                            <button className={`vapi-tab ${activeTab === 'model' ? 'active' : ''}`} onClick={() => setActiveTab('model')}>Model</button>
                            <button className={`vapi-tab ${activeTab === 'voice' ? 'active' : ''}`} onClick={() => setActiveTab('voice')}>Voice</button>
                            <button className={`vapi-tab ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>Transcriber</button>
                        </div>

                        <div className="detail-pannel">
                            <div className="vapi-stats-grid">
                                <div className="vapi-stat-card">
                                    <div className="stat-header">
                                        <span>Cost</span>
                                        <span>~$0.16/min</span>
                                    </div>
                                    <div className="stat-bar-bg">
                                        <div className="stat-bar-fill" style={{ width: '40%', background: 'linear-gradient(90deg, #f59e0b, #6366f1)' }}></div>
                                    </div>
                                </div>
                                <div className="vapi-stat-card">
                                    <div className="stat-header">
                                        <span>Latency</span>
                                        <span>~800ms</span>
                                    </div>
                                    <div className="stat-bar-bg">
                                        <div className="stat-bar-fill" style={{ width: '60%', background: 'linear-gradient(90deg, #ef4444, #10b981)' }}></div>
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'model' && (
                                <div className="vapi-form-section">
                                    <div className="vapi-field">
                                        <label>First Message</label>
                                        <input
                                            className="vapi-input"
                                            value={selectedAgent.greeting || ''}
                                            onChange={(e) => setSelectedAgent({ ...selectedAgent, greeting: e.target.value })}
                                        />
                                    </div>
                                    <div className="vapi-field">
                                        <label>LLM Model</label>
                                        <select
                                            className="vapi-input"
                                            value={selectedAgent.llmModel}
                                            onChange={(e) => setSelectedAgent({ ...selectedAgent, llmModel: e.target.value })}
                                        >
                                            <optgroup label="⚡ Google Gemini">
                                                <option value="gemini-3.0-flash">Gemini 3.0 Flash (En Hızlı)</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Güçlü)</option>
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Dengeli)</option>
                                                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Ekonomik)</option>
                                            </optgroup>
                                            <optgroup label="🏆 OpenAI">
                                                <option value="gpt-5.2">GPT-5.2 (En Gelişmiş)</option>
                                                <option value="gpt-5.1">GPT-5.1 (Premium)</option>
                                                <option value="gpt-4.1">GPT-4.1 (Stabil)</option>
                                                <option value="gpt-4o">GPT-4o (Standard)</option>
                                                <option value="gpt-4o-mini">GPT-4o Mini (Ekonomik)</option>
                                            </optgroup>
                                            <optgroup label="✨ Anthropic Claude">
                                                <option value="claude-sonnet-4.6">Claude Sonnet 4.6 (En İyi Kalite)</option>
                                                <option value="claude-sonnet-4.5">Claude Sonnet 4.5 (Premium)</option>
                                                <option value="claude-haiku-4">Claude Haiku 4 (Hızlı & Ucuz)</option>
                                                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Klasik)</option>
                                            </optgroup>
                                            <optgroup label="🦙 Meta Llama (Groq)">
                                                <option value="llama-4-scout">Llama 4 Scout (Ultra Hızlı)</option>
                                                <option value="llama-3.3-70b">Llama 3.3 70B</option>
                                                <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Klasik)</option>
                                            </optgroup>
                                            <optgroup label="🆓 Deepgram">
                                                <option value="deepgram-default">Deepgram Default (Ücretsiz Test)</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div className="vapi-field">
                                        <label>System Prompt</label>
                                        <textarea
                                            className="vapi-textarea"
                                            value={selectedAgent.systemPrompt}
                                            onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'voice' && (
                                <div className="vapi-form-section">
                                    <div className="vapi-field">
                                        <label>TTS Engine (Premium Marketplace)</label>
                                        <select
                                            className="vapi-input"
                                            value={selectedAgent.ttsModel || 'deepgram'}
                                            onChange={(e) => setSelectedAgent({ ...selectedAgent, ttsModel: e.target.value })}
                                        >
                                            <optgroup label="Deepgram (Stable & Fast)">
                                                <option value="deepgram">Deepgram Aura 2 (Recommended)</option>
                                            </optgroup>
                                            <optgroup label="ElevenLabs (Premium)">
                                                <option value="eleven_turbo_v3">Turbo v3 (Best - 250ms)</option>
                                                <option value="eleven_multilingual_v2">Multilingual v2 (Natural)</option>
                                            </optgroup>
                                            <optgroup label="Specialty Providers (Coming Soon)">
                                                <option value="playht_2_turbo" disabled>PlayHT 2.0 Turbo (Fast)</option>
                                                <option value="azure-neural" disabled>Azure Speech Neural</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div className="vapi-field">
                                        <label>Select Voice</label>
                                        <select
                                            className="vapi-input"
                                            value={selectedAgent.voice}
                                            onChange={(e) => setSelectedAgent({ ...selectedAgent, voice: e.target.value })}
                                        >
                                            <optgroup label="ElevenLabs">
                                                <option value="cgS8vJhk66vDX8O6m62a">Serena (Female)</option>
                                                <option value="nPczCAnBy9noDW9As69E">Brian (Male)</option>
                                                <option value="pFZP5JQG7iQjIQuC4Bku">Lily (Female)</option>
                                            </optgroup>
                                            <optgroup label="Deepgram (Economy)">
                                                <option value="aura-2-thalia-en">Thalia</option>
                                                <option value="aura-2-orion-en">Orion</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'advanced' && (
                                <div className="vapi-form-section">
                                    <div className="vapi-field">
                                        <label>Transcriber Engine (STT)</label>
                                        <select
                                            className="vapi-input"
                                            value={selectedAgent.sttModel}
                                            onChange={(e) => setSelectedAgent({ ...selectedAgent, sttModel: e.target.value })}
                                        >
                                            <option value="nova-3">Deepgram Nova-3 (Winner - 200ms)</option>
                                            <option value="whisper-1">OpenAI Whisper v3 (Accuracy - 500ms)</option>
                                            <option value="azure-speech" disabled>Azure Speech (Coming Soon)</option>
                                            <option value="assembly-ai" disabled>AssemblyAI (Coming Soon)</option>
                                        </select>
                                    </div>
                                    <div className="vapi-field">
                                        <label>Language Detection</label>
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
                                            <option value="it">Italian</option>
                                            <option value="pt">Portuguese</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">Select an assistant to configure</div>
                )}
                </div>
            </div>
        </DashboardLayout>
    );
};
