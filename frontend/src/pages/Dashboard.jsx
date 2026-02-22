import React from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import './Dashboard.css';

export const Dashboard = ({ user: initialUser, onLogout }) => {
    const [user, setUser] = React.useState(initialUser);
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
        // Refresh balance periodically
        const interval = setInterval(fetchProfile, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="logo">myretell</div>
                <nav className="nav-menu">
                    <a href="/dashboard" className="active">Agent</a>
                    <a href="/pricing">Credits & Plans</a>
                    <a href="/history">History</a>
                </nav>
                <div className="user-profile">
                    <div className="avatar">{user.email[0].toUpperCase()}</div>
                    <div className="user-info">
                        <span className="email">{user.email}</span>
                        <button className="btn-logout" onClick={onLogout}>Logout</button>
                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>Voice Agent</h2>
                    <div className="credit-badge">
                        <span className="label">Balance</span>
                        <span className="value">{user.creditBalance?.balance || 0} min</span>
                    </div>
                </header>

                <section className="agent-stage">
                    <div className={`agent-status ${isActive ? 'active' : ''}`}>
                        <div className="status-dot"></div>
                        {isActive ? 'Session Active' : 'Ready to Start'}
                    </div>

                    <div className="visualizer-container">
                        <div className={`voice-glow ${isAudioPlaying ? 'playing' : ''}`}></div>
                        <div className="agent-avatar">
                            <svg viewBox="0 0 100 100" className="avatar-svg">
                                <circle cx="50" cy="50" r="45" className="outer-circle" />
                                <circle cx="50" cy="50" r="30" className="inner-circle" />
                            </svg>
                        </div>
                    </div>

                    <div className="agent-ui-controls">
                        {!isActive ? (
                            <button className="btn-action start" onClick={start}>
                                Start Talking
                            </button>
                        ) : (
                            <button className="btn-action stop" onClick={stop}>
                                Stop Session
                            </button>
                        )}
                    </div>

                    {error && <div className="error-bar">{error}</div>}
                </section>

                <section className="stats-row">
                    <div className="stat-card">
                        <span className="stat-label">Connection</span>
                        <span className={`stat-value ${connectionState}`}>{connectionState}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Model</span>
                        <span className="stat-value">gpt-4o-mini</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Latency</span>
                        <span className="stat-value">120ms</span>
                    </div>
                </section>
            </main>
        </div>
    );
};
