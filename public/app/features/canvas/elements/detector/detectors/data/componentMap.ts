// Ideally, the types/configuration should be lazily read in from files or an API endpoint
// No source code changes should be necessary to add a new detector type (Resource Manager)
// Thinking 1 yaml file containing detector types with location of corresponding config files
// Types read in on load to populate selection menu. When a detector type is selected, the corresponding
// config file is lazily read in to populate the network selection menus and generate the sensor layout
// While initial detector loading may take some time, this is fine since rendering speed should not be impacted.

interface Component {
  arrayNames: string[];
  networkNames: string[];
}

export const componentMap: Record<string, Component> = {
  'BLAST': {
    arrayNames: ['BLAST Array'],
    networkNames: ['1'],
  },
  'PRIMECAM-280': {
    arrayNames: ['AL LEFT', 'AL RIGHT', 'TIN'],
    networkNames: ['1', '2', '3', '4', '5', '6'],
  },
}as const;

export const MAX_NETWORK_VALUES = Object.values(componentMap).reduce((max, config) => {
  const totalNetworks = config.arrayNames.length * config.networkNames.length;
  return Math.max(max, totalNetworks);
}, 0);

export const detectorOptions = Object.keys(componentMap).map((detectorType) => ({
  value: detectorType,
  label: detectorType,
}));

export const getDefaultDetectorType = (): string => 'BLAST';

export const getArraysForDetector = (type: string): string[] => {
  return componentMap[type].arrayNames;
};
