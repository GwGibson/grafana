export interface ModuleLayout {
  moduleExtents: { x: number; y: number };
  hexagons: HexagonInfo[];
}

interface HexagonInfo {
  name: string;
  center: [number, number];
  radius: number;
  color: string;
  networks: NetworkInfo[];
}

export interface HexagonData {
  id: string;
  center: { x: number; y: number };
  radius: number;
  color: string;
  points: string;
}

interface NetworkInfo {
  name: string;
  sensors: SensorInfo[];
}

export interface SensorInfo {
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
