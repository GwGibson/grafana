import React, { useEffect, useState } from 'react';

import { useStyles2 } from '@grafana/ui';

import { DetectorConfig, getDetectorStaticStyles } from '../detector';
import { DETECTOR_EXTENTS } from '../layout';

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
  const lastMappingConfigs = config.lastMappingConfigs;
  const currentChannelMappingInput = config.channelMappingInput ?? '';
  const lastChannelMappingInput = lastMappingConfigs.channelMappingInput;

  let channelMapping = lastMappingConfigs.channelMapping ?? [];
  let paddedSensorIds = lastMappingConfigs.paddedSensorIds;

  const measurementLength = measurements.length.toString().length;
  // Short circuit prevents out of bounds error
  const paddedSensorIdsInvalid = paddedSensorIds.length === 0 || paddedSensorIds[0].length !== measurementLength;

  // TODO: This first comparison might be a problem for really long strings that are identical
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

export const scaleCoordinates = (
  coords: Array<[number, number]>,
  extents: [number, number] = [DETECTOR_EXTENTS.x, DETECTOR_EXTENTS.y],
  marginPercentage = 0.1
): Array<[number, number]> => {
  const marginX = extents[0] * marginPercentage;
  const marginY = extents[1] * marginPercentage;

  const adjustedXmin = marginX;
  const adjustedYmin = marginY;
  const adjustedXmax = extents[0] - marginX;
  const adjustedYmax = extents[1] - marginY;

  const newWidth = adjustedXmax - adjustedXmin;
  const newHeight = adjustedYmax - adjustedYmin;

  const originalXmin = Math.min(...coords.map(([x, _]) => x));
  const originalYmin = Math.min(...coords.map(([_, y]) => y));
  const originalXmax = Math.max(...coords.map(([x, _]) => x));
  const originalYmax = Math.max(...coords.map(([_, y]) => y));

  const originalWidth = originalXmax - originalXmin;
  const originalHeight = originalYmax - originalYmin;

  // Prevent division by zero
  const scaleX = originalWidth !== 0 ? newWidth / originalWidth : 1;
  const scaleY = originalHeight !== 0 ? newHeight / originalHeight : 1;

  const scaledCoords: Array<[number, number]> = coords.map(([x, y]) => [
    originalWidth !== 0 ? (x - originalXmin) * scaleX + adjustedXmin : (adjustedXmin + adjustedXmax) / 2,
    originalHeight !== 0 ? (y - originalYmin) * scaleY + adjustedYmin : (adjustedYmin + adjustedYmax) / 2,
  ]);

  return scaledCoords;
};
