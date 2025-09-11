import { getColor } from '../colorbar/colorbar';
import { DetectorColorData } from '../detector';
import { SENSOR_STYLES, COLOR_THRESHOLDS, CACHE_LIMITS } from '../utils/renderingConfig';

export interface PooledSensorData {
  // Static properties (set once)
  id: string;
  networkId: string;
  networkLocalIndex: number;
  scaledPosition: Float32Array; // [x, y] as typed array
  unscaledPosition: Float32Array; // [x, y] as typed array
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
  radius: number;

  // Dynamic properties (updated frequently)
  displayMode: boolean;
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;

  // Cached values to avoid recalculation
  cachedMeasurementValue: number;
  cachedColorKey: number; // Hash of color parameters
}

export class SensorDataPool {
  private sensors: PooledSensorData[];
  private activeSensorCount = 0;
  private readonly maxCapacity: number;

  private sensorsByNetwork: Map<string, number[]> = new Map();

  private colorCache: Map<number, string> = new Map();
  private measurementTextCache = new Map<number, string>();

  private tempColorArray: Float32Array;

  private readonly NO_DATA_TEXT = SENSOR_STYLES.NO_DATA_TEXT;
  private readonly INACTIVE_COLOR = SENSOR_STYLES.INACTIVE_COLOR;
  private readonly ERROR_COLOR = SENSOR_STYLES.ERROR_COLOR;

