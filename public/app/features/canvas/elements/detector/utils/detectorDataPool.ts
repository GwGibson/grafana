import { ColorBar } from '../colorbar/colorbar';
import { DisplayMode, DetectorData, DetectorDisplayData, DetectorColorData } from '../detector';
import { POOL_CONFIG } from '../utils/poolConfig';

/**
 * Object pool for detector data to minimize garbage collection
 * Uses dynamic buffer allocation based on actual network sizes
 */
export class DetectorDataPool {
  private networkMeasurements: Map<string, Float32Array>;
  private networkBuffers: Map<string, Float32Array>;

  private readonly maxCapacity: number;
  private detectorData: DetectorData;

  // Display data arrays (reused, not recreated)
  private selectedArrays: string[] = [];
  private selectedNetworks: string[] = [];

  private conversionBuffer: Float32Array;

  constructor(maxCapacity: number) {
    this.maxCapacity = maxCapacity;

    this.networkMeasurements = new Map();
    this.networkBuffers = new Map();

    // Start with initial size, will grow if needed
    this.conversionBuffer = new Float32Array(POOL_CONFIG.INITIAL_CONVERSION_BUFFER_SIZE);

    // Pre-allocate the main data structure once
    this.detectorData = {
      displayMode: DisplayMode.DISPLAY,
      detectorType: '',
      networkMeasurements: this.networkMeasurements,
      displayData: {
        selectedArrays: this.selectedArrays,
        selectedNetworks: this.selectedNetworks,
      },
      colorData: {
        colorBar: 'coolwarm' as ColorBar,
        minMeasurement: -1,
        maxMeasurement: 1,
      },
    };
  }

  getMaxCapacity(): number {
    return this.maxCapacity;
  }

  getFloat32Array(values: any[] | Float32Array): Float32Array {
    if (values instanceof Float32Array) {
      return values;
    }

    const count = Math.min(values.length, this.maxCapacity);

    if (values.length > this.maxCapacity) {
      console.warn(`DetectorDataPool: Truncating values from ${values.length} to ${this.maxCapacity}`);
    }

    // Grow conversion buffer if needed
    if (count > this.conversionBuffer.length) {
      this.conversionBuffer = new Float32Array(count);
    }

    for (let i = 0; i < count; i++) {
      const val = values[i];

      // Handle various invalid cases
      if (val === 'N/A' || val === null || val === undefined || val === '') {
        this.conversionBuffer[i] = NaN;
      } else if (typeof val === 'number') {
        this.conversionBuffer[i] = val;
      } else {
        // Try to convert string to number, fallback to NaN
        const parsed = parseFloat(val);
        this.conversionBuffer[i] = isNaN(parsed) ? NaN : parsed;
      }
    }

    // Return a view of the actual used portion
    return this.conversionBuffer.subarray(0, count);
  }

  updateNetworkMeasurements(measurements: Map<string, Float32Array>): void {
    this.networkMeasurements.clear();

    for (const [networkId, values] of measurements) {
      const measurementCount = values.length;

      if (measurementCount > this.maxCapacity) {
        console.warn(
          `DetectorDataPool: Network ${networkId} has ${measurementCount} measurements, ` +
            `exceeding capacity (${this.maxCapacity}). Truncating.`
        );
      }

      const actualCount = Math.min(measurementCount, this.maxCapacity);

      // Get existing buffer or determine if we need a new one
      let buffer = this.networkBuffers.get(networkId);

      if (!buffer || buffer.length < actualCount) {
        // Create new buffer sized exactly to what we need
        buffer = new Float32Array(actualCount);
        this.networkBuffers.set(networkId, buffer);
      }

      if (values.length <= actualCount) {
        buffer.set(values);
      } else {
        buffer.set(values.subarray(0, actualCount));
      }

      // Store view of actual data
      this.networkMeasurements.set(networkId, buffer.subarray(0, actualCount));
    }

    // Clean up unused buffers to free memory (not sure this is needed)
    this.cleanupUnusedBuffers();
  }

  /**
   * Remove buffers for networks that are no longer being used
   */
  private cleanupUnusedBuffers(): void {
    // Keep buffers for a bit in case they're used again soon
    // Only cleanup if we have significantly more buffers than active networks
    if (this.networkBuffers.size > this.networkMeasurements.size * POOL_CONFIG.BUFFER_CLEANUP_THRESHOLD_MULTIPLIER) {
      for (const [networkId] of this.networkBuffers) {
        if (!this.networkMeasurements.has(networkId)) {
          this.networkBuffers.delete(networkId);
        }
      }
    }
  }

  getNetworkMeasurement(networkId: string): Float32Array | undefined {
    return this.networkMeasurements.get(networkId);
  }

  updateDisplayData(arrays: string[], networks: string[]): DetectorDisplayData {
    this.selectedArrays.length = 0;
    this.selectedNetworks.length = 0;

    // Push new values (reusing the same array objects)
    this.selectedArrays.push(...arrays);
    this.selectedNetworks.push(...networks);

    return this.detectorData.displayData;
  }

  updateColorData(colorBar: ColorBar, min: number, max: number): DetectorColorData {
    this.detectorData.colorData.colorBar = colorBar;
    this.detectorData.colorData.minMeasurement = min;
    this.detectorData.colorData.maxMeasurement = max;
    return this.detectorData.colorData;
  }

  getDetectorData(displayMode: DisplayMode, detectorType: string): DetectorData {
    this.detectorData.displayMode = displayMode;
    this.detectorData.detectorType = detectorType;

    // networkMeasurements is already a reference to the internal map
    return this.detectorData;
  }

  /**
   * Reset the pool. Useful when switching detector types.
   */
  reset(): void {
    this.networkMeasurements.clear();
    this.selectedArrays.length = 0;
    this.selectedNetworks.length = 0;

    // Don't clear buffers immediately -> they might be reused
    // Let cleanupUnusedBuffers handle it gradually
  }
}

class DetectorDataPoolManager {
  private static instance: DetectorDataPool | null = null;

  static getInstance(maxCapacity: number): DetectorDataPool {
    if (!this.instance) {
      this.instance = new DetectorDataPool(maxCapacity);
    }
    return this.instance;
  }

  static reset(): void {
    if (this.instance) {
      this.instance.reset();
    }
  }
}

export default DetectorDataPoolManager;
