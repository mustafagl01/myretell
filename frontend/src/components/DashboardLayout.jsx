import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Mic,
    LayoutDashboard,
    History,
    BarChart3,
    Settings as SettingsIcon,
    CreditCard,
    LogOut,
    Zap,
    Menu,
    X
} from 'lucide-react';
import './DashboardLayout.css';

export const DashboardLayout = ({ user, onLogout, title, actions, children, hideContentPadding = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // Safety check for user and credit balance
    const creditBalance = user?.creditBalance?.balance || 0;

    const isActive = (path) => {
        if (path === '/agents' && location.pathname === '/') return true;
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { label: 'Assistants', icon: Mic, path: '/agents', section: 'Build' },
        { label: 'Call History', icon: History, path: '/history', section: 'Monitor' },
        { label: 'Analytics', icon: BarChart3, path: '/analytics', section: 'Monitor', badge: 'New' },
        { label: 'API Keys & Settings', icon: SettingsIcon, path: '/settings', section: 'Account' },
        { label: 'Credits & Plans', icon: CreditCard, path: '/pricing', section: 'Account' },
    ];

    const sections = ['Build', 'Monitor', 'Account'];

    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [location.pathname]);

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${isMobileNavOpen ? 'open' : ''}`}>
                <div className="sidebar-header" onClick={() => navigate('/agents')} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">M</div>
                    <span className="logo-text">myretell</span>
                </div>

                {sections.map(section => (
                    <div className="nav-section" key={section}>
                        <div className="nav-section-label">{section}</div>
                        <nav className="nav-menu">
                            {navItems.filter(item => item.section === section).map(item => (
                                <button
                                    key={item.path}
                                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileNavOpen(false);
                                    }}
                                >
                                    <item.icon className="nav-icon" size={18} />
                                    {item.label}
                                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                                </button>
                            ))}
                        </nav>
                    </div>
                ))}

                {/* User Footer */}
                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
                        <div className="user-info">
                            <span className="user-email">{user?.email || 'User'}</span>
                            <span className="user-plan">Free Plan</span>
                        </div>
                        <button className="btn-logout" onClick={onLogout} title="Logout">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="dashboard-main">
                <header className="top-bar">
                    <div className="top-bar-left">
                        <button
                            className="mobile-nav-toggle"
                            onClick={() => setIsMobileNavOpen((open) => !open)}
                            aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        >
                            {isMobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                        <h1 className="page-title">{title || 'Dashboard'}</h1>
                    </div>
                    <div className="top-bar-actions">
                        <div className="credit-pill" onClick={() => navigate('/pricing')}>
                            <Zap size={14} fill="#6ee7b7" stroke="#6ee7b7" style={{ opacity: 0.8 }} />
                            <span>{Number(creditBalance).toFixed(0)} min</span>
                        </div>
                        {actions}
                    </div>
                </header>

                <div className={`content-area ${hideContentPadding ? 'no-padding' : ''}`}>
                    {children}
                </div>
            </main>

            {isMobileNavOpen && <button className="sidebar-overlay" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation" />}
        </div>
    );
};
