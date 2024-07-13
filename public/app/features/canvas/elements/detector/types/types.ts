import { DetectorData } from '../detector';

import { DetectorBlast } from './blast/detectorBlast';
import { sensorArrayConfigBLAST } from './blast/moduleBlast';
import { DetectorPrimeCam280 } from './prime-cam/detectorPrimeCam280';
import { sensorArrayConfigPRIMECAM280 } from './prime-cam/modulePrimeCam280';

// For PRIMECAM280, 3 sensor arrays, 6 networks and 1 for 'all' option.
export const MAX_NETWORK_VALUES = 3 * 6 + 1;

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
    arrays: sensorArrayConfigBLAST,
  },
  'PRIMECAM-280': {
    label: 'PRIMECAM-280',
    component: DetectorPrimeCam280,
    arrays: sensorArrayConfigPRIMECAM280,
  },
};

export const detectorOptions = Object.entries(ModuleData).map(([key, value]) => ({
  value: key as DetectorType,
  label: value.label,
}));

export interface SensorArray {
  name: string;
  networks: string[];
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
