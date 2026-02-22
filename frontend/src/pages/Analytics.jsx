import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import './Analytics.css';

export const Analytics = ({ user, onLogout }) => {
    const [agents, setAgents] = useState([]);
    const [allSessions, setAllSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/agents', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const agentsList = await res.json();
                setAgents(agentsList);

                const sessions = [];
                for (const agent of agentsList) {
                    const detailRes = await fetch(`/api/agents/${agent.id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (detailRes.ok) {
                        const detail = await detailRes.json();
                        if (detail.sessions) {
                            detail.sessions.forEach(s => {
                                sessions.push({ ...s, agentName: agent.name });
                            });
                        }
                    }
                }
                setAllSessions(sessions);
            }
        } catch (err) {
            console.error('Failed to fetch analytics data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate analytics
    const totalCalls = allSessions.length;
    const totalMinutes = allSessions.reduce((acc, s) => acc + (s.durationSeconds ? Math.ceil(s.durationSeconds / 60) : 0), 0);
    const totalCredits = allSessions.reduce((acc, s) => acc + (s.creditsUsed || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalMinutes / totalCalls) : 0;

    // Per-agent breakdown
    const agentStats = agents.map(agent => {
        const agentSessions = allSessions.filter(s => s.agentId === agent.id);
        return {
            name: agent.name,
            calls: agentSessions.length,
            minutes: agentSessions.reduce((a, s) => a + (s.durationSeconds ? Math.ceil(s.durationSeconds / 60) : 0), 0),
            credits: agentSessions.reduce((a, s) => a + (s.creditsUsed || 0), 0),
        };
    }).sort((a, b) => b.calls - a.calls);

    // Simple bar chart data: last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toISOString().slice(0, 10);
        const dayCalls = allSessions.filter(s => s.startTime?.slice(0, 10) === dateStr).length;
        last7Days.push({ label: dayStr, value: dayCalls });
    }
    const maxCalls = Math.max(...last7Days.map(d => d.value), 1);

    return (
        <DashboardLayout user={user} onLogout={onLogout} title="Analytics">
            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    Loading analytics...
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="analytics-kpis">
                        <div className="kpi-card">
                            <span className="kpi-label">Total Calls</span>
                            <span className="kpi-value">{totalCalls}</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">Total Minutes</span>
                            <span className="kpi-value">{totalMinutes}</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">Avg Duration</span>
                            <span className="kpi-value">{avgDuration}<span className="kpi-unit"> min</span></span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">Credits Used</span>
                            <span className="kpi-value">{totalCredits}</span>
                        </div>
                    </div>

                    <div className="analytics-grid">
                        {/* Weekly Chart */}
                        <div className="analytics-card">
                            <h3 className="analytics-card-title">Calls — Last 7 Days</h3>
                            <div className="bar-chart">
                                {last7Days.map((day, i) => (
                                    <div key={i} className="bar-col">
                                        <div className="bar-wrapper">
                                            <div
                                                className="bar"
                                                style={{ height: `${(day.value / maxCalls) * 100}%` }}
                                            >
                                                {day.value > 0 && <span className="bar-value">{day.value}</span>}
                                            </div>
                                        </div>
                                        <span className="bar-label">{day.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Agent Breakdown */}
                        <div className="analytics-card">
                            <h3 className="analytics-card-title">Agent Breakdown</h3>
                            {agentStats.length > 0 ? (
                                <div className="agent-breakdown">
                                    {agentStats.map((a, i) => (
                                        <div key={i} className="breakdown-row">
                                            <span className="breakdown-name">{a.name}</span>
                                            <div className="breakdown-stats">
                                                <span>{a.calls} calls</span>
                                                <span>{a.minutes} min</span>
                                                <span>{a.credits} credits</span>
                                            </div>
                                            <div className="breakdown-bar-bg">
                                                <div className="breakdown-bar-fill" style={{ width: `${Math.max(5, (a.calls / Math.max(totalCalls, 1)) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-data">No agents created yet</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
};
