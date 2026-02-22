import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import './CallHistory.css';

export const CallHistory = ({ user, onLogout }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            // Fetch all agents to get their sessions
            const res = await fetch('/api/agents', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const agents = await res.json();
                // Fetch detail for each agent to get sessions
                const allSessions = [];
                for (const agent of agents) {
                    const detailRes = await fetch(`/api/agents/${agent.id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (detailRes.ok) {
                        const detail = await detailRes.json();
                        if (detail.sessions) {
                            detail.sessions.forEach(s => {
                                allSessions.push({ ...s, agentName: agent.name });
                            });
                        }
                    }
                }
                // Sort by date descending
                allSessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
                setSessions(allSessions);
            }
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationSeconds ? Math.ceil(s.durationSeconds / 60) : 0), 0);
    const totalCredits = sessions.reduce((acc, s) => acc + (s.creditsUsed || 0), 0);

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Call History">
            {/* Summary Cards */}
            <div className="history-stats">
                <div className="history-stat-card">
                    <span className="history-stat-label">Total Calls</span>
                    <span className="history-stat-value">{sessions.length}</span>
                </div>
                <div className="history-stat-card">
                    <span className="history-stat-label">Total Minutes</span>
                    <span className="history-stat-value">{totalMinutes}</span>
                </div>
                <div className="history-stat-card">
                    <span className="history-stat-label">Credits Used</span>
                    <span className="history-stat-value">{totalCredits}</span>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    Loading call history...
                </div>
            ) : sessions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📞</div>
                    <h3>No calls yet</h3>
                    <p>Start a conversation with one of your agents to see history here</p>
                </div>
            ) : (
                <div className="agents-table-wrapper">
                    <table className="agents-table">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Date</th>
                                <th>Duration</th>
                                <th>Credits Used</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <span className="agent-tag">{s.agentName || 'Default'}</span>
                                    </td>
                                    <td>{new Date(s.startTime).toLocaleString()}</td>
                                    <td>{s.durationSeconds ? `${Math.ceil(s.durationSeconds / 60)} min` : '—'}</td>
                                    <td>{s.creditsUsed || 0}</td>
                                    <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
};