  constructor(maxCapacity: number) {
    this.maxCapacity = maxCapacity;
    this.tempColorArray = new Float32Array(1);

    // Pre-allocate all sensor objects
    this.sensors = new Array(maxCapacity);

    for (let i = 0; i < maxCapacity; i++) {
      this.sensors[i] = {
        id: '',
        networkId: '',
        networkLocalIndex: 0,
        scaledPosition: new Float32Array(2),
        unscaledPosition: new Float32Array(2),
        rotation: 0,
        sweepFlag: 0,
        isDark: false,
        radius: 0,
        displayMode: false,
        isActive: false,
        fillColor: this.INACTIVE_COLOR,
        text: this.NO_DATA_TEXT,
        textFillColor: this.ERROR_COLOR,
        cachedMeasurementValue: NaN,
        cachedColorKey: 0,
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
    networkId: string,
    networkLocalIndex: number,
    scaledX: number,
    scaledY: number,
    unscaledX: number,
    unscaledY: number,
    rotation: number,
    sweepFlag: number,
    isDark: boolean,
    radius: number,
    displayMode: boolean
  ): void {
    if (index >= this.sensors.length) {
      console.warn(`SensorDataPool: Cannot initialize sensor at index ${index}, exceeds capacity ${this.maxCapacity}`);
      return;
    }

    const sensor = this.sensors[index];
    sensor.id = id;
    sensor.networkId = networkId;
    sensor.networkLocalIndex = networkLocalIndex;
    sensor.scaledPosition[0] = scaledX;
    sensor.scaledPosition[1] = scaledY;
    sensor.unscaledPosition[0] = unscaledX;
    sensor.unscaledPosition[1] = unscaledY;
    sensor.rotation = rotation;
    sensor.sweepFlag = sweepFlag;
    sensor.isDark = isDark;
    sensor.radius = radius;
    sensor.displayMode = displayMode;

    // Track sensor by network
    if (!this.sensorsByNetwork.has(networkId)) {
      this.sensorsByNetwork.set(networkId, []);
    }
    this.sensorsByNetwork.get(networkId)!.push(index);
  }

  /**
   * Fast hash function for color cache key
   */
  private hashColorParams(value: number, colorBar: string, min: number, max: number, percentage: number): number {
    // Simple hash combining all parameters
    const hash =
      ((value * 1000) | 0) * 31 +
      colorBar.charCodeAt(0) * 17 +
      ((min * 100) | 0) * 13 +
      ((max * 100) | 0) * 7 +
      ((percentage * 100) | 0);
    return hash;
  }

  /**
   * Batch update sensor measurements with network-based data
   */
  updateSensorMeasurements(
    networkMeasurements: Map<string, Float32Array>,
    colorData: DetectorColorData,
    displayMode: boolean,
    sensorCount: number
  ): void {
    const { colorBar, minMeasurement, maxMeasurement } = colorData;

    const effectiveSensorCount = Math.min(sensorCount, this.maxCapacity);

    if (sensorCount > this.maxCapacity) {
      console.warn(`SensorDataPool: Truncating sensors from ${sensorCount} to ${this.maxCapacity}`);
    }

    // Update sensors by network
    for (const [networkId, sensorIndices] of this.sensorsByNetwork) {
      const measurements = networkMeasurements.get(networkId);

      for (const sensorIdx of sensorIndices) {
        if (sensorIdx >= effectiveSensorCount) {
          continue;
        }

        const sensor = this.sensors[sensorIdx];
        const localIdx = sensor.networkLocalIndex;

        // Check if we have measurements for this network and sensor
        const isActive = measurements !== undefined && localIdx < measurements.length;
        sensor.isActive = isActive;

        if (isActive && measurements) {
          const value = measurements[localIdx];

          // Only recalculate color if value or parameters changed
          const colorHash = this.hashColorParams(
            value,
            colorBar,
            minMeasurement,
            maxMeasurement,
            COLOR_THRESHOLDS.TEXT_OUT_OF_RANGE
          );

          if (sensor.cachedMeasurementValue !== value || sensor.cachedColorKey !== colorHash) {
            sensor.cachedMeasurementValue = value;
            sensor.cachedColorKey = colorHash;

            let fillColor = this.colorCache.get(colorHash);
            if (!fillColor) {
              // Use pre-allocated temp array
              this.tempColorArray[0] = value;
              fillColor = getColor(
                this.tempColorArray,
                0,
                colorBar,
                minMeasurement,
                maxMeasurement,
                COLOR_THRESHOLDS.TEXT_OUT_OF_RANGE
              );
              if (this.colorCache.size < CACHE_LIMITS.COLOR_CACHE_MAX) {
                this.colorCache.set(colorHash, fillColor);
              }
            }
            sensor.fillColor = fillColor;
          }

          // Only update text properties in display mode
          if (displayMode) {
            sensor.text = this.formatMeasurement(value);

            // Text color usually same as fill for active sensors
            const textColorHash = this.hashColorParams(
              value,
              colorBar,
              minMeasurement,
              maxMeasurement,
              COLOR_THRESHOLDS.FILL_OUT_OF_RANGE
            );
            if (textColorHash === colorHash) {
              sensor.textFillColor = sensor.fillColor;
            } else {
              let textFillColor = this.colorCache.get(textColorHash);
              if (!textFillColor) {
                this.tempColorArray[0] = value;
                textFillColor = getColor(
                  this.tempColorArray,
                  0,
                  colorBar,
                  minMeasurement,
                  maxMeasurement,
                  COLOR_THRESHOLDS.FILL_OUT_OF_RANGE
                );
                if (this.colorCache.size < CACHE_LIMITS.COLOR_CACHE_MAX) {
                  this.colorCache.set(textColorHash, textFillColor);
                }
              }
              sensor.textFillColor = textFillColor;
            }
          }
        } else {
          // Use pre-allocated strings for inactive state
          sensor.fillColor = this.INACTIVE_COLOR;
          sensor.cachedMeasurementValue = NaN;
          sensor.cachedColorKey = 0;

          if (displayMode) {
            sensor.text = this.NO_DATA_TEXT;
            sensor.textFillColor = this.ERROR_COLOR;
          }
        }
      }
    }

    this.activeSensorCount = effectiveSensorCount;
  }

  private formatMeasurement(value: number): string {
    const rounded = Math.round(value * 100) / 100;

    let text = this.measurementTextCache.get(rounded);
    if (!text) {
      text = rounded.toFixed(2);
      // Only cache if cache isn't too large
      if (this.measurementTextCache.size < CACHE_LIMITS.MEASUREMENT_TEXT_CACHE_MAX) {
        this.measurementTextCache.set(rounded, text);
      }
    }

    return text;
  }

  getActiveSensors(): PooledSensorData[] {
    return this.sensors.slice(0, this.activeSensorCount);
  }

  getSensor(index: number): PooledSensorData | null {
    if (index >= 0 && index < this.activeSensorCount) {
      return this.sensors[index];
    }
    return null;
  }

  getSensorsByNetwork(): Map<string, number[]> {
    return this.sensorsByNetwork;
  }

  clearColorCache(): void {
    this.colorCache.clear();
    // Also clear measurement cache as formats might change
    if (this.measurementTextCache.size > CACHE_LIMITS.MEASUREMENT_TEXT_CACHE_MAX) {
      this.measurementTextCache.clear();
    }
  }

  reset(): void {
    this.activeSensorCount = 0;
    this.colorCache.clear();
    this.measurementTextCache.clear();
    this.sensorsByNetwork.clear();
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
