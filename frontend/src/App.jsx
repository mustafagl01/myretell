import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { Dashboard } from './pages/Dashboard';
import { Pricing } from './pages/Pricing';
import './index.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const handleAuthSuccess = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    if (loading) return null;

    return (
        <Router>
            <div className="app-container">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={
                        !user ? <Login onLogin={handleAuthSuccess} /> : <Navigate to="/dashboard" />
                    } />
                    <Route path="/register" element={
                        !user ? <Register onRegister={handleAuthSuccess} /> : <Navigate to="/dashboard" />
                    } />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                        user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
                    } />
                    <Route path="/pricing" element={
                        user ? <Pricing /> : <Navigate to="/login" />
                    } />

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
