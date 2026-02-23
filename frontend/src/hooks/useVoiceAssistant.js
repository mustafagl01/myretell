import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioManager } from '../audio/AudioManager.js';

const BACKEND_WS_BASE = 'wss://myretell.onrender.com/ws';
const BACKEND_HEALTH_URL = 'https://myretell.onrender.com/api/health';

const getWsUrl = (agentId) => {
    const base = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? BACKEND_WS_BASE
        : 'ws://localhost:3001/ws';

    if (agentId) {
        return `${base}?agentId=${agentId}`;
    }
    return base;
};

/** Wake Render backend (cold start) before opening WebSocket; wait so server is ready. */
const wakeBackend = async () => {
    if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;
    try {
        console.log('[WakeBackend] Pinging health endpoint...');
        await fetch(BACKEND_HEALTH_URL, { method: 'GET', mode: 'cors' });
        // Give backend ~3s to be ready for WebSocket upgrade (Render cold start)
        console.log('[WakeBackend] Health check OK, waiting 3s for warmup...');
        await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
        console.warn('[WakeBackend] Health check failed:', err);
    }
};

export const useVoiceAssistant = (options = {}) => {
    const {
        agentId = null,
        sampleRate = 16000,
    } = options;

    const wsUrl = getWsUrl(agentId);

    const [isActive, setIsActive] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [error, setError] = useState(null);

    const audioManagerRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        audioManagerRef.current = new AudioManager({
            wsUrl,
            token,
            sampleRate,
            onConversationStarted: () => setIsActive(true),
            onConversationStopped: () => setIsActive(false),
            onAudioPlaying: () => setIsAudioPlaying(true),
            onAudioStopped: () => setIsAudioPlaying(false),
            onConnectionChange: (state) => setConnectionState(state),
            onError: (err) => setError(err.message || 'An audio error occurred'),
        });

        return () => {
            if (audioManagerRef.current) {
                audioManagerRef.current.destroy();
            }
        };
    }, [wsUrl, sampleRate]);

    const start = useCallback(async () => {
        setError(null);
        if (!audioManagerRef.current) return false;
        // Use latest token (in case it was refreshed)
        audioManagerRef.current.setToken(localStorage.getItem('token'));
        // Wake Render backend before opening WebSocket (avoids 1005 on cold start)
        await wakeBackend();
        const success = await audioManagerRef.current.startConversation();
        return success;
    }, []);

    const stop = useCallback(() => {
        if (audioManagerRef.current) {
            audioManagerRef.current.stopConversation();
        }
    }, []);

    return {
        isActive,
        connectionState,
        isAudioPlaying,
        error,
        start,
        stop
    };
};
