import { sensorArrayConfigBLAST } from '../types/blast/moduleBlast';
import { sensorArrayConfigPRIMECAM280 } from '../types/prime-cam/modulePrimeCam280';
import { DetectorType } from '../types/types';

const DETECTOR_CONFIGS: DetectorConfig[] = [
  {
    type: DetectorType.PrimeCam280,
    arrays: sensorArrayConfigPRIMECAM280,
  },
  {
    type: DetectorType.Blast,
    arrays: sensorArrayConfigBLAST,
  },
];

interface DetectorConfig {
  type: DetectorType;
  arrays: SensorArray[];
}

interface SensorArray {
  name: string;
  networks: string[];
}

// For PRIMECAM280, 3 sensor arrays, 6 networks and 1 for 'all' option.
export const MAX_NETWORK_VALUES = 3 * 6 + 1;

export const getArraysForDetector = (detectorType: DetectorType): string[] => {
  const detector = DETECTOR_CONFIGS.find((d) => d.type === detectorType);
  return detector ? detector.arrays.map((a) => a.name) : [];
};

export const getNetworksForDetectorArray = (detectorType: DetectorType, arrayName: string): string[] => {
  const detector = DETECTOR_CONFIGS.find((d) => d.type === detectorType);
  const array = detector?.arrays.find((a) => a.name === arrayName);
  return array ? array.networks : [];
};

export const getNetworksForDetectorArrays = (detectorType: DetectorType, selectedArrays: string[]): string[] => {
  const detector = DETECTOR_CONFIGS.find((d) => d.type === detectorType);
  if (!detector) {
    return [];
  }

  return Array.from(
    new Set(detector.arrays.filter((array) => selectedArrays.includes(array.name)).flatMap((array) => array.networks))
  );
};

export const getAllNetworksForDetector = (detectorType: DetectorType): string[] => {
  const detector = DETECTOR_CONFIGS.find((d) => d.type === detectorType);
  return detector ? Array.from(new Set(detector.arrays.flatMap((a) => a.networks))) : [];
};
