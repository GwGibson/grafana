import { ModuleData } from './detectorComponentFactory';
// For PRIMECAM280, 3 sensor arrays, 6 networks and 1 for 'all' option.
// Also needs to manually updated if a new detector with more networks is added.
export const MAX_NETWORK_VALUES = 3 * 6 + 1;

export interface SensorArray {
  name: string;
  networks: string[];
}

export const detectorOptions = Object.entries(ModuleData).map(([key, value]) => ({
  value: key as DetectorType,
  label: value.label,
}));

// For dashboard display
export interface ModuleLayout {
  sensorRadii: number;
  moduleExtents: { x: number; y: number };
  hexagons: HexagonInfo[];
}

export interface HexagonInfo {
  name: string;
  center: [number, number];
  radius: number;
  color: string;
  rotated: boolean;
  networks: NetworkInfo[];
}

export interface HexagonData {
  name: string;
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
}

export interface SensorData {
  // Static properties
  id: number;
  scaledPosition: [number, number];
  unscaledPosition: [number, number]; // For hover text
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
  radius: number;

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

export type DetectorType = keyof typeof ModuleData;

export const getDetectorTypeKey = (key: DetectorType): DetectorType => key;

export const getDefaultDetectorType = (): DetectorType => 'BLAST';

export const getArraysForDetector = (type: DetectorType): string[] =>
  ModuleData[type].arrays.map((array) => array.name);

export const getNetworksForDetectorArray = (type: DetectorType, arrayName: string): string[] => {
  const array = ModuleData[type].arrays.find((a) => a.name === arrayName);
  return array ? array.networks : [];
};

export const getNetworksForDetectorArrays = (type: DetectorType, selectedArrays: string[]): string[] => {
  return Array.from(
    new Set(
      ModuleData[type].arrays.filter((array) => selectedArrays.includes(array.name)).flatMap((array) => array.networks)
    )
  );
};

export const getAllNetworksForDetector = (type: DetectorType): string[] => {
  return Array.from(new Set(ModuleData[type].arrays.flatMap((a) => a.networks)));
};
