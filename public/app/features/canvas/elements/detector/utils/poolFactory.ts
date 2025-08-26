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
    DetectorDataPoolManager.getInstance(capacity);
    SensorDataPoolManager.getInstance(capacity);

    this.isInitialized = true;
  }

  static getDetectorPool() {
    if (!this.isInitialized) {
      this.initializePools();
    }
    return DetectorDataPoolManager.getInstance(this.capacity);
  }

  static getSensorPool() {
    if (!this.isInitialized) {
      this.initializePools();
    }
    return SensorDataPoolManager.getInstance(this.capacity);
  }

  static getCapacity(): number {
    return this.capacity;
  }

  static resetPools(): void {
    DetectorDataPoolManager.reset();
    SensorDataPoolManager.reset();
  }

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
    // but it shouldn't exceed the measurement count
    if (sensorCount > measurementCount) {
      return false;
    }

    return true;
  }
}

export default PoolFactory;
