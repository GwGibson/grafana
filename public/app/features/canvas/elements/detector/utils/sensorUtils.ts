import { DetectorConfig } from '../detector';

export const generateSensorLink = (
  baseURL: string,
  paddedIds: string | any[],
  index: number,
  datastream: string,
  attribute: string,
  normalized: string
): string => {
  const channel = index < paddedIds.length ? `channel_${paddedIds[index]}` : 'All';
  return `${baseURL}&var-channel=${channel}&var-datastream=${datastream}&var-attribute=${attribute}&var-normalized=${normalized}`;
};

export const updateChannelMapping = (
  config: DetectorConfig,
  measurements: number[]
): {
  channelMapping: number[];
  paddedSensorIds: string[];
} => {
  const lastMappingConfigs = config.lastMappingConfigs ?? '';
  const currentChannelMappingInput = config.channelMappingInput ?? '';
  const lastChannelMappingInput = lastMappingConfigs.channelMappingInput ?? '';

  let channelMapping = lastMappingConfigs.channelMapping ?? [];
  let paddedSensorIds = lastMappingConfigs.paddedSensorIds;

  const measurementLength = measurements.length.toString().length;
  // Short circuit prevents out of bounds error
  const paddedSensorIdsInvalid = paddedSensorIds.length === 0 || paddedSensorIds[0].length !== measurementLength;

  // TODO: This first comparison might be a problem for really long strings that are identical
  // If done via API endpoint, this can be a timestamp comparison
  if (currentChannelMappingInput !== lastChannelMappingInput || measurements.length === 0 || paddedSensorIdsInvalid) {
    const newMapping = parseChannelMapping(currentChannelMappingInput);
    if (newMapping) {
      channelMapping = newMapping;
      paddedSensorIds = newMapping.map((_, index) => String(index).padStart(measurementLength, '0'));
      lastMappingConfigs.channelMappingInput = currentChannelMappingInput;
      lastMappingConfigs.channelMapping = channelMapping;
      lastMappingConfigs.paddedSensorIds = paddedSensorIds;
    }
  }

  return { channelMapping, paddedSensorIds };
};

export const parseChannelMapping = (inputText: string): number[] | undefined => {
  if (!inputText.length) {
    return undefined;
  }

  const expectedParts = 1;
  const parts = inputText.trim().split(/\s+/);
  const mappings: number[] = [];

  for (let i = 0; i < parts.length; i += expectedParts) {
    const channel = parseInt(parts[i], 10);

    if (isNaN(channel)) {
      return undefined;
    }
    mappings.push(channel);
  }
  return mappings.length > 0 ? mappings : undefined;
};
