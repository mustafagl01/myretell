import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import './AgentList.css';

export const AgentList = ({ user, onLogout }) => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgents(data);
            }
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const modelLabels = {
        'nova-3': 'Nova-3',
        'gpt-4o-mini': 'GPT-4o Mini',
        'aura-2-thalia-en': 'Thalia',
    };

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="All Agents"
            actions={
                <button className="btn-primary" onClick={() => navigate('/agents/create')}>
                    + Create an Agent
                </button>
            }
        >
            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    Loading agents...
                </div>
            ) : agents.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎙️</div>
                    <h3>No agents yet</h3>
                    <p>Create your first voice agent to get started</p>
                    <button className="btn-primary btn-lg" onClick={() => navigate('/agents/create')}>
                        + Create an Agent
                    </button>
                </div>
            ) : (
                <div className="agents-table-wrapper">
                    <table className="agents-table">
                        <thead>
                            <tr>
                                <th>Agent Name</th>
                                <th>Language</th>
                                <th>LLM</th>
                                <th>Voice</th>
                                <th>Sessions</th>
                                <th>Last Edited</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => (
                                <tr key={agent.id} onClick={() => navigate(`/agents/${agent.id}`)} className="agent-row">
                                    <td>
                                        <div className="agent-name-cell">
                                            <div className="agent-avatar-sm">🎙️</div>
                                            <span className="agent-name">{agent.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="lang-badge">{agent.language.toUpperCase()}</span>
                                    </td>
                                    <td className="text-muted">{modelLabels[agent.llmModel] || agent.llmModel}</td>
                                    <td className="text-muted">{modelLabels[agent.ttsModel] || agent.ttsModel}</td>
                                    <td className="text-muted">{agent._count?.sessions || 0}</td>
                                    <td className="text-muted">{formatDate(agent.updatedAt)}</td>
                                    <td>
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}>
                                            →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
};
