/**
 * Main entry point for My Voice Agent frontend
 *
 * This file initializes the voice agent application and handles:
 * - User interactions (start/stop buttons)
 * - UI updates (connection status, microphone state, audio playback)
 * - Error handling and display
 * - Audio level visualization
 */

import { AudioManager } from './audio-manager.js';

// DOM Elements
const elements = {
  startButton: document.getElementById('startButton'),
  stopButton: document.getElementById('stopButton'),
  connectionIndicator: document.getElementById('connectionIndicator'),
  connectionStatus: document.getElementById('connectionStatus'),
  microphoneIndicator: document.getElementById('microphoneIndicator'),
  microphoneStatus: document.getElementById('microphoneStatus'),
  audioIndicator: document.getElementById('audioIndicator'),
  audioStatus: document.getElementById('audioStatus'),
  errorSection: document.getElementById('errorSection'),
  errorMessage: document.getElementById('errorMessage'),
  audioLevelSection: document.getElementById('audioLevelSection'),
  bufferLevelFill: document.getElementById('bufferLevelFill'),
  bufferDepth: document.getElementById('bufferDepth'),
};

// Audio Manager instance
let audioManager = null;

/**
 * Get WebSocket URL based on environment
 */
function getWebSocketUrl() {
  // Local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'ws://localhost:3001/ws';
  }
  // Production - deployed backend URL
  return 'wss://myretell.onrender.com/ws';
}

/**
 * Initialize the application
 */
function init() {
  // Create audio manager
  audioManager = new AudioManager({
    wsUrl: getWebSocketUrl(),
    sampleRate: 16000,
    minBufferThreshold: 3,
    maxBufferThreshold: 5,
    volume: 1.0,
    onConversationStarted: handleConversationStarted,
    onConversationStopped: handleConversationStopped,
    onAudioPlaying: handleAudioPlaying,
    onAudioStopped: handleAudioStopped,
    onBufferLow: handleBufferLow,
    onBufferHigh: handleBufferHigh,
    onConnectionChange: handleConnectionChange,
    onError: handleError,
  });

  // Setup event listeners
  elements.startButton.addEventListener('click', handleStart);
  elements.stopButton.addEventListener('click', handleStop);

  // Initial UI state
  updateConnectionStatus('disconnected');
}

/**
 * Handle start button click
 */
async function handleStart() {
  try {
    elements.startButton.disabled = true;
    elements.startButton.textContent = 'Starting...';
    hideError();

    const success = await audioManager.startConversation();

    if (!success) {
      elements.startButton.disabled = false;
      elements.startButton.textContent = 'Start Conversation';
      showError('Failed to start conversation. Please check your microphone permissions.');
    }
  } catch (error) {
    console.error('Error starting conversation:', error);
    elements.startButton.disabled = false;
    elements.startButton.textContent = 'Start Conversation';
    showError(`Error: ${error.message}`);
  }
}

/**
 * Handle stop button click
 */
function handleStop() {
  audioManager.stopConversation();
}

/**
 * Handle conversation started event
 */
function handleConversationStarted() {
  elements.startButton.disabled = true;
  elements.startButton.textContent = 'Conversation Active';
  elements.stopButton.disabled = false;
  elements.microphoneIndicator.className = 'status-indicator active';
  elements.microphoneStatus.textContent = 'Active';
  elements.audioLevelSection.classList.remove('hidden');
}

/**
 * Handle conversation stopped event
 */
function handleConversationStopped() {
  elements.startButton.disabled = false;
  elements.startButton.textContent = 'Start Conversation';
  elements.stopButton.disabled = true;
  elements.microphoneIndicator.className = 'status-indicator inactive';
  elements.microphoneStatus.textContent = 'Inactive';
  elements.audioIndicator.className = 'status-indicator inactive';
  elements.audioStatus.textContent = 'Stopped';
  elements.audioLevelSection.classList.add('hidden');
  updateBufferLevel(0);
}

/**
 * Handle audio playing event
 */
function handleAudioPlaying() {
  elements.audioIndicator.className = 'status-indicator active';
  elements.audioStatus.textContent = 'Playing';
}

/**
 * Handle audio stopped event
 */
function handleAudioStopped() {
  elements.audioIndicator.className = 'status-indicator inactive';
  elements.audioStatus.textContent = 'Stopped';
}

/**
 * Handle connection state change
 */
function handleConnectionChange(state) {
  updateConnectionStatus(state);
}

/**
 * Handle buffer low warning
 */
function handleBufferLow(depth) {
  updateBufferLevel(depth);
}

/**
 * Handle buffer high warning
 */
function handleBufferHigh(depth) {
  updateBufferLevel(depth);
}

/**
 * Handle error
 */
function handleError(error) {
  console.error('Audio Manager error:', error);
  showError(error.message || 'An unexpected error occurred');
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(state) {
  elements.connectionIndicator.className = `status-indicator ${state}`;

  switch (state) {
    case 'connected':
      elements.connectionStatus.textContent = 'Connected';
      break;
    case 'connecting':
      elements.connectionStatus.textContent = 'Connecting...';
      break;
    case 'disconnected':
      elements.connectionStatus.textContent = 'Disconnected';
      break;
    default:
      elements.connectionStatus.textContent = state;
  }
}

/**
 * Update buffer level UI
 */
function updateBufferLevel(depth) {
  const percentage = Math.min((depth / 10) * 100, 100);
  elements.bufferLevelFill.style.width = `${percentage}%`;
  elements.bufferDepth.textContent = `${depth} chunks`;

  // Change color based on buffer health
  if (depth < 3) {
    elements.bufferLevelFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
  } else if (depth > 5) {
    elements.bufferLevelFill.style.background = 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)';
  } else {
    elements.bufferLevelFill.style.background = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)';
  }
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorSection.classList.add('visible');
}

/**
 * Hide error message
 */
function hideError() {
  elements.errorSection.classList.remove('visible');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
