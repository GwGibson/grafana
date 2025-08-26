import { getColor } from '../colorbar/colorbar';
import { DetectorColorData } from '../detector';

export interface PooledSensorData {
  // Static properties (set once)
  id: string;
  scaledPosition: Float32Array; // [x, y] as typed array
  unscaledPosition: Float32Array; // [x, y] as typed array
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
  radius: number;

  // Dynamic properties (updated frequently)
  channel: number;
  displayMode: boolean;
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;
}

/**
 * Pool for sensor data to minimize allocations during updates
 */
export class SensorDataPool {
  private sensors: PooledSensorData[];
  private activeSensorCount = 0;
  private readonly maxCapacity: number;

  // Pre-allocated string pool for common color values
  private colorCache: Map<string, string> = new Map();

  constructor(maxCapacity: number) {
    this.maxCapacity = maxCapacity;

    // Pre-allocate all sensor objects
    this.sensors = new Array(maxCapacity);

    for (let i = 0; i < maxCapacity; i++) {
      this.sensors[i] = {
        id: '',
        scaledPosition: new Float32Array(2),
        unscaledPosition: new Float32Array(2),
        rotation: 0,
        sweepFlag: 0,
        isDark: false,
        radius: 0,
        channel: -1,
        displayMode: false,
        isActive: false,
        fillColor: '',
        text: '',
        textFillColor: '',
      };
    }
  }


  getMaxCapacity(): number {
    return this.maxCapacity;
  }

  /**
   * Initialize sensor static properties (called once during setup)
   */
  initializeSensor(
    index: number,
    id: string,
    scaledX: number,
    scaledY: number,
    unscaledX: number,
    unscaledY: number,
    rotation: number,
    sweepFlag: number,
    isDark: boolean,
    radius: number,
    channel: number,
    displayMode: boolean
  ): void {
    if (index >= this.sensors.length) {
      console.warn(`SensorDataPool: Cannot initialize sensor at index ${index}, exceeds capacity ${this.maxCapacity}`);
      return;
    }

    const sensor = this.sensors[index];
    sensor.id = id;
    sensor.scaledPosition[0] = scaledX;
    sensor.scaledPosition[1] = scaledY;
    sensor.unscaledPosition[0] = unscaledX;
    sensor.unscaledPosition[1] = unscaledY;
    sensor.rotation = rotation;
    sensor.sweepFlag = sweepFlag;
    sensor.isDark = isDark;
    sensor.radius = radius;
    sensor.channel = channel;
    sensor.displayMode = displayMode;
  }

  /**
   * Batch update sensor measurements (called frequently)
   * Optimized to minimize string allocations
   */
  updateSensorMeasurements(
    measurements: Float32Array,
    colorData: DetectorColorData,
    displayMode: boolean,
    sensorCount: number
  ): void {
    const TEXT_OUT_OF_RANGE_PERCENTAGE = 0.2;
    const FILL_OUT_OF_RANGE_PERCENTAGE = 0.2;
    const { colorBar, minMeasurement, maxMeasurement } = colorData;

    const effectiveSensorCount = Math.min(sensorCount, this.maxCapacity);

    if (sensorCount > this.maxCapacity) {
      console.warn(`SensorDataPool: Truncating sensors from ${sensorCount} to ${this.maxCapacity}`);
    }

    for (let i = 0; i < effectiveSensorCount; i++) {
      const sensor = this.sensors[i];

      // Sensor channels are 1-based but measurements 0-based
      const measurementIndex = sensor.channel - 1;
      const isActive = measurementIndex >= 0 && measurementIndex < measurements.length;

      sensor.isActive = isActive;

      const colorKey = `${measurementIndex}_${colorBar}_${minMeasurement}_${maxMeasurement}_${TEXT_OUT_OF_RANGE_PERCENTAGE}`;
      let fillColor = this.colorCache.get(colorKey);

      if (!fillColor) {
        fillColor = getColor(
          measurements,
          measurementIndex,
          colorBar,
          minMeasurement,
          maxMeasurement,
          TEXT_OUT_OF_RANGE_PERCENTAGE
        );
        // Cache the color string
        this.colorCache.set(colorKey, fillColor);
      }

      sensor.fillColor = fillColor;

      // Only update text properties in display mode
      if (displayMode) {
        if (isActive) {
          // Format measurement text (reuse string when possible)
          const value = measurements[measurementIndex];
          sensor.text = this.formatMeasurement(value);

          const textColorKey = `${measurementIndex}_${colorBar}_${minMeasurement}_${maxMeasurement}_${FILL_OUT_OF_RANGE_PERCENTAGE}`;
          let textFillColor = this.colorCache.get(textColorKey);

          if (!textFillColor) {
            textFillColor = getColor(
              measurements,
              measurementIndex,
              colorBar,
              minMeasurement,
              maxMeasurement,
              FILL_OUT_OF_RANGE_PERCENTAGE
            );
            this.colorCache.set(textColorKey, textFillColor);
          }

          sensor.textFillColor = textFillColor;
        } else {
          sensor.text = 'Inactive';
          sensor.textFillColor = 'red';
        }
      }
    }

    this.activeSensorCount = effectiveSensorCount;
  }

  private measurementTextCache = new Map<number, string>();
  private formatMeasurement(value: number): string {
    const rounded = Math.round(value * 100) / 100;

    let text = this.measurementTextCache.get(rounded);
    if (!text) {
      text = rounded.toFixed(2);
      // Only cache if cache isn't too large
      if (this.measurementTextCache.size < 1000) {
        this.measurementTextCache.set(rounded, text);
      }
    }

    return text;
  }

  getActiveSensors(): PooledSensorData[] {
    // Return a view of the array (no new allocation)
    return this.sensors.slice(0, this.activeSensorCount);
  }

  getSensor(index: number): PooledSensorData | null {
    if (index >= 0 && index < this.activeSensorCount) {
      return this.sensors[index];
    }
    return null;
  }

  /**
   * Clear color cache (called when color scheme changes)
   */
  clearColorCache(): void {
    this.colorCache.clear();
  }

  reset(): void {
    this.activeSensorCount = 0;
    this.colorCache.clear();
    this.measurementTextCache.clear();
  }
}

class SensorDataPoolManager {
  private static instance: SensorDataPool | null = null;

  static getInstance(maxCapacity: number): SensorDataPool {
    if (!this.instance) {
      this.instance = new SensorDataPool(maxCapacity);
    }
    return this.instance;
  }

  static reset(): void {
    if (this.instance) {
      this.instance.reset();
    }
  }
}

export default SensorDataPoolManager;
