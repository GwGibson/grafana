// Sensor appearance constants
export const SENSOR_STYLES = {
  STROKE_COLOR: {
    DARK: 'brown',
    LIGHT: 'black',
  },
  STROKE_WIDTH_RATIO: 32, // strokeWidth = radius / this value
  STROKE_WIDTH_CANVAS: 0.125, // Fixed stroke width for canvas
  FILL_OPACITY: 1,
  INACTIVE_COLOR: '#808080',
  ERROR_COLOR: 'red',
  NO_DATA_TEXT: 'No Data',
} as const;

// Color calculation percentages
export const COLOR_THRESHOLDS = {
  TEXT_OUT_OF_RANGE: 0.2,
  FILL_OUT_OF_RANGE: 0.2,
} as const;

// Performance settings
export const CACHE_LIMITS = {
  COLOR_CACHE_MAX: 10000,
  MEASUREMENT_TEXT_CACHE_MAX: 1000,
} as const;

// Canvas-specific settings
export const CANVAS_SETTINGS = {
  USE_OFFSCREEN: true,
  CONTEXT_OPTIONS: {
    alpha: true, // true for transparent background
    desynchronized: true, // Hint for better performance
  },
} as const;

export const getRenderingHelpers = () => ({
  getStrokeColor: (isDark: boolean): string => {
    return isDark ? SENSOR_STYLES.STROKE_COLOR.DARK : SENSOR_STYLES.STROKE_COLOR.LIGHT;
  },

  getStrokeWidth: (radius: number, isCanvas = false): number => {
    if (isCanvas) {
      return SENSOR_STYLES.STROKE_WIDTH_CANVAS;
    }
    return radius / SENSOR_STYLES.STROKE_WIDTH_RATIO;
  },

  getSensorPath: (x: number, y: number, radius: number, sweepFlag: number): string => {
    return `M ${x - radius} ${y} A ${radius} ${radius} 0 0 ${sweepFlag} ${x + radius} ${y} L ${x} ${y} Z`;
  },

  getRotationTransform: (rotation: number, x: number, y: number): string => {
    return `rotate(${rotation}, ${x}, ${y})`;
  },
});

export const renderingHelpers = getRenderingHelpers();
