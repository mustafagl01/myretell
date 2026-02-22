/**
 * Modern AudioCapture using AudioWorklet API
 * Falls back to ScriptProcessorNode if AudioWorklet is not available.
 */
export class AudioCapture {
    constructor(options = {}) {
        this.sampleRate = options.sampleRate || 16000;
        this.onAudioData = options.onAudioData || null;
        this.onStreamReady = options.onStreamReady || null;
        this.onError = options.onError || null;

        this.mediaStream = null;
        this.audioContext = null;
        this.source = null;
        this.workletNode = null;
        this.scriptProcessor = null;
        this.isCapturing = false;
        this._useWorklet = true;
    }

    async start() {
        if (this.isCapturing) return this.mediaStream;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioCtx({ sampleRate: this.sampleRate });
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Try AudioWorklet first, fall back to ScriptProcessor
            if (this._useWorklet && this.audioContext.audioWorklet) {
                try {
                    await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
                    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor');

                    this.workletNode.port.onmessage = (event) => {
                        if (event.data.type === 'audio' && this.onAudioData) {
                            this.onAudioData(new Int16Array(event.data.data));
                        }
                    };

                    this.source.connect(this.workletNode);
                    this.workletNode.connect(this.audioContext.destination);
                    console.log('[AudioCapture] Using AudioWorklet (modern)');
                } catch (workletErr) {
                    console.warn('[AudioCapture] AudioWorklet failed, falling back to ScriptProcessor:', workletErr.message);
                    this._setupScriptProcessor();
                }
            } else {
                this._setupScriptProcessor();
            }

            this.isCapturing = true;

            if (this.onStreamReady) {
                this.onStreamReady(this.mediaStream);
            }

            return this.mediaStream;
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }

    _setupScriptProcessor() {
        const bufferSize = 4096;
        this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        this.source.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);

        this.scriptProcessor.onaudioprocess = (event) => {
            const float32 = event.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            if (this.onAudioData) {
                this.onAudioData(int16);
            }
        };
        console.log('[AudioCapture] Using ScriptProcessor (fallback)');
    }

    stop() {
        if (this.source) { try { this.source.disconnect(); } catch (e) { } this.source = null; }
        if (this.workletNode) { try { this.workletNode.disconnect(); } catch (e) { } this.workletNode = null; }
        if (this.scriptProcessor) { try { this.scriptProcessor.disconnect(); } catch (e) { } this.scriptProcessor = null; }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => { });
            this.audioContext = null;
        }
        this.isCapturing = false;
    }

    _handleError(error) {
        let msg = error.message;
        if (error.name === 'NotAllowedError') msg = 'Microphone permission denied. Please allow microphone access.';
        else if (error.name === 'NotFoundError') msg = 'No microphone found. Please connect a microphone.';
        else if (error.name === 'NotReadableError') msg = 'Microphone in use by another app.';

        if (this.onError) this.onError(new Error(msg));
    }

    get capturing() { return this.isCapturing; }
}
