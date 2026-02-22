import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioManager } from '../../_legacy/audio-manager.js';

const getWsUrl = (agentId) => {
    const base = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? 'wss://myretell.onrender.com/ws'
        : 'ws://localhost:3001/ws';

    if (agentId) {
        return `${base}?agentId=${agentId}`;
    }
    return base;
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

        // Initialize AudioManager
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
        if (audioManagerRef.current) {
            const success = await audioManagerRef.current.startConversation();
            return success;
        }
        return false;
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
