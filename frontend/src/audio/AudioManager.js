/**
 * AudioManager - Unified audio orchestrator for Voice Agent
 * 
 * Data Flow:
 * 1. AudioCapture gets mic audio → Int16 PCM via AudioWorklet
 * 2. WebSocket sends Int16 PCM to backend
 * 3. Backend relays to Deepgram Voice Agent API
 * 4. Deepgram responses come back as base64-encoded Linear16 PCM
 * 5. Base64 → ArrayBuffer → AudioPlayer schedules gapless playback
 */
import { AudioCapture } from './AudioCapture.js';
import { AudioPlayer } from './AudioPlayer.js';

export class AudioManager {
    constructor(options = {}) {
        this.wsUrl = options.wsUrl || 'ws://localhost:3001/ws';
        this.token = options.token || null;
        this.sampleRate = options.sampleRate || 16000;

        // Callbacks
        this.onConversationStarted = options.onConversationStarted || null;
        this.onConversationStopped = options.onConversationStopped || null;
        this.onAudioPlaying = options.onAudioPlaying || null;
        this.onAudioStopped = options.onAudioStopped || null;
        this.onConnectionChange = options.onConnectionChange || null;
        this.onError = options.onError || null;

        // State
        this.isConversationActive = false;
        this.ws = null;

        // Audio components
        this.capture = new AudioCapture({
            sampleRate: this.sampleRate,
            onAudioData: (pcmData) => this._sendAudio(pcmData),
            onError: (err) => this._handleError(err),
        });

        this.player = new AudioPlayer({
            volume: options.volume || 1.0,
            onPlaybackStart: () => { if (this.onAudioPlaying) this.onAudioPlaying(); },
            onPlaybackEnd: () => { if (this.onAudioStopped) this.onAudioStopped(); },
            onError: (err) => this._handleError(err),
        });
    }

    async startConversation() {
        if (this.isConversationActive) return true;

        try {
            // 1. Ensure audio context is running (requires user gesture)
            const running = await this.player.ensureContextRunning();
            if (!running) {
                throw new Error('AudioContext could not start. Please interact with the page first.');
            }

            // 2. Connect WebSocket
            await this._connectWebSocket();

            // 3. Start microphone capture
            await this.capture.start();

            this.isConversationActive = true;
            if (this.onConversationStarted) this.onConversationStarted();
            return true;
        } catch (err) {
            this._handleError(err);
            return false;
        }
    }

    stopConversation() {
        if (!this.isConversationActive) return;

        this.capture.stop();
        this.player.stop();
        this._disconnectWebSocket();

        this.isConversationActive = false;
        if (this.onConversationStopped) this.onConversationStopped();
    }

    // ─── WebSocket ───────────────────────────────────────

    _connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);

                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 10000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[AudioManager] WebSocket connected');
                    if (this.onConnectionChange) this.onConnectionChange('connected');

                    // Send auth token
                    console.log('[AudioManager] WebSocket open. Token present:', !!this.token);
                    if (this.token) {
                        this.ws.send(JSON.stringify({ type: 'Authenticate', data: { token: this.token } }));
                    } else {
                        console.warn('[AudioManager] No token found! Connection might be rejected by backend.');
                    }
                    resolve();
                };

                this.ws.onmessage = (event) => this._handleMessage(event);

                this.ws.onerror = (err) => {
                    console.error('[AudioManager] WebSocket error:', err);
                    if (this.onConnectionChange) this.onConnectionChange('error');
                };

                this.ws.onclose = (event) => {
                    console.log('[AudioManager] WebSocket closed:', event.code, event.reason);
                    if (this.onConnectionChange) this.onConnectionChange('disconnected');
                    if (this.isConversationActive) this.stopConversation();
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    _disconnectWebSocket() {
        if (this.ws) {
            try { this.ws.close(1000, 'Client stopping'); } catch (e) { }
            this.ws = null;
        }
    }

    _sendAudio(pcmData) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Send raw Int16 PCM as binary
            this.ws.send(pcmData.buffer);
        }
    }

    // ─── Message Handling ────────────────────────────────

    _handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            const { type, data } = message;

            if (type === 'Audio') {
                this._handleAudioData(data);
            } else if (type === 'Error') {
                const serverMessage = data?.message || 'Unknown websocket error';
                console.error('[AudioManager] Server error:', data);
                this._handleError(new Error(serverMessage));
            } else {
                console.log('[AudioManager] WS Message:', type, data ? JSON.stringify(data).substring(0, 100) : '');
            }
        } catch (err) {
            console.error('[AudioManager] Failed to parse message:', err);
        }
    }

    _handleAudioData(base64Data) {
        try {
            // Decode base64 → ArrayBuffer
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            console.log(`[AudioManager] Audio chunk received: ${bytes.length} bytes`);

            // Schedule for immediate/gapless playback
            this.player.scheduleBuffer(bytes.buffer, this.sampleRate);
        } catch (err) {
            console.error('[AudioManager] Audio decode error:', err);
        }
    }

    // ─── Utilities ───────────────────────────────────────

    _handleError(error) {
        console.error('[AudioManager] Error:', error.message);
        if (this.onError) this.onError(error);
    }

    setVolume(v) { this.player.setVolume(v); }
    getVolume() { return this.player.getVolume(); }
    getConnectionState() {
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) return 'connected';
            if (this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
        }
        return 'disconnected';
    }
    getAudioContextState() { return this.player.getContextState(); }
    get conversationActive() { return this.isConversationActive; }
    get playing() { return this.player.playing; }

    destroy() {
        this.stopConversation();
        this.player.destroy();
    }
}

export default AudioManager;
