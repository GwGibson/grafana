import { getColor } from '../colorbar/colorbar';
import { DetectorColorData, DetectorConfig, DetectorData, DisplayMode } from '../detector';
import { generateSensorLink } from '../renderers/sharedTypes';
import { createHexagonPoints, scaleCoordinates, scaleRadius } from '../utils/geometry';
import { DETECTOR_VIEWBOX_EXTENT } from '../utils/layout';

import { DetectorLayout } from './builderUtils';
import { BLAST_DETECTOR_LAYOUT } from './data/blast';
import { componentMap } from './data/componentMap';
import {
  PRIMECAM280_DETECTOR_LAYOUT,
  PRIMECAM280_DETECTOR_LAYOUT_AL_LEFT,
  PRIMECAM280_DETECTOR_LAYOUT_AL_RIGHT,
  PRIMECAM280_DETECTOR_LAYOUT_TIN,
} from './data/primeCam280';

export interface DetectorComponentData {
  hexagons: HexagonData[];
  sensors: SensorData[];
}

interface HexagonData {
  name: string;
  center: { x: number; y: number };
  extent: { width: number; height: number };
  color: string;
  points: Array<{ x: number; y: number }>;
}

interface SensorData {
  // Static properties
  id: string;
  scaledPosition: [number, number];
  unscaledPosition: [number, number]; // For hover text
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
  radius: number;

  // Dynamic properties -> need updating when edit menu is open
  channel: number;
  sensorLink: string;
  displayMode: boolean;

  // Very Dynamic properties -> need updating when measurements change
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;
}

// TODO: Need to figure out how to lazy load these without causing flickering
// TODO: Default should be some 'none' type that displays nothing or a message
// to choose a detector type
const getDetectorConfig = (type: string, selectedArrays: string[]): DetectorLayout => {
  switch (type) {
    case 'BLAST':
      return BLAST_DETECTOR_LAYOUT;
    // TODO: Temporary to demostrate varying views based on selected components.
    // Should re-work to allow network-centric algorithm to determine layout
    // and when a real layout manager/factory is developed.
    case 'PRIMECAM-280':
      if (selectedArrays.length === 1) {
        switch (selectedArrays[0]) {
          case componentMap['PRIMECAM-280'].arrayNames[0]:
            return PRIMECAM280_DETECTOR_LAYOUT_AL_LEFT;
          case componentMap['PRIMECAM-280'].arrayNames[1]:
            return PRIMECAM280_DETECTOR_LAYOUT_AL_RIGHT;
          case componentMap['PRIMECAM-280'].arrayNames[2]:
            return PRIMECAM280_DETECTOR_LAYOUT_TIN;
          default:
            return PRIMECAM280_DETECTOR_LAYOUT;
        }
      }
      return PRIMECAM280_DETECTOR_LAYOUT;
    default:
      throw new Error(`Unknown detector type: ${type}`);
  }
};

export const getDetectorComponentData = (
  data: DetectorData,
  config: DetectorConfig,
  isPanelEditing: boolean
): DetectorComponentData => {
  const displayMode = data.displayMode === DisplayMode.SVG_DISPLAY;

  // Check if we need to regenerate the entire component data
  if (displayMode || isPanelEditing || !config.DetectorComponentData) {
    const selectedArrays = data.displayData.selectedArrays;
    const detectorConfig = getDetectorConfig(data.detectorType, selectedArrays);
    const newComponentData: DetectorComponentData = {
      hexagons: generateDetectorLayout(selectedArrays, DETECTOR_VIEWBOX_EXTENT, detectorConfig),
      sensors: updateSensorMeasurements(
        generateSensorLayout(data, DETECTOR_VIEWBOX_EXTENT, detectorConfig),
        data.measurements,
        data.colorData,
        displayMode
      ),
    };

    // Cache the new component data
    config.DetectorComponentData = newComponentData;
    return newComponentData;
  } else {
    // Only update sensor measurements using cached hexagon data
    return {
      hexagons: config.DetectorComponentData.hexagons,
      sensors: updateSensorMeasurements(
        config.DetectorComponentData.sensors,
        data.measurements,
        data.colorData,
        displayMode
      ),
    };
  }
};

const generateDetectorLayout = (
  selectedArrays: string[],
  detectorViewboxExtent: { width: number; height: number },
  detectorLayout: DetectorLayout
): HexagonData[] => {
  return detectorLayout.hexagons
    .filter((hexagon) => selectedArrays.includes(hexagon.name))
    .map((hexagon) => ({
      name: hexagon.name,
      center: { x: hexagon.center.x, y: hexagon.center.y },
      extent: hexagon.extent,
      color: hexagon.color,
      points: createHexagonPoints(
        detectorViewboxExtent,
        detectorLayout.layoutExtent,
        { x: hexagon.center.x, y: hexagon.center.y },
        hexagon.extent,
        hexagon.rotateHexagon
      ),
    }));
};

