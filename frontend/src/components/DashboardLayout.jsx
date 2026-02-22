import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardLayout.css';

export const DashboardLayout = ({ user, onLogout, title, actions, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const creditBalance = user?.creditBalance?.balance || 0;

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header" onClick={() => navigate('/agents')} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">M</div>
                    <span className="logo-text">myretell</span>
                </div>

                {/* BUILD */}
                <div className="nav-section">
                    <div className="nav-section-label">Build</div>
                    <nav className="nav-menu">
                        <button className={`nav-item ${isActive('/agents') ? 'active' : ''}`} onClick={() => navigate('/agents')}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                            Agents
                        </button>
                    </nav>
                </div>

                {/* MONITOR */}
                <div className="nav-section">
                    <div className="nav-section-label">Monitor</div>
                    <nav className="nav-menu">
                        <button className={`nav-item ${isActive('/history') ? 'active' : ''}`} onClick={() => navigate('/history')}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                            Call History
                        </button>
                        <button className={`nav-item ${isActive('/analytics') ? 'active' : ''}`} onClick={() => navigate('/analytics')}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            Analytics
                            <span className="nav-badge">New</span>
                        </button>
                    </nav>
                </div>

                {/* Account */}
                <div className="nav-section">
                    <div className="nav-section-label">Account</div>
                    <nav className="nav-menu">
                        <button className={`nav-item ${isActive('/settings') ? 'active' : ''}`} onClick={() => navigate('/settings')}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            API Keys & Settings
                        </button>
                        <button className={`nav-item ${isActive('/pricing') ? 'active' : ''}`} onClick={() => navigate('/pricing')}>
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            Credits & Plans
                        </button>
                    </nav>
                </div>

                {/* User Footer */}
                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
                        <div className="user-info">
                            <span className="user-email">{user?.email}</span>
                            <span className="user-plan">Free Plan</span>
                        </div>
                        <button className="btn-logout" onClick={onLogout} title="Logout">✕</button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="dashboard-main">
                <div className="top-bar">
                    <h1 className="page-title">{title || 'Dashboard'}</h1>
                    <div className="top-bar-actions">
                        <div className="credit-pill" onClick={() => navigate('/pricing')}>
                            <svg className="credit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {creditBalance} min
                        </div>
                        {actions}
                    </div>
                </div>
                <div className="content-area">
                    {children}
                </div>
            </main>
        </div>
    );
};
