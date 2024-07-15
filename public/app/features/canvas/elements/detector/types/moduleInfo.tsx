import { DetectorData } from '../detector';

import { DetectorBlast } from './blast/detectorBlast';
import { SENSOR_ARRAY_CONFIG_BLAST } from './blast/moduleBlast';
import { DetectorPrimeCam280 } from './prime-cam/detectorPrimeCam280';
import { SENSOR_ARRAY_CONFIG_PRIMECAM280 } from './prime-cam/modulePrimeCam280';

// For dashboard array & network options
// Not ideal as this must be updated each time a new detector is added
export const ModuleData: Record<
  string,
  {
    label: string;
    component: DetectorComponent;
    arrays: SensorArray[];
  }
> = {
  BLAST: {
    label: 'BLAST',
    component: DetectorBlast,
    arrays: SENSOR_ARRAY_CONFIG_BLAST,
  },
  'PRIMECAM-280': {
    label: 'PRIMECAM-280',
    component: DetectorPrimeCam280,
    arrays: SENSOR_ARRAY_CONFIG_PRIMECAM280,
  },
};

export interface SensorArray {
  name: string;
  networks: string[];
}

export const detectorOptions = Object.entries(ModuleData).map(([key, value]) => ({
  value: key as DetectorType,
  label: value.label,
}));

// For PRIMECAM280, 3 sensor arrays, 6 networks and 1 for 'all' option.
export const MAX_NETWORK_VALUES = 3 * 6 + 1;

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

interface DetectorDisplayProps {
  data: DetectorData;
  extents: {
    x: number;
    y: number;
  };
}

export type DetectorType = keyof typeof ModuleData;
type DetectorComponent = React.FC<DetectorDisplayProps>;

export const getDetectorTypeKey = (key: DetectorType): DetectorType => key;

export const getDefaultDetectorType = (): DetectorType => 'BLAST';

export const getDetectorComponent = (type: DetectorType): DetectorComponent => ModuleData[type].component;

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
