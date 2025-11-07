import { POOL_CONFIG } from './poolConfig';

/**
 * Object pool for channel mappings to minimize memory allocation
 * Follows same pattern as DetectorDataPool for consistency
 */
export class ChannelMappingPool {
  private networkMappings: Map<string, Int32Array>;
  private networkBuffers: Map<string, Int32Array>;

  private readonly maxCapacity: number;

  constructor(maxCapacity: number) {
    this.maxCapacity = maxCapacity;
    this.networkMappings = new Map();
    this.networkBuffers = new Map();
  }

  getMaxCapacity(): number {
    return this.maxCapacity;
  }

  /**
   * Update channel mapping for a network
   * @param networkId - Composite network ID (e.g., "AL LEFT:1")
   * @param channelIndices - Array of channel indices [0, 5, 10, ...] where sensor[i] gets measurement[channelIndices[i]]
   */
  updateNetworkMapping(networkId: string, channelIndices: number[]): void {
    const mappingCount = channelIndices.length;

    if (mappingCount > this.maxCapacity) {
      console.warn(
        `ChannelMappingPool: Network ${networkId} has ${mappingCount} mappings, ` +
          `exceeding capacity (${this.maxCapacity}). Truncating.`
      );
    }

    const actualCount = Math.min(mappingCount, this.maxCapacity);

    // Get existing buffer or create new one if needed
    let buffer = this.networkBuffers.get(networkId);

    if (!buffer || buffer.length < actualCount) {
      buffer = new Int32Array(actualCount);
      this.networkBuffers.set(networkId, buffer);
    }

    for (let i = 0; i < actualCount; i++) {
      buffer[i] = channelIndices[i];
    }

    this.networkMappings.set(networkId, buffer.subarray(0, actualCount));
  }

  updateAllMappings(mappings: Map<string, number[]>): void {
    this.networkMappings.clear();

    for (const [networkId, channelIndices] of mappings) {
      this.updateNetworkMapping(networkId, channelIndices);
    }

    this.cleanupUnusedBuffers();
  }

  getNetworkMapping(networkId: string): Int32Array | undefined {
    return this.networkMappings.get(networkId);
  }

  hasMapping(networkId: string): boolean {
    return this.networkMappings.has(networkId);
  }

  private cleanupUnusedBuffers(): void {
    // Only cleanup if we have significantly more buffers than active mappings
    if (this.networkBuffers.size > this.networkMappings.size * POOL_CONFIG.BUFFER_CLEANUP_THRESHOLD_MULTIPLIER) {
      for (const [networkId] of this.networkBuffers) {
        if (!this.networkMappings.has(networkId)) {
          this.networkBuffers.delete(networkId);
        }
      }
    }
  }

  getMappedNetworks(): string[] {
    return Array.from(this.networkMappings.keys());
  }

  getMappingCount(): number {
    return this.networkMappings.size;
  }

  reset(): void {
    this.networkMappings.clear();
    // Don't clear buffers immediately -> they might be reused
    // Let cleanupUnusedBuffers handle it gradually
  }
}

class ChannelMappingPoolManager {
  private static instance: ChannelMappingPool | null = null;

  static getInstance(maxCapacity: number): ChannelMappingPool {
    if (!this.instance) {
      this.instance = new ChannelMappingPool(maxCapacity);
    }
    return this.instance;
  }

  static reset(): void {
    if (this.instance) {
      this.instance.reset();
    }
  }
}

export default ChannelMappingPoolManager;
