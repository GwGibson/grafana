import React, { useEffect, useState } from 'react';

import { useStyles2 } from '@grafana/ui';

import { ColorBar, getColor } from './colorbar/colorbar';
import { DetectorConfig, getDetectorStaticStyles } from './detector';
import { DETECTOR_EXTENTS } from './detectorLayout';

export const parseChannelMappings = (inputText: string): Array<[number, number, number, number]> | undefined => {
  if (!inputText.length) {
    return undefined;
  }

  const expectedParts = 4;
  const parts = inputText.trim().split(/\s+/);
  if (parts.length % expectedParts !== 0) {
    return undefined;
  }

  const mappings: Array<[number, number, number, number]> = [];

  for (let i = 0; i < parts.length; i += expectedParts) {
    const channel = parseInt(parts[i], 10);
    const x = parseFloat(parts[i + 1]);
    const y = parseFloat(parts[i + 2]);
    const rotationAngle = parseFloat(parts[i + 3]);

    if (isNaN(channel) || isNaN(x) || isNaN(y)) {
      return undefined;
    }
    mappings.push([channel, x, y, rotationAngle]);
  }
  return mappings.length > 0 ? mappings : undefined;
};

export const generateSweepFlags = (data: Array<[number, number, number, number]>): number[] => {
  const coordinateTracker = new Set<string>();
  const sweepFlags = data.map(([_, x, y, __]) => {
    const coordKey = `${x},${y}`;
    let sweepFlag = 0;

    if (coordinateTracker.has(coordKey)) {
      // Second time seeing this coordinate, set sweepFlag to 1
      // so the semicircle is drawn in the opposite orientation
      sweepFlag = 1;
    } else {
      coordinateTracker.add(coordKey);
    }
    return sweepFlag;
  });

  return sweepFlags;
};

export const scaleCoordinates = (
  data: Array<[number, number, number, number]>,
  extents: [number, number] = [DETECTOR_EXTENTS.x, DETECTOR_EXTENTS.y],
  marginPercentage = 0.1
): Array<[number, number, number, number]> => {
  const marginX = extents[0] * marginPercentage;
  const marginY = extents[1] * marginPercentage;

  const adjustedXmin = marginX;
  const adjustedYmin = marginY;
  const adjustedXmax = DETECTOR_EXTENTS.x - marginX;
  const adjustedYmax = DETECTOR_EXTENTS.y - marginY;

  const newWidth = adjustedXmax - adjustedXmin;
  const newHeight = adjustedYmax - adjustedYmin;

  const originalXmin = Math.min(...data.map(([_, x, __]) => x));
  const originalYmin = Math.min(...data.map(([_, __, y]) => y));
  const originalXmax = Math.max(...data.map(([_, x, __]) => x));
  const originalYmax = Math.max(...data.map(([_, __, y]) => y));

  const originalWidth = originalXmax - originalXmin;
  const originalHeight = originalYmax - originalYmin;
  const scaleX = newWidth / originalWidth;
  const scaleY = newHeight / originalHeight;

  return data.map(([channel, x, y, rotationAngle]) => [
    channel,
    (x - originalXmin) * scaleX + adjustedXmin,
    (y - originalYmin) * scaleY + adjustedYmin,
    rotationAngle,
  ]);
};

