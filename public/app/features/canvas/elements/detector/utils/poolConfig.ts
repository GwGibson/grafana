/**
 * Centralized configuration for memory pool settings
 * All magic numbers and constants related to pooling and buffers
 */

export const POOL_CONFIG = {
  /**
   * Maximum total capacity for all sensors across all networks
   * This is the hard limit for memory allocation
   */
  MAX_SENSOR_CAPACITY: 20000,

  /**
   * Initial size for the conversion buffer used when converting arrays to Float32Array
   * Will grow dynamically if needed
   */
  INITIAL_CONVERSION_BUFFER_SIZE: 1000,

  /**
   * Multiplier for buffer cleanup threshold
   * Buffers are cleaned up when we have this many times more buffers than active networks
   */
  BUFFER_CLEANUP_THRESHOLD_MULTIPLIER: 2,

  /**
   * Maximum number of hexagons expected (used for pre-allocation in future)
   */
  MAX_HEXAGONS: 3,
} as const;

// Default values for detector configuration
export const DETECTOR_DEFAULTS = {
  /**
   * Default color bar range values
   */
  COLOR_RANGE: {
    MIN: -1,
    MAX: 1,
  },

  /**
   * Default color bar type
   */
  COLOR_BAR: 'coolwarm',
} as const;

// Performance tuning
export const PERFORMANCE_CONFIG = {
  /**
   * Whether to use offscreen canvas for rendering
   */
  USE_OFFSCREEN_CANVAS: true,

  /**
   * Whether to batch sensor updates
   */
  BATCH_SENSOR_UPDATES: true,

  /**
   * Number of sensors to process per batch
   */
  SENSOR_BATCH_SIZE: 100,
} as const;

// Debugging and development
export const DEBUG_CONFIG = {
  /**
   * Enable detailed memory usage logging
   */
  LOG_MEMORY_STATS: false,

  /**
   * Enable performance timing logs
   */
  LOG_PERFORMANCE: false,

  /**
   * Warn when approaching capacity limits
   */
  WARN_AT_CAPACITY_PERCENTAGE: 0.9,
} as const;

export const isApproachingCapacity = (currentCount: number): boolean => {
  return currentCount >= POOL_CONFIG.MAX_SENSOR_CAPACITY * DEBUG_CONFIG.WARN_AT_CAPACITY_PERCENTAGE;
};
