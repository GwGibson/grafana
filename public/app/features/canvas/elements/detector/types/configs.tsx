export enum DetectorType {
  Blast = 'BLAST',
  PrimeCam280 = 'PRIMECAM-280',
}

type Network = string;

interface SensorArray {
  name: string;
  networks: Network[];
}

interface Detector {
  type: DetectorType;
  arrays: SensorArray[];
}

const DETECTOR_CONFIG: Detector[] = [
  {
    type: DetectorType.PrimeCam280,
    arrays: [
      {
        name: 'Left AL',
        networks: ['Left AL 1', 'Left AL 2', 'Left AL 3', 'Left AL 4', 'Left AL 5', 'Left AL 6'],
      },
      {
        name: 'Right AL',
        networks: ['Right AL 1', 'Right AL 2', 'Right AL 3', 'Right AL 4', 'Right AL 5', 'Right AL 6'],
      },
      {
        name: 'SN',
        networks: ['SN 1', 'SN 2', 'SN 3', 'SN 4', 'SN 5', 'SN 6'],
      },
    ],
  },
  {
    type: DetectorType.Blast,
    arrays: [
      {
        name: 'Array 1',
        networks: ['Network 1'],
      },
    ],
  },
];

// For PRIMECAM280, 3 sensor arrays, 6 networks and 1 for 'all' option.
export const MAX_NETWORK_VALUES = 3 * 6 + 1;

export const getArraysForDetector = (detectorType: DetectorType): string[] => {
  const detector = DETECTOR_CONFIG.find((d) => d.type === detectorType);
  return detector ? detector.arrays.map((a) => a.name) : [];
};

export const getNetworksForDetectorArray = (detectorType: DetectorType, arrayName: string): string[] => {
  const detector = DETECTOR_CONFIG.find((d) => d.type === detectorType);
  const array = detector?.arrays.find((a) => a.name === arrayName);
  return array ? array.networks : [];
};

export const getNetworksForDetectorArrays = (detectorType: DetectorType, selectedArrays: string[]): string[] => {
  const detector = DETECTOR_CONFIG.find((d) => d.type === detectorType);
  if (!detector) {
    return [];
  }

  return Array.from(
    new Set(detector.arrays.filter((array) => selectedArrays.includes(array.name)).flatMap((array) => array.networks))
  );
};

export const getAllNetworksForDetector = (detectorType: DetectorType): string[] => {
  const detector = DETECTOR_CONFIG.find((d) => d.type === detectorType);
  return detector ? Array.from(new Set(detector.arrays.flatMap((a) => a.networks))) : [];
};
