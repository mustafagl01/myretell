import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Telephony.css';

export const Telephony = ({ user, onLogout }) => {
    const [numbers, setNumbers] = useState([]);
    const [newNumber, setNewNumber] = useState('');
    const [friendlyName, setFriendlyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchNumbers();
    }, []);

    const fetchNumbers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/telephony/numbers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNumbers(res.data);
        } catch (err) {
            console.error('Failed to fetch numbers:', err);
        }
    };

    const handleAddNumber = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/telephony/numbers`, {
                phoneNumber: newNumber,
                name: friendlyName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNewNumber('');
            setFriendlyName('');
            fetchNumbers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add number');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteNumber = async (id) => {
        if (!window.confirm('Are you sure you want to remove this number?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/telephony/numbers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNumbers();
        } catch (err) {
            alert('Failed to delete number');
        }
    };

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <div className="logo">MyRetell</div>
                <nav className="nav-menu">
                    <a href="/agents" className="nav-item">Agents</a>
                    <a href="/history" className="nav-item">History</a>
                    <a href="/telephony" className="nav-item active">Telephony</a>
                    <a href="/analytics" className="nav-item">Analytics</a>
                    <a href="/settings" className="nav-item">Settings</a>
                </nav>
                <div className="user-profile" onClick={onLogout} style={{cursor: 'pointer'}}>
                    <div className="user-avatar">{user.email[0].toUpperCase()}</div>
                    <div className="user-info">
                        <span className="user-email">{user.email}</span>
                        <span className="logout-text">Logout</span>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="content-header">
                    <h1>Telephony & Numbers</h1>
                    <p className="subtitle">Connect your own Twilio numbers or SIP trunks to your AI agents.</p>
                </header>

                <section className="telephony-grid">
                    <div className="card number-form-card">
                        <h3>Connect New Number</h3>
                        <p>Enter your Twilio phone number (E.164 format: +1234567890)</p>
                        <form onSubmit={handleAddNumber}>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input 
                                    type="text" 
                                    placeholder="+1..." 
                                    value={newNumber}
                                    onChange={(e) => setNewNumber(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Friendly Name (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Customer Support Line" 
                                    value={friendlyName}
                                    onChange={(e) => setFriendlyName(e.target.value)}
                                />
                            </div>
                            {error && <div className="error-msg">{error}</div>}
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Connecting...' : 'Connect Number'}
                            </button>
                        </form>
                    </div>

                    <div className="card numbers-list-card">
                        <h3>Your Numbers</h3>
                        <div className="numbers-table">
                            {numbers.length === 0 ? (
                                <p className="empty-state">No numbers connected yet.</p>
                            ) : (
                                numbers.map(num => (
                                    <div key={num.id} className="number-row">
                                        <div className="number-info">
                                            <span className="phone">{num.phoneNumber}</span>
                                            <span className="name">{num.name || 'Untitled Number'}</span>
                                        </div>
                                        <div className="number-status">
                                            <span className={`badge ${num.status === 'active' ? 'success' : 'warning'}`}>
                                                {num.status}
                                            </span>
                                        </div>
                                        <div className="number-actions">
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDeleteNumber(num.id)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <section className="sip-trunk-info">
                    <div className="card dark-card">
                        <h3>SIP Trunking (BETA)</h3>
                        <p>To connect your own SIP Trunk, use the following termination URI in your provider's portal:</p>
                        <code>sip:agent-id.sip.myretell.com</code>
                    </div>
                </section>
            </main>
        </div>
    );
};
