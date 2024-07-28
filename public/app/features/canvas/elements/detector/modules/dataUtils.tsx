import { DetectorType, ModuleMap } from './moduleFactory';

// For PRIMECAM280, 3 sensor arrays, 6 networks and 1 for 'all' option.
// Also needs to manually updated if a new detector with more networks is added.
export const MAX_NETWORK_VALUES = 3 * 6 + 1;

export interface SensorArray {
  name: string;
  networks: string[];
}

export const detectorOptions = Object.entries(ModuleMap).map(([key]) => ({
  value: key as DetectorType,
  label: key as DetectorType,
}));

// Data needed to display the module layout on the canvas
export interface HexagonData {
  name: string;
  center: { x: number; y: number };
  extent: { width: number; height: number };
  color: string;
  points: string;
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

  // Dynamic properties -> need updating when edit menu is open
  channel: number;
  sensorLink: string;
  renderMode: boolean;

  // Very Dynamic properties -> need updating when measurements change
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;
}

export const getDetectorTypeKey = (key: DetectorType): DetectorType => key;

export const getDefaultDetectorType = (): DetectorType => DetectorType.BLAST;

export const getArraysForDetector = (type: DetectorType): string[] =>
  ModuleMap[type].sensorArrays.map((array) => array.name);

export const getNetworksForDetectorArray = (type: DetectorType, arrayName: string): string[] => {
  const array = ModuleMap[type].sensorArrays.find((a) => a.name === arrayName);
  return array ? array.networks : [];
};

export const getNetworksForDetectorArrays = (type: DetectorType, selectedArrays: string[]): string[] => {
  return Array.from(
    new Set(
      ModuleMap[type].sensorArrays
        .filter((array) => selectedArrays.includes(array.name))
        .flatMap((array) => array.networks)
    )
  );
};

export const getAllNetworksForDetector = (type: DetectorType): string[] => {
  return Array.from(new Set(ModuleMap[type].sensorArrays.flatMap((a) => a.networks)));
};
