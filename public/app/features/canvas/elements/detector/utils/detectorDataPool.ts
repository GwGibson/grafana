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

  constructor(maxCapacity: number) {
    this.maxCapacity = maxCapacity;

    this.networkMeasurements = new Map();
    this.networkBuffers = new Map();

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

  /**
   * Convert and store values directly into a network's pooled buffer
   * This avoids the shared buffer problem by writing directly to each network's buffer
   * Returns the Float32Array view for that network's data
   */
  setNetworkMeasurements(networkId: string, values: any[] | Float32Array): Float32Array {
    if (values instanceof Float32Array) {
      // Already a Float32Array - still need to copy to this network's pool buffer
      const count = Math.min(values.length, this.maxCapacity);

      if (values.length > this.maxCapacity) {
        console.warn(
          `DetectorDataPool: Network ${networkId} has ${values.length} measurements, ` +
            `exceeding capacity (${this.maxCapacity}). Truncating.`
        );
      }

      // Get or create buffer for this network
      let buffer = this.networkBuffers.get(networkId);
      if (!buffer || buffer.length < count) {
        buffer = new Float32Array(count);
        this.networkBuffers.set(networkId, buffer);
      }

      buffer.set(values.subarray(0, count));
      const view = buffer.subarray(0, count);
      this.networkMeasurements.set(networkId, view);
      return view;
    }

    const count = Math.min(values.length, this.maxCapacity);

    if (values.length > this.maxCapacity) {
      console.warn(
        `DetectorDataPool: Network ${networkId} has ${values.length} measurements, ` +
          `exceeding capacity (${this.maxCapacity}). Truncating.`
      );
    }

    // Get or create buffer for this specific network
    let buffer = this.networkBuffers.get(networkId);
    if (!buffer || buffer.length < count) {
      buffer = new Float32Array(count);
      this.networkBuffers.set(networkId, buffer);
    }

    // Convert directly into the network's buffer (no shared temp buffer)
    for (let i = 0; i < count; i++) {
      const val = values[i];

      // Handle various invalid cases
      if (val === 'N/A' || val === null || val === undefined || val === '') {
        buffer[i] = NaN;
      } else if (typeof val === 'number') {
        buffer[i] = val;
      } else {
        // Try to convert string to number, fallback to NaN
        const parsed = parseFloat(val);
        buffer[i] = isNaN(parsed) ? NaN : parsed;
      }
    }

    // Store the view and return it
    const view = buffer.subarray(0, count);
    this.networkMeasurements.set(networkId, view);
    return view;
  }

  /**
   * Clear all network measurements (useful when starting fresh)
   */
  clearNetworkMeasurements(): void {
    this.networkMeasurements.clear();
  }

  /**
   * Remove a specific network's measurements
   */
  removeNetwork(networkId: string): void {
    this.networkMeasurements.delete(networkId);
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

    // Cleanup unused buffers periodically
    this.cleanupUnusedBuffers();

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
