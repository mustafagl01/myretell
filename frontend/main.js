/**
 * Main entry point for My Voice Agent frontend
 *
 * This file initializes the AudioManager on page load and wires up
 * the UI controls (Start/Stop buttons) to the audio functionality.
 *
 * Features:
 * - Initializes AudioManager on DOMContentLoaded
 * - Wires button click handlers to audioManager methods
 * - Updates UI based on audio events (connection, microphone, playback)
 * - Handles and displays errors to the user
 * - Visualizes audio buffer level
 */

import { AudioManager } from './audio-manager.js';

/**
 * UIController manages the UI state and interactions
 */
class UIController {
  constructor() {
    this.audioManager = null;
    this._initializeElements();
    this._initializeAudioManager();
    this._attachEventListeners();
  }

  /**
   * Cache DOM element references for efficient updates
   * @private
   */
  _initializeElements() {
    // Buttons
    this.startButton = document.getElementById('startButton');
    this.stopButton = document.getElementById('stopButton');

    // Status indicators
    this.connectionIndicator = document.getElementById('connectionIndicator');
    this.connectionStatus = document.getElementById('connectionStatus');
    this.microphoneIndicator = document.getElementById('microphoneIndicator');
    this.microphoneStatus = document.getElementById('microphoneStatus');
    this.audioIndicator = document.getElementById('audioIndicator');
    this.audioStatus = document.getElementById('audioStatus');

    // Audio level visualization
    this.audioLevelSection = document.getElementById('audioLevelSection');
    this.bufferLevelFill = document.getElementById('bufferLevelFill');
    this.bufferDepth = document.getElementById('bufferDepth');

    // Error display
    this.errorSection = document.getElementById('errorSection');
    this.errorMessage = document.getElementById('errorMessage');
  }

  /**
   * Initialize the AudioManager with callbacks
   * @private
   */
  _initializeAudioManager() {
    this.audioManager = new AudioManager({
      wsUrl: 'ws://localhost:3001/ws',
      sampleRate: 16000,
      minBufferThreshold: 3,
      maxBufferThreshold: 5,
      volume: 1.0,
      onConversationStarted: () => this._handleConversationStarted(),
      onConversationStopped: () => this._handleConversationStopped(),
      onAudioPlaying: () => this._handleAudioPlaying(),
      onAudioStopped: () => this._handleAudioStopped(),
      onBufferLow: (depth) => this._handleBufferLow(depth),
      onBufferHigh: (depth) => this._handleBufferHigh(depth),
      onBufferChange: (depth) => this._handleBufferChange(depth),
      onConnectionChange: (state) => this._handleConnectionChange(state),
      onError: (error) => this._handleError(error),
    });
  }

  /**
   * Attach event listeners to UI elements
   * @private
   */
  _attachEventListeners() {
    this.startButton.addEventListener('click', () => this._handleStartClick());
    this.stopButton.addEventListener('click', () => this._handleStopClick());
  }

  /**
   * Handle Start Conversation button click
   * @private
   */
  async _handleStartClick() {
    // Hide any previous errors
    this._hideError();

    // Update UI to show connecting state
    this._updateConnectionState('connecting');

    // Start the conversation
    const success = await this.audioManager.startConversation();

    if (!success) {
      this._showError('Failed to start conversation. Please check console for details.');
      this._updateConnectionState('disconnected');
    }
  }

  /**
   * Handle Stop Conversation button click
   * @private
   */
  _handleStopClick() {
    this.audioManager.stopConversation();
  }

  /**
   * Handle conversation started event
   * @private
   */
  _handleConversationStarted() {
    this.startButton.disabled = true;
    this.stopButton.disabled = false;
    this._updateMicrophoneState(true);
    this.audioLevelSection.classList.remove('hidden');
  }

  /**
   * Handle conversation stopped event
   * @private
   */
  _handleConversationStopped() {
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
    this._updateMicrophoneState(false);
    this._updateAudioPlaybackState(false);
    this.audioLevelSection.classList.add('hidden');
    this._updateConnectionState('disconnected');
  }

