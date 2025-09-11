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
   * This ensures measurements and sensors all have matching limits
   */
  static initializePools(capacity = this.capacity): void {
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
}

export default PoolFactory;
