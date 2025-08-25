import { ColorBar } from '../colorbar/colorbar';
import { DisplayMode, DetectorData, DetectorDisplayData, DetectorColorData } from '../detector';

/**
 * Object pool for detector data to minimize garbage collection
 * Pre-allocates all data structures and reuses them across updates
 */
export class DetectorDataPool {
  // Pre-allocated typed array for measurements
  private measurements: Float32Array;
  private measurementCount = 0;

  // Pre-allocated channel mapping
  private channelMapping: Int32Array;
  private channelMappingCount = 0;

  // Maximum capacity
  private readonly maxCapacity: number;

  // Reusable data structure
  private detectorData: DetectorData;

  // Display data arrays (reused, not recreated)
  private selectedArrays: string[] = [];
  private selectedNetworks: string[] = [];

  constructor(maxCapacity: number) {
    // Use single capacity for all arrays to ensure consistency
    this.maxCapacity = maxCapacity;

    // Pre-allocate typed arrays with same capacity
    this.measurements = new Float32Array(maxCapacity);
    this.channelMapping = new Int32Array(maxCapacity);

    // Initialize with -1 (unmapped)
    this.channelMapping.fill(-1);

    // Pre-allocate the main data structure once
    this.detectorData = {
      displayMode: DisplayMode.DISPLAY,
      detectorType: '',
      measurements: new Float32Array(0), // Will be a view into measurements
      displayData: {
        selectedArrays: this.selectedArrays,
        selectedNetworks: this.selectedNetworks,
      },
      colorData: {
        colorBar: 'coolwarm' as ColorBar,
        minMeasurement: -1,
        maxMeasurement: 1,
      },
      mappingData: {
        channelMapping: new Int32Array(0), // Will be a view into channelMapping
        baseURL: '',
      },
    };
  }

  /**
   * Get the maximum capacity of this pool
   */
  getMaxCapacity(): number {
    return this.maxCapacity;
  }

  /**
   * Update measurements without allocation
   * Returns a view of the measurements array
   */
  updateMeasurements(newMeasurements: number[] | Float32Array): Float32Array {
    const count = Math.min(newMeasurements.length, this.maxCapacity);

    if (newMeasurements.length > this.maxCapacity) {
      console.warn(`DetectorDataPool: Truncating measurements from ${newMeasurements.length} to ${this.maxCapacity}`);
    }

    if (newMeasurements instanceof Float32Array) {
      // Fast copy from typed array
      this.measurements.set(newMeasurements.subarray(0, count));
    } else {
      // Copy from regular array
      for (let i = 0; i < count; i++) {
        this.measurements[i] = newMeasurements[i];
      }
    }

    this.measurementCount = count;
    // Return a view (no allocation)
    return this.measurements.subarray(0, count);
  }

  /**
   * Update channel mapping without allocation
   */
  updateChannelMapping(mapping: number[]): Int32Array {
    const count = Math.min(mapping.length, this.maxCapacity);

    if (mapping.length > this.maxCapacity) {
      console.warn(`DetectorDataPool: Truncating channel mapping from ${mapping.length} to ${this.maxCapacity}`);
    }

    for (let i = 0; i < count; i++) {
      this.channelMapping[i] = mapping[i];
    }

    this.channelMappingCount = count;
    // Return a view (no allocation)
    return this.channelMapping.subarray(0, count);
  }

  /**
   * Update display data in place
   */
  updateDisplayData(arrays: string[], networks: string[]): DetectorDisplayData {
    // Clear and reuse existing arrays
    this.selectedArrays.length = 0;
    this.selectedNetworks.length = 0;

    // Push new values (reusing the same array objects)
    this.selectedArrays.push(...arrays);
    this.selectedNetworks.push(...networks);

    return this.detectorData.displayData;
  }

  /**
   * Update color data in place
   */
  updateColorData(colorBar: ColorBar, min: number, max: number): DetectorColorData {
    this.detectorData.colorData.colorBar = colorBar;
    this.detectorData.colorData.minMeasurement = min;
    this.detectorData.colorData.maxMeasurement = max;

    return this.detectorData.colorData;
  }

  /**
   * Get the reusable detector data object
   * This returns the same object reference every time (no allocation)
   */
  getDetectorData(displayMode: DisplayMode, detectorType: string, baseURL: string): DetectorData {
    // Update values in place
    this.detectorData.displayMode = displayMode;
    this.detectorData.detectorType = detectorType;
    this.detectorData.mappingData.baseURL = baseURL;

    // Update array views (no allocation, just changing references)
    this.detectorData.measurements = this.measurements.subarray(0, this.measurementCount);
    this.detectorData.mappingData.channelMapping = this.channelMapping.subarray(0, this.channelMappingCount);

    return this.detectorData;
  }

  /**
   * Reset the pool (useful when switching detector types)
   */
  reset(): void {
    this.measurementCount = 0;
    this.channelMappingCount = 0;
    this.measurements.fill(0);
    this.channelMapping.fill(-1);
    this.selectedArrays.length = 0;
    this.selectedNetworks.length = 0;
  }
}

/**
 * Singleton instance manager for the pool
 */
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
