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
            setAgents(data);
            if (data.length > 0) setSelectedAgent(data[0]);
        } catch (err) {
            console.error(err);
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
            <div className="content-area">
                {/* MIDDLE COLUMN: Assistants List */}
                <div className="agents-sidebar">
                    <div className="agents-sidebar-header">
                        <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/agents/create')}>
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
                                    <span className="item-meta">{a.llmModel === 'deepgram-default' ? 'deepgram' : 'openai'} · {a.voice.split('-')[1]}</span>
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
                                            <label>System Prompt</label>
                                            <textarea
                                                className="vapi-textarea"
                                                value={selectedAgent.systemPrompt}
                                                onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                                            />
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