const generateSensorLayout = (
  data: DetectorData,
  detectorViewboxExtent: { width: number; height: number },
  detectorLayout: DetectorLayout
): SensorData[] => {
  const { channelMapping, baseURL } = data.mappingData;
  const { selectedArrays, selectedNetworks } = data.displayData;

  // Pre-calculate the total number of sensors
  const totalSensors = detectorLayout.hexagons.reduce(
    (total, hexagon) =>
      selectedArrays.includes(hexagon.name)
        ? total +
          hexagon.networks.reduce(
            (netTotal, network) =>
              selectedNetworks.includes(network.name) ? netTotal + network.sensors.length : netTotal,
            0
          )
        : total,
    0
  );

  // Pre-allocate the array
  const sensorData: SensorData[] = new Array(totalSensors);

  const numMeasurements = data.measurements.length;
  const numMeasurementDigits = String(numMeasurements).length;

  detectorLayout.hexagons.forEach((hexagon) => {
    if (selectedArrays.includes(hexagon.name)) {
      const scaledCoords = scaleCoordinates(
        detectorViewboxExtent,
        detectorLayout.layoutExtent,
        hexagon.networks.flatMap((network) => network.sensors.map((sensor) => sensor.position)),
        hexagon.extent,
        hexagon.center,
        hexagon.networkRotationAngle
      );
      const scaledSensorRadii = scaleRadius(hexagon.sensorRadii, hexagon.extent, detectorViewboxExtent);

      hexagon.networks.forEach((network, networkIndex) => {
        if (selectedNetworks.includes(network.name)) {
          const sensorStartIndex = hexagon.networkStartIndices[networkIndex];
          network.sensors.forEach((sensor, index) => {
            const sensorIndex = sensorStartIndex + index;
            // If the sensorIndex is out of bounds, we set the channel to sensorIndex + 1 as this works well
            // when no mapping is specified. Obviously can be a problem if user provided mapping is incomplete
            // as there may be sensors without a channel or multiple sensors with the same channel
            // Not sure this is a good approach but leaving it for now until more clear how the measurements
            // will be handled
            const mappedChannel = sensorIndex < channelMapping.length ? channelMapping[sensorIndex] : sensorIndex + 1;
            const sensorId = `(${network.name}): ${index + 1}`;
            // TODO: This kind of sucks
            // Can't use index directly as sensors will all overlap in a given hexagon
            // Can't use sensorIndex directly or we will go out of bounds on scaledCoords
            const scaledCoordsIndex =
              hexagon.networkStartIndices[0] === 0 ? sensorIndex : sensorIndex % hexagon.networkStartIndices[0];
            sensorData[sensorIndex] = {
              id: `${sensorId}`,
              scaledPosition: scaledCoords[scaledCoordsIndex],
              unscaledPosition: sensor.position,
              rotation: sensor.rotation,
              sweepFlag: sensor.sweepFlag,
              isDark: sensor.isDark,
              radius: scaledSensorRadii,
              channel: mappedChannel,
              sensorLink: generateSensorLink(baseURL, mappedChannel, numMeasurements, numMeasurementDigits),
              isActive: false,
              fillColor: '',
              text: '',
              textFillColor: '',
              displayMode: data.displayMode === DisplayMode.SVG_DISPLAY,
            };
          });
        }
      });
    }
  });
  return sensorData;
};

export const updateSensorMeasurements = (
  sensorData: SensorData[],
  measurements: number[],
  colorData: DetectorColorData,
  displayMode: boolean
): SensorData[] => {
  // TODO: These 2 factors -> part of color bar interface?
  const TEXT_OUT_OF_RANGE_FACTOR = 1 as const;
  const FILL_OUT_OF_RANGE_FACTOR = 8 as const;
  const { colorBar, minMeasurement, maxMeasurement } = colorData;

  const result = sensorData.map((sensor) => {
    if (!sensor) {
      return null;
    }

    const isActive = sensor.channel < measurements.length;

    // Always update fillColor
    const fillColor = getColor(
      measurements,
      sensor.channel,
      colorBar,
      minMeasurement,
      maxMeasurement,
      FILL_OUT_OF_RANGE_FACTOR
    );

    let updatedSensor: SensorData = {
      ...sensor,
      isActive,
      fillColor,
    };

    // Only update text and textFillColor if we are in display mode (not render mode)
    if (displayMode) {
      updatedSensor.text = isActive ? measurements[sensor.channel].toFixed(2) : 'Inactive';
      const activeTextFillColor = getColor(
        measurements,
        sensor.channel,
        colorBar,
        minMeasurement,
        maxMeasurement,
        TEXT_OUT_OF_RANGE_FACTOR
      );
      updatedSensor.textFillColor = isActive ? activeTextFillColor : 'red';
    }

    return updatedSensor;
  });

  return result.filter((sensor): sensor is SensorData => sensor !== null);
};
