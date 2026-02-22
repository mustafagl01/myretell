/**
 * AudioPlayer - Web Audio API playback for raw Linear16 PCM.
 * Handles PCM → AudioBuffer conversion and gapless scheduling.
 */
export class AudioPlayer {
    constructor(options = {}) {
        this.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));
        this.onPlaybackStart = options.onPlaybackStart || null;
        this.onPlaybackEnd = options.onPlaybackEnd || null;
        this.onError = options.onError || null;

        this.audioContext = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.scheduledSources = [];
        this.nextStartTime = 0;

        this._initContext();
    }

    _initContext() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioCtx();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.volume;
            this.gainNode.connect(this.audioContext.destination);
        } catch (err) {
            console.error('[AudioPlayer] Failed to create AudioContext:', err);
        }
    }

    async ensureContextRunning() {
        if (!this.audioContext) this._initContext();
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (err) {
                if (this.onError) this.onError(new Error('Failed to resume AudioContext'));
                return false;
            }
        }
        return this.audioContext.state === 'running';
    }

    /**
     * Convert raw Linear16 PCM ArrayBuffer to AudioBuffer
     */
    _pcmToAudioBuffer(pcmData, sampleRate) {
        let int16;
        if (pcmData instanceof ArrayBuffer) {
            int16 = new Int16Array(pcmData);
        } else if (pcmData instanceof Int16Array) {
            int16 = pcmData;
        } else if (pcmData instanceof Uint8Array) {
            int16 = new Int16Array(pcmData.buffer);
        } else {
            throw new Error('Invalid PCM data format');
        }

        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 0x8000;
        }

        const audioBuffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
        audioBuffer.getChannelData(0).set(float32);
        return audioBuffer;
    }

    /**
     * Schedule audio buffer for gapless playback.
     */
    scheduleBuffer(audioData, sampleRate = 16000) {
        if (!this.audioContext) return null;

        try {
            const audioBuffer = this._pcmToAudioBuffer(audioData, sampleRate);
            if (!audioBuffer || audioBuffer.length === 0) return null;

            const now = this.audioContext.currentTime;
            const startTime = this.nextStartTime > now ? this.nextStartTime : now;
            const duration = audioBuffer.duration;

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.gainNode);
            source.start(startTime);

            this.scheduledSources.push(source);
            this.nextStartTime = startTime + duration;

            source.onended = () => {
                const idx = this.scheduledSources.indexOf(source);
                if (idx > -1) this.scheduledSources.splice(idx, 1);

                if (this.scheduledSources.length === 0) {
                    this.isPlaying = false;
                    if (this.onPlaybackEnd) this.onPlaybackEnd();
                }
            };

            if (!this.isPlaying) {
                this.isPlaying = true;
                if (this.onPlaybackStart) this.onPlaybackStart();
            }

            return { startTime, duration };
        } catch (err) {
            console.error('[AudioPlayer] scheduleBuffer error:', err);
            if (this.onError) this.onError(err);
            return null;
        }
    }

    stop() {
        this.scheduledSources.forEach(s => { try { s.stop(); } catch (e) { } });
        this.scheduledSources = [];
        this.isPlaying = false;
        this.nextStartTime = 0;
        if (this.onPlaybackEnd) this.onPlaybackEnd();
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.gainNode) this.gainNode.gain.value = this.volume;
    }

    getVolume() { return this.volume; }
    getContextState() { return this.audioContext?.state ?? 'unknown'; }
    get playing() { return this.isPlaying; }

    destroy() {
        this.stop();
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => { });
        }
    }
}
