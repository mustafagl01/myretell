import React from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import './Dashboard.css';

export const Dashboard = ({ user: initialUser, onLogout }) => {
    const [user, setUser] = React.useState(initialUser);
    const [activePage, setActivePage] = React.useState('agent');
    const [sessionDuration, setSessionDuration] = React.useState(0);
    const [sessionCost, setSessionCost] = React.useState(0);
    const {
        isActive,
        connectionState,
        isAudioPlaying,
        error,
        start,
        stop
    } = useVoiceAssistant();

    React.useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                    localStorage.setItem('user', JSON.stringify(data));
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };

        fetchProfile();
        const interval = setInterval(fetchProfile, 30000);
        return () => clearInterval(interval);
    }, []);

    // Real-time session cost meter
    React.useEffect(() => {
        if (!isActive) {
            setSessionDuration(0);
            setSessionCost(0);
            return;
        }

        const interval = setInterval(() => {
            setSessionDuration(prev => {
                const newDuration = prev + 1;
                const cost = (newDuration / 60) * 0.20;
                setSessionCost(Math.round(cost * 100) / 100);
                return newDuration;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const creditBalance = parseFloat(user?.creditBalance?.balance || 0);

    return (
        <div className="dashboard-layout">
            {/* ═══ Sidebar ═══ */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo-icon">M</div>
                    <span className="logo-text">myretell</span>
                </div>

                {/* BUILD section */}
                <div className="nav-section">
                    <div className="nav-section-label">Build</div>
                    <nav className="nav-menu">
                        <button
                            className={`nav-item ${activePage === 'agent' ? 'active' : ''}`}
                            onClick={() => setActivePage('agent')}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                            Voice Agent
                        </button>
                        <button className="nav-item" onClick={() => window.location.href = '/pricing'}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            Credits & Plans
                        </button>
                    </nav>
                </div>

                {/* MONITOR section */}
                <div className="nav-section">
                    <div className="nav-section-label">Monitor</div>
                    <nav className="nav-menu">
                        <button className="nav-item" onClick={() => window.location.href = '/call-history'}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                            Call History
                        </button>
                        <button className="nav-item">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            Chat History
                        </button>
                        <button className="nav-item">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 20V10" />
                                <path d="M12 20V4" />
                                <path d="M6 20v-6" />
                            </svg>
                            Analytics
                            <span className="nav-badge new">New</span>
                        </button>
                    </nav>
                </div>

                {/* SETTINGS section */}
                <div className="nav-section">
                    <div className="nav-section-label">Settings</div>
                    <nav className="nav-menu">
                        <button className="nav-item">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                            Configuration
                        </button>
                    </nav>
                </div>

                {/* User Profile Footer */}
                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
                        <div className="user-info">
                            <span className="user-email">{user?.email}</span>
                            <span className="user-balance">${creditBalance.toFixed(2)} balance</span>
                        </div>
                        <button className="btn-logout" onClick={onLogout}>✕</button>
                    </div>
                </div>
            </aside>

            {/* ═══ Main Content ═══ */}
            <main className="dashboard-main">
                {/* Top Bar */}
                <div className="top-bar">
                    <h1 className="page-title">Voice Agent</h1>
                    <div className="top-bar-actions">
                        <div className="credit-pill" onClick={() => window.location.href = '/pricing'}>
                            <svg className="credit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                            ${creditBalance.toFixed(2)} balance
                        </div>
                        <button className="btn-upgrade" onClick={() => window.location.href = '/pricing'}>
                            Top Up
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="content-area">
                    {/* Quick Stats */}
                    <div className="quick-stats">
                        <div className="quick-stat-card">
                            <div className="quick-stat-header">
                                <span className="quick-stat-label">Balance</span>
                                <div className="quick-stat-icon green">💰</div>
                            </div>
                            <div className="quick-stat-value">${creditBalance.toFixed(2)}</div>
                            <span className="quick-stat-change">$0.20/min rate</span>
                        </div>
                        <div className="quick-stat-card">
                            <div className="quick-stat-header">
                                <span className="quick-stat-label">Status</span>
                                <div className="quick-stat-icon blue">⚡</div>
                            </div>
                            <div className="quick-stat-value" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
                                {connectionState === 'connected' ? 'Live' : 'Standby'}
                            </div>
                            <span className="quick-stat-change" style={{ color: connectionState === 'connected' ? '#6ee7b7' : '#6b6b80' }}>
                                {connectionState}
                            </span>
                        </div>
                        <div className="quick-stat-card">
                            <div className="quick-stat-header">
                                <span className="quick-stat-label">Model</span>
                                <div className="quick-stat-icon purple">🧠</div>
                            </div>
                            <div className="quick-stat-value" style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>Nova-3</div>
                            <span className="quick-stat-change" style={{ color: '#c4b5fd' }}>Deepgram</span>
                        </div>
                        <div className="quick-stat-card">
                            <div className="quick-stat-header">
                                <span className="quick-stat-label">Est. Minutes</span>
                                <div className="quick-stat-icon amber">⏱</div>
                            </div>
                            <div className="quick-stat-value">{Math.floor(creditBalance / 0.20)}</div>
                            <span className="quick-stat-change" style={{ color: '#fcd34d' }}>min remaining</span>
                        </div>
                    </div>

                    {/* Main Grid: Agent + Activity */}
                    <div className="main-grid">
                        {/* Agent Card */}
                        <div className="agent-card">
                            <div className="agent-card-header">
                                <span className="agent-card-title">Live Agent Console</span>
                                <div className={`agent-status ${isActive ? 'active' : ''}`}>
                                    <div className="status-dot"></div>
                                    {isActive ? 'Session Active' : 'Ready'}
                                </div>
                            </div>

                            <div className={`agent-stage ${isActive ? 'session-active' : ''}`}>
                                <div className="visualizer-container">
                                    <div className="voice-rings">
                                        <div className="voice-ring"></div>
                                        <div className="voice-ring"></div>
                                        <div className="voice-ring"></div>
                                    </div>
                                    <div className={`voice-glow ${isAudioPlaying ? 'playing' : ''}`}></div>
                                    <div className="agent-avatar">
                                        <svg viewBox="0 0 100 100" className="avatar-svg">
                                            <circle cx="50" cy="50" r="45" className="outer-circle" />
                                            <circle cx="50" cy="50" r="28" className="inner-circle" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Real-time session meter */}
                                {isActive && (
                                    <div className="session-live-meter">
                                        <div className="meter-row">
                                            <span className="meter-label">⏱ Duration:</span>
                                            <span className="meter-value">{formatTime(sessionDuration)}</span>
                                        </div>
                                        <div className="meter-row cost-row">
                                            <span className="meter-label">💰 Cost:</span>
                                            <span className="meter-value cost">${sessionCost.toFixed(2)}</span>
                                        </div>
                                        <div className="meter-row">
                                            <span className="meter-label">💵 Remaining:</span>
                                            <span className="meter-value">${(creditBalance - sessionCost).toFixed(2)}</span>
                                        </div>
                                        <div className="meter-rate">$0.20 per minute</div>
                                    </div>
                                )}

                                <div className="agent-controls">
                                    {!isActive ? (
                                        <button className="btn-action start" onClick={start}>
                                            ▶ Start Talking
                                        </button>
                                    ) : (
                                        <button className="btn-action stop" onClick={stop}>
                                            ■ End Session
                                        </button>
                                    )}
                                    {!isActive && <span className="session-hint">Click to begin a voice session</span>}
                                </div>

                                {error && <div className="error-bar">{error}</div>}
                            </div>

                            <div className="agent-meta">
                                <div className="meta-item">
                                    <span className="meta-label">Connection</span>
                                    <span className={`meta-value ${connectionState}`}>{connectionState}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">STT Engine</span>
                                    <span className="meta-value">Deepgram Nova-3</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">TTS Engine</span>
                                    <span className="meta-value">Deepgram Aura</span>
                                </div>
                            </div>
                        </div>

                        {/* Activity Panel */}
                        <div className="activity-panel">
                            <div className="activity-header">
                                <span className="activity-title">Recent Activity</span>
                                <button className="activity-filter" onClick={() => window.location.href = '/call-history'}>View All</button>
                            </div>
                            <div className="activity-list">
                                {user?.creditBalance ? (
                                    <>
                                        <div className="activity-item">
                                            <div className="activity-icon credit">💳</div>
                                            <div className="activity-content">
                                                <div className="activity-text">Account created with ${creditBalance.toFixed(2)} free balance</div>
                                                <div className="activity-time">Today</div>
                                            </div>
                                        </div>
                                        <div className="activity-item">
                                            <div className="activity-icon system">⚙️</div>
                                            <div className="activity-content">
                                                <div className="activity-text">Voice Agent configured — Nova-3 STT + Aura TTS</div>
                                                <div className="activity-time">Today</div>
                                            </div>
                                        </div>
                                        <div className="activity-item">
                                            <div className="activity-icon call">🎙️</div>
                                            <div className="activity-content">
                                                <div className="activity-text">Ready for your first voice session</div>
                                                <div className="activity-time">Now</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="activity-empty">
                                        <div className="activity-empty-icon">📋</div>
                                        No activity yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
