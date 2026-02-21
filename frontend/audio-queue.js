/**
 * AudioQueue implements a FIFO queue for audio buffer management.
 *
 * This class handles:
 * - FIFO (First-In-First-Out) queuing of audio chunks
 * - Buffer depth tracking for monitoring playback health
 * - Threshold notifications for low/high buffer states
 * - Queue cleanup for stopping playback
 *
 * Buffer Strategy:
 * - Maintain 3-5 audio chunks in queue for stable playback
 * - Notify when buffer falls below minimum threshold (prevent underruns)
 * - Notify when buffer exceeds maximum threshold (prevent memory buildup)
 *
 * Queue Elements:
 * - AudioBuffer: Web Audio API decoded audio buffer
 * - Or ArrayBuffer: Raw binary audio data (before decoding)
 */
export class AudioQueue {
  /**
   * Create a new AudioQueue instance.
   *
   * @param {Object} options - Configuration options
   * @param {number} options.minThreshold - Minimum buffer threshold (default: 3)
   * @param {number} options.maxThreshold - Maximum buffer threshold (default: 5)
   * @param {Function} options.onLowBuffer - Callback when buffer falls below min threshold
   * @param {Function} options.onHighBuffer - Callback when buffer exceeds max threshold
   * @param {Function} options.onBufferChange - Callback when buffer depth changes
   */
  constructor(options = {}) {
    const {
      minThreshold = 3,
      maxThreshold = 5,
      onLowBuffer = null,
      onHighBuffer = null,
      onBufferChange = null,
    } = options;

    this.minThreshold = minThreshold;
    this.maxThreshold = maxThreshold;
    this.onLowBufferCallback = onLowBuffer;
    this.onHighBufferCallback = onHighBuffer;
    this.onBufferChangeCallback = onBufferChange;

    // FIFO queue implemented as array
    this.queue = [];

    // Track low buffer notification state
    this.lowBufferNotified = false;
  }

  /**
   * Add an audio chunk to the end of the queue.
   *
   * @param {AudioBuffer|ArrayBuffer} audioChunk - Audio data to queue
   * @returns {number} Current buffer depth after enqueue
   */
  enqueue(audioChunk) {
    this.queue.push(audioChunk);
    const depth = this.getBufferDepth();

    // Notify high buffer threshold exceeded
    if (depth > this.maxThreshold && this.onHighBufferCallback) {
      this.onHighBufferCallback(depth);
    }

    // Notify buffer change
    this._notifyBufferChange(depth);

    return depth;
  }

  /**
   * Remove and return the first audio chunk from the queue.
   *
   * @returns {AudioBuffer|ArrayBuffer|undefined} The first audio chunk, or undefined if empty
   */
  dequeue() {
    const audioChunk = this.queue.shift();
    const depth = this.getBufferDepth();

    // Notify low buffer threshold
    if (depth < this.minThreshold) {
      if (!this.lowBufferNotified && this.onLowBufferCallback) {
        this.lowBufferNotified = true;
        this.onLowBufferCallback(depth);
      }
    } else {
      // Reset low buffer notification when above threshold
      this.lowBufferNotified = false;
    }

    // Notify buffer change
    this._notifyBufferChange(depth);

    return audioChunk;
  }

  /**
   * Get the current buffer depth (number of chunks in queue).
   *
   * @returns {number} Number of audio chunks currently queued
   */
  getBufferDepth() {
    return this.queue.length;
  }

  /**
   * Peek at the first audio chunk without removing it.
   *
   * @returns {AudioBuffer|ArrayBuffer|undefined} The first audio chunk, or undefined if empty
   */
  peek() {
    return this.queue[0];
  }

  /**
   * Check if the queue is empty.
   *
   * @returns {boolean} True if queue has no chunks
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Check if the buffer is below the minimum threshold.
   *
   * @returns {boolean} True if buffer depth is below min threshold
   */
  isLowBuffer() {
    return this.getBufferDepth() < this.minThreshold;
  }

  /**
   * Check if the buffer is above the maximum threshold.
   *
   * @returns {boolean} True if buffer depth exceeds max threshold
   */
  isHighBuffer() {
    return this.getBufferDepth() > this.maxThreshold;
  }

  /**
   * Clear all audio chunks from the queue.
   *
   * This should be called when stopping playback to prevent
   * stale audio from playing.
   */
  clear() {
    this.queue = [];
    this.lowBufferNotified = false;

    // Notify buffer change
    this._notifyBufferChange(0);
  }

  /**
   * Get all chunks in the queue without removing them.
   *
   * @returns {Array} Array of all queued audio chunks
   */
  getAll() {
    return [...this.queue];
  }

  /**
   * Get queue statistics for monitoring.
   *
   * @returns {Object} Queue statistics
   * @returns {number} depth - Current buffer depth
   * @returns {boolean} isEmpty - Whether queue is empty
   * @returns {boolean} isLow - Whether buffer is below minimum threshold
   * @returns {boolean} isHigh - Whether buffer exceeds maximum threshold
   */
  getStats() {
    const depth = this.getBufferDepth();
    return {
      depth,
      isEmpty: depth === 0,
      isLow: depth < this.minThreshold,
      isHigh: depth > this.maxThreshold,
    };
  }

  /**
   * Notify buffer change callback if provided.
   * @private
   *
   * @param {number} depth - Current buffer depth
   */
  _notifyBufferChange(depth) {
    if (this.onBufferChangeCallback) {
      this.onBufferChangeCallback(depth);
    }
  }
}

export default AudioQueue;
