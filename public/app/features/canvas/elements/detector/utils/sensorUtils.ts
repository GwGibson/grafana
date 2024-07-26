import { DetectorConfig } from '../detector';

export const generateSensorLink = (
  baseURL: string,
  channel: number,
  numMeasurements: number,
  padding: number,
  datastream: string,
  attribute: string,
  normalized: string
): string => {
  const channelString =
    channel <= numMeasurements ? `channel_${String(channel).padStart(padding, '0')}` : 'All';
  return `${baseURL}&var-channel=${channelString}&var-datastream=${datastream}&var-attribute=${attribute}&var-normalized=${normalized}`;
};

export const updateChannelMapping = (config: DetectorConfig, measurements: number[]): number[] => {
  const currentChannelMappingInput = config.channelMappingInput ?? '';
  let lastChannelMappingInput = config.lastChannelMappingInput ?? '';
  let channelMapping = config.lastChannelMapping ?? [];

  // TODO: This first comparison might be a problem for really long strings that are identical
  // If done via API endpoint, this can be a timestamp comparison
  if (currentChannelMappingInput !== lastChannelMappingInput || measurements.length === 0) {
    const newMapping = parseChannelMapping(currentChannelMappingInput);
    if (newMapping) {
      channelMapping = newMapping;
      lastChannelMappingInput = currentChannelMappingInput;
      config.lastChannelMapping = channelMapping;
    }
  }

  return channelMapping;
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
