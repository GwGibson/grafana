export interface ModuleLayout {
  hexagons: HexagonInfo[];
}

interface HexagonInfo {
  name: string;
  center: [number, number];
  radius: number;
  color: string;
  networks: NetworkInfo[];
}

interface NetworkInfo {
  name: string;
  sensors: SensorInput[];
}

export interface SensorInput {
  id: number;
  position: [number, number];
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
  radius: number;
}

export interface SensorData {
  // Static properties
  id: number;
  scaledPosition: [number, number];
  unscaledPosition: [number, number]; // For hover text
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
  radius: number; // Should be network or hexagon or module? level

  // Dynamic properties -> need updating when channel mapping changes
  channel: number;
  sensorLink: string;

  // Very Dynamic properties -> need updating when measurements change
  // Consider arrays of these in the NetworkInfo interface
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;
}

export const loadSensorInfo = async (filename: string): Promise<SensorData[]> => {
  try {
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: SensorData[] = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: expected an array');
    }

    // TODO: More (or less) validation checks
    const isValidSensorInfo = (item: any): item is SensorData => {
      return (
        typeof item === 'object' &&
        item !== null &&
        'position' in item &&
        'x' in item.position &&
        'y' in item.position &&
        'rotation' in item &&
        'isDark' in item
      );
    };

    if (!data.every(isValidSensorInfo)) {
      throw new Error('Invalid data format: some items do not match SensorInfo structure');
    }
    return data;
  } catch (error) {
    console.error('Error loading sensor info:', error);
    throw error;
  }
};