  /**
   * Handle audio playing event
   * @private
   */
  _handleAudioPlaying() {
    this._updateAudioPlaybackState(true);
  }

  /**
   * Handle audio stopped event
   * @private
   */
  _handleAudioStopped() {
    this._updateAudioPlaybackState(false);
  }

  /**
   * Handle connection state change
   * @private
   *
   * @param {string} state - Connection state: 'connected', 'connecting', 'disconnected'
   */
  _handleConnectionChange(state) {
    this._updateConnectionState(state);
  }

  /**
   * Handle buffer low warning
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _handleBufferLow(depth) {
    this._updateBufferLevel(depth);
  }

  /**
   * Handle buffer high warning
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _handleBufferHigh(depth) {
    this._updateBufferLevel(depth);
  }

  /**
   * Handle buffer depth change
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _handleBufferChange(depth) {
    this._updateBufferLevel(depth);
  }

  /**
   * Handle error
   * @private
   *
   * @param {Error} error - The error object
   */
  _handleError(error) {
    this._showError(error.message || 'An unknown error occurred');
  }

  /**
   * Update connection state UI
   * @private
   *
   * @param {string} state - Connection state
   */
  _updateConnectionState(state) {
    // Remove all state classes
    this.connectionIndicator.classList.remove('disconnected', 'connected', 'connecting');

    // Add new state class
    this.connectionIndicator.classList.add(state);

    // Update status text
    const statusText = {
      'connected': 'Connected',
      'connecting': 'Connecting...',
      'disconnected': 'Disconnected',
    };
    this.connectionStatus.textContent = statusText[state] || 'Unknown';
  }

  /**
   * Update microphone state UI
   * @private
   *
   * @param {boolean} isActive - Whether microphone is active
   */
  _updateMicrophoneState(isActive) {
    this.microphoneIndicator.classList.remove('inactive', 'active');
    this.microphoneIndicator.classList.add(isActive ? 'active' : 'inactive');
    this.microphoneStatus.textContent = isActive ? 'Active' : 'Inactive';
  }

  /**
   * Update audio playback state UI
   * @private
   *
   * @param {boolean} isPlaying - Whether audio is playing
   */
  _updateAudioPlaybackState(isPlaying) {
    this.audioIndicator.classList.remove('inactive', 'active');
    this.audioIndicator.classList.add(isPlaying ? 'active' : 'inactive');
    this.audioStatus.textContent = isPlaying ? 'Playing' : 'Stopped';
  }

  /**
   * Update buffer level visualization
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _updateBufferLevel(depth) {
    // Calculate fill percentage (assuming max 10 chunks for full bar)
    const maxChunks = 10;
    const percentage = Math.min((depth / maxChunks) * 100, 100);

    // Update fill width
    this.bufferLevelFill.style.width = `${percentage}%`;

    // Update chunk count text
    this.bufferDepth.textContent = `${depth} chunk${depth !== 1 ? 's' : ''}`;

    // Change color based on buffer level
    this.bufferLevelFill.style.background = depth < 3
      ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'  // Yellow for low
      : depth > 7
        ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'  // Red for high
        : 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)';  // Green for optimal
  }

  /**
   * Show error message to user
   * @private
   *
   * @param {string} message - Error message
   */
  _showError(message) {
    this.errorMessage.textContent = message;
    this.errorSection.classList.add('visible');
  }

  /**
   * Hide error message
   * @private
   */
  _hideError() {
    this.errorSection.classList.remove('visible');
  }

  /**
   * Clean up resources when page is unloaded
   */
  destroy() {
    if (this.audioManager) {
      this.audioManager.destroy();
    }
  }
}

/**
 * Initialize the application on DOMContentLoaded
 */
let uiController = null;

document.addEventListener('DOMContentLoaded', () => {
  uiController = new UIController();
});

/**
 * Clean up on page unload
 */
window.addEventListener('beforeunload', () => {
  if (uiController) {
    uiController.destroy();
  }
});
