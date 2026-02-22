import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { AgentList } from './pages/AgentList';
import { AgentCreate } from './pages/AgentCreate';
import { AgentDetail } from './pages/AgentDetail';
import { CallHistory } from './pages/CallHistory';
import { Analytics } from './pages/Analytics';
import { Pricing } from './pages/Pricing';
import { Settings } from './pages/Settings';
import './index.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const handleAuthSuccess = (data) => {
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#6b6b80' }}>
                Loading...
            </div>
        );
    }

    return (
        <Router>
            <div className="app-container">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={!user ? <Login onLogin={handleAuthSuccess} /> : <Navigate to="/agents" />} />
                    <Route path="/register" element={!user ? <Register onRegister={handleAuthSuccess} /> : <Navigate to="/agents" />} />

                    {/* Protected Routes */}
                    <Route path="/agents" element={user ? <AgentList user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/agents/create" element={user ? <AgentCreate user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/agents/:id" element={user ? <AgentDetail user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/history" element={user ? <CallHistory user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/analytics" element={user ? <Analytics user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/pricing" element={user ? <Pricing user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/settings" element={user ? <Settings user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />

                    {/* Dashboard redirects to agents list */}
                    <Route path="/dashboard" element={<Navigate to="/agents" />} />

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to={user ? "/agents" : "/login"} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
