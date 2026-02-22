/**
 * AudioCapture handles microphone audio capture using the MediaStream API.
 *
 * This class handles:
 * - Requesting microphone access via getUserMedia
 * - Capturing audio at 16000 Hz sample rate for Deepgram compatibility
 * - Handling permission errors and edge cases
 * - Starting and stopping audio capture
 * - Providing MediaStream for processing by other modules
 *
 * Audio Configuration:
 * - Sample Rate: 16000 Hz (Deepgram recommended for low latency)
 * - Channels: 1 (mono)
 * - Format: Raw PCM (linear16)
 *
 * Browser Requirements:
 * - Secure context (HTTPS or localhost) for getUserMedia
 * - User must grant microphone permission
 */
export class AudioCapture {
  /**
   * Create a new AudioCapture instance.
   *
   * @param {Object} options - Configuration options
   * @param {number} options.sampleRate - Audio sample rate in Hz (default: 16000)
   * @param {number} options.channelCount - Number of audio channels (default: 1)
   * @param {Function} options.onStreamReady - Callback when stream is ready
   * @param {Function} options.onError - Callback when error occurs
   */
  constructor(options = {}) {
    const {
      sampleRate = 16000,
      channelCount = 1,
      onStreamReady = null,
      onError = null,
    } = options;

    this.sampleRate = sampleRate;
    this.channelCount = channelCount;
    this.onStreamReadyCallback = onStreamReady;
    this.onErrorCallback = onError;

    // Audio capture state
    this.mediaStream = null;
    this.isCapturing = false;

    // Check for browser support
    this._checkBrowserSupport();
  }

  /**
   * Check if the browser supports required audio APIs.
   * @private
   * @throws {Error} If getUserMedia is not supported
   */
  _checkBrowserSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'getUserMedia is not supported in this browser. ' +
        'Please use a modern browser (Chrome, Firefox, Safari, Edge).'
      );
    }
  }

  /**
   * Check if the current context is secure.
   * @private
   * @returns {boolean} True if running in a secure context
   */
  _isSecureContext() {
    return window.isSecureContext ||
           window.location.protocol === 'https:' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }

  /**
   * Start capturing audio from the microphone.
   *
   * Requests microphone access from the user and initializes the audio stream.
   * The user must grant permission for audio capture to work.
   *
   * @returns {Promise<MediaStream>} The MediaStream if successful
   * @throws {Error} If permission is denied or access fails
   */
  async start() {
    if (this.isCapturing) {
      return this.mediaStream;
    }

    // Verify secure context
    if (!this._isSecureContext()) {
      const error = new Error(
        'Microphone access requires a secure context (HTTPS or localhost). ' +
        'Current page is not secure.'
      );
      this._handleError(error);
      throw error;
    }

    try {
      // Request microphone access with audio constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: this.channelCount,
          // Use echoCancellation and noiseSuppression for better audio quality
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.isCapturing = true;

      // Notify callback if provided
      if (this.onStreamReadyCallback) {
        this.onStreamReadyCallback(this.mediaStream);
      }

      return this.mediaStream;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  /**
   * Stop capturing audio and release the microphone.
   *
   * Stops all audio tracks in the MediaStream, releasing the microphone
   * for other applications to use.
   */
  stop() {
    if (!this.mediaStream || !this.isCapturing) {
      return;
    }

    // Stop all tracks to release the microphone
    this.mediaStream.getTracks().forEach(track => {
      track.stop();
    });

    // Clear the media stream reference
    this.mediaStream = null;
    this.isCapturing = false;
  }

  /**
   * Get the current MediaStream.
   *
   * @returns {MediaStream|null} The active MediaStream or null if not capturing
   */
  getStream() {
    return this.mediaStream;
  }

  /**
   * Check if audio capture is currently active.
   *
   * @returns {boolean} True if capturing audio
   */
  get capturing() {
    return this.isCapturing;
  }

  /**
   * Get the audio tracks from the current MediaStream.
   *
   * @returns {MediaStreamTrack[]} Array of audio tracks
   */
  getAudioTracks() {
    if (!this.mediaStream) {
      return [];
    }
    return this.mediaStream.getAudioTracks();
  }

  /**
   * Get the settings of the active audio track.
   *
   * @returns {MediaTrackSettings|null} Audio track settings or null if not capturing
   */
  getAudioSettings() {
    const tracks = this.getAudioTracks();
    if (tracks.length === 0) {
      return null;
    }
    return tracks[0].getSettings();
  }

  /**
   * Handle errors during audio capture.
   * @private
   *
   * @param {Error} error - The error that occurred
   */
  _handleError(error) {
    let userFriendlyError = error;

    // Provide user-friendly error messages for common errors
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      userFriendlyError = new Error(
        'Microphone permission was denied. ' +
        'Please allow microphone access in your browser settings and try again.'
      );
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      userFriendlyError = new Error(
        'No microphone was found on this device. ' +
        'Please connect a microphone and try again.'
      );
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      userFriendlyError = new Error(
        'Microphone is already in use by another application. ' +
        'Please close other applications using the microphone and try again.'
      );
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      userFriendlyError = new Error(
        'Microphone does not support the required audio configuration. ' +
        `Requested: ${this.sampleRate}Hz, ${this.channelCount} channel(s).`
      );
    } else if (error.name === 'NotSecureError' || error.name === 'SecurityError') {
      userFriendlyError = new Error(
        'Microphone access requires a secure context (HTTPS or localhost).'
      );
    }

    // Notify error callback if provided
    if (this.onErrorCallback) {
      this.onErrorCallback(userFriendlyError);
    }
  }
}

export default AudioCapture;
