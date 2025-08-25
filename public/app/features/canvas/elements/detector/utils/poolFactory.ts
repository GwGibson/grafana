import DetectorDataPoolManager from './detectorDataPool';
import SensorDataPoolManager from './sensorDataPool';

/**
 * Factory to ensure detector and sensor pools are created with matching capacities
 */
export class PoolFactory {
  private static isInitialized = false;
  private static capacity = 20000;

  /**
   * Initialize both pools with the same capacity
   * This ensures measurements, channel mappings, and sensors all have matching limits
   */
  static initializePools(capacity = 20000): void {
    if (this.isInitialized) {
      return;
    }

    this.capacity = capacity;

    // Initialize both pools with the same capacity
    DetectorDataPoolManager.getInstance(capacity);
    SensorDataPoolManager.getInstance(capacity);

    this.isInitialized = true;
  }

  /**
   * Get the detector data pool
   * Ensures it's initialized with the correct capacity
   */
  static getDetectorPool() {
    if (!this.isInitialized) {
      this.initializePools();
    }
    return DetectorDataPoolManager.getInstance(this.capacity);
  }

  /**
   * Get the sensor data pool
   * Ensures it's initialized with the correct capacity
   */
  static getSensorPool() {
    if (!this.isInitialized) {
      this.initializePools();
    }
    return SensorDataPoolManager.getInstance(this.capacity);
  }

  /**
   * Get the current capacity
   */
  static getCapacity(): number {
    return this.capacity;
  }

  /**
   * Reset both pools (useful for testing or when switching detector types)
   */
  static resetPools(): void {
    DetectorDataPoolManager.reset();
    SensorDataPoolManager.reset();
  }

  /**
   * Check if a given count would exceed capacity
   */
  static wouldExceedCapacity(count: number): boolean {
    return count > this.capacity;
  }

  /**
   * Validate that measurement count, channel mapping count, and sensor count are consistent
   */
  static validateConsistency(measurementCount: number, channelMappingCount: number, sensorCount: number): boolean {
    if (measurementCount !== channelMappingCount) {
      return false;
    }

    // Sensor count might be different as it depends on selected networks/arrays
    // but it shouldn't exceed the measurement count (each sensor needs a measurement)
    if (sensorCount > measurementCount) {
      return false;
    }

    return true;
  }
}

export default PoolFactory;