const generateSensorLink = (
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

const SensorPath = React.memo(function SensorPath({
  initialFillColor,
  dPath,
  transform,
}: {
  initialFillColor: string;
  dPath: string;
  transform: string;
}) {
  const [fillColor, setFillColor] = useState(initialFillColor);

  useEffect(() => {
    setFillColor(initialFillColor);
  }, [initialFillColor]);

  return <path d={dPath} fill={fillColor} transform={transform} />;
});

const Sensor = ({
  sensorData: { measurements, channel, x, y, radius, sweepFlag, rotationAngle, sensorLink, fillColor, textFillColor },
}: {
  sensorData: {
    measurements: number[];
    channel: number;
    x: number;
    y: number;
    radius: number;
    sweepFlag: number;
    rotationAngle: number;
    sensorLink: string;
    fillColor: string;
    textFillColor: string;
  };
}) => {
  const styles = useStyles2(getDetectorStaticStyles());
  const transform = `rotate(${rotationAngle}, ${x}, ${y})`;
  const dPath = `M ${x - radius} ${y} A ${radius} ${radius} 0 0 ${sweepFlag} ${x + radius} ${y} L ${x} ${y} Z`;

  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const num_measurements = measurements.length;
  const isActive = channel < num_measurements;
  const measurementValue = isActive ? measurements[channel]?.toFixed(2) : null;

  const sensorElement = (
    <g onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <SensorPath initialFillColor={fillColor} dPath={dPath} transform={transform} />
      {isHovered && (
        <text x={DETECTOR_EXTENTS.x / 2} y={DETECTOR_EXTENTS.y + 12.5} textAnchor="middle" className={styles.hoverText}>
          Channel: {channel}
          <tspan className={styles.inactiveStatus}>
            {isActive ? <tspan style={{ fill: textFillColor }}>{` (${measurementValue})`}</tspan> : ' (Inactive)'}
          </tspan>
        </text>
      )}
    </g>
  );

  if (isActive) {
    return (
      <a key={`sensor-${channel}`} href={sensorLink} target="_blank" rel="noreferrer">
        {sensorElement}
      </a>
    );
  }

  return sensorElement;
};

export const generateSensorElements = (
  scaledMapping: Array<[number, number, number, number]>,
  sweepFlags: number[],
  paddedSensorIds: string[],
  measurements: number[],
  radius: number,
  colorBar: ColorBar,
  baseURL: string,
  datastream: string,
  attribute: string,
  normalized: boolean,
  minMeasurement: number,
  maxMeasurement: number
) => {
  // TODO: Can upload scaled min/max to db or should scaling be done here?
  // This seems like a good idea but how do we get the min/max values for each channel?
  // Good idea because writing non-normalized and normalized values to the db is slow
  // but writing non-normalized + min/max is probably slower
  const [minValue, maxValue] = normalized ? [-1, 1] : [minMeasurement, maxMeasurement];
  return scaledMapping.map(([channel, x, y, rotationAngle], index) => {
    const sweepFlag = sweepFlags[index];
    const [fillColor, textFillColor] = [false, true].map((isText) =>
      // Out of range factor will be 1 when we are coloring the text and 5 when coloring the sensors
      // and only used for normalized measurements
      getColor(measurements, channel, colorBar, minValue, maxValue, normalized, isText ? 1 : 5)
    );
    return (
      <Sensor
        key={`sensor-${channel}`}
        sensorData={{
          measurements,
          channel,
          x,
          y,
          radius,
          sweepFlag,
          rotationAngle,
          sensorLink: generateSensorLink(
            baseURL,
            paddedSensorIds,
            channel,
            datastream,
            attribute,
            normalized ? 'true' : 'false'
          ),
          fillColor,
          textFillColor,
        }}
      />
    );
  });
};

export const generateSensorElementsFromConfig = (
  detectorConfig: DetectorConfig,
  measurements: number[],
  radius: number,
  colorBar: ColorBar,
  baseURL: string,
  datastream: string,
  attribute: string,
  normalized: boolean,
  minMeasurement: number,
  maxMeasurement: number
) => {
  // Retrieve current and last input for comparison
  // Will need to update these if there is a change
  let lastMappingConfigs = detectorConfig.lastMappingConfigs || {
    channelMappingInput: '',
    paddedSensorIds: [],
    scaledMapping: [],
    sweepFlags: [],
  };
  const currentChannelMappingInput = detectorConfig.channelMappingInput || '';
  const lastChannelMappingInput = lastMappingConfigs.channelMappingInput;

  // Use previous values if there has been no change to the mapping
  let paddedSensorIds = lastMappingConfigs.paddedSensorIds;
  let scaledMapping = lastMappingConfigs.scaledMapping;
  let sweepFlags = lastMappingConfigs.sweepFlags;

  const paddedSensorIdsInvalid = paddedSensorIds.length === 0 || paddedSensorIds[0].length !== measurements.length;
  const missingConfig = measurements.length === 0 || scaledMapping.length === 0 || sweepFlags.length === 0;

  // Detect changes and attempt to parse new mappings
  if (currentChannelMappingInput !== lastChannelMappingInput || missingConfig || paddedSensorIdsInvalid) {
    const newMapping = parseChannelMappings(currentChannelMappingInput);
    // Update values if new mapping is valid
    if (newMapping) {
      paddedSensorIds = newMapping.map((_: any, index: number) =>
        String(index).padStart(measurements.length.toString().length, '0')
      );
      scaledMapping = scaleCoordinates(newMapping);
      sweepFlags = generateSweepFlags(newMapping);
      // Update the old values
      lastMappingConfigs.channelMappingInput = currentChannelMappingInput;
      lastMappingConfigs.paddedSensorIds = paddedSensorIds;
      lastMappingConfigs.scaledMapping = scaledMapping;
      lastMappingConfigs.sweepFlags = sweepFlags;
    }
  }

  return generateSensorElements(
    scaledMapping,
    sweepFlags,
    paddedSensorIds,
    measurements,
    radius,
    colorBar,
    baseURL,
    datastream,
    attribute,
    normalized,
    minMeasurement,
    maxMeasurement
  );
};
