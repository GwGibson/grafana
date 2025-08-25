import { DetectorConfig, DetectorData, DisplayMode } from '../detector';
import { createHexagonPoints, scaleCoordinates, scaleRadius } from '../utils/geometry';
import { DETECTOR_VIEWBOX_EXTENT } from '../utils/layout';
import { SensorDataPool, PooledSensorData } from '../utils/sensorDataPool';

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
  sensors: PooledSensorData[]; // Now using pooled sensors
}

interface HexagonData {
  name: string;
  center: { x: number; y: number };
  extent: { width: number; height: number };
  color: string;
  points: Array<{ x: number; y: number }>;
}

const getDetectorConfig = (type: string, selectedArrays: string[]): DetectorLayout => {
  switch (type) {
    case 'BLAST':
      return BLAST_DETECTOR_LAYOUT;
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
  isPanelEditing: boolean,
  sensorPool: SensorDataPool
): DetectorComponentData => {
  const displayMode = data.displayMode === DisplayMode.DISPLAY;

  // Check if we need to regenerate the entire component data
  if (displayMode || isPanelEditing || !config.DetectorComponentData) {
    const selectedArrays = data.displayData.selectedArrays;
    const detectorConfig = getDetectorConfig(data.detectorType, selectedArrays);

    // Generate hexagons (these don't change frequently)
    const hexagons = generateDetectorLayout(selectedArrays, DETECTOR_VIEWBOX_EXTENT, detectorConfig);

    // Initialize sensors in the pool
    initializeSensorPool(data, DETECTOR_VIEWBOX_EXTENT, detectorConfig, sensorPool, displayMode);

    // Update measurements
    sensorPool.updateSensorMeasurements(
      data.measurements,
      data.colorData,
      displayMode,
      getSensorCount(data, detectorConfig)
    );

    const newComponentData: DetectorComponentData = {
      hexagons,
      sensors: sensorPool.getActiveSensors(),
    };

    // Cache the component data
    config.DetectorComponentData = newComponentData;
    return newComponentData;
  } else {
    // Just update measurements in the existing pool
    sensorPool.updateSensorMeasurements(
      data.measurements,
      data.colorData,
      displayMode,
      getSensorCount(
        data,
        config.DetectorComponentData
          ? getDetectorConfig(data.detectorType, data.displayData.selectedArrays)
          : getDetectorConfig(data.detectorType, [])
      )
    );

    return {
      hexagons: config.DetectorComponentData.hexagons,
      sensors: sensorPool.getActiveSensors(),
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

const getSensorCount = (data: DetectorData, detectorLayout: DetectorLayout): number => {
  const { selectedArrays, selectedNetworks } = data.displayData;

  return detectorLayout.hexagons.reduce(
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
};

const initializeSensorPool = (
  data: DetectorData,
  detectorViewboxExtent: { width: number; height: number },
  detectorLayout: DetectorLayout,
  sensorPool: SensorDataPool,
  displayMode: boolean
): void => {
  const { channelMapping } = data.mappingData;
  const { selectedArrays, selectedNetworks } = data.displayData;

  let sensorIndex = 0;

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
            const mappedSensorIndex = sensorStartIndex + index;
            const mappedChannel =
              channelMapping[mappedSensorIndex] !== undefined ? channelMapping[mappedSensorIndex] : -1;
            const sensorId = `(${network.name}): ${index + 1}`;

            const scaledCoordsIndex =
              hexagon.networkStartIndices[0] === 0
                ? mappedSensorIndex
                : mappedSensorIndex % hexagon.networkStartIndices[0];

            const [scaledX, scaledY] = scaledCoords[scaledCoordsIndex];

            // Initialize sensor in the pool
            sensorPool.initializeSensor(
              sensorIndex,
              sensorId,
              scaledX,
              scaledY,
              sensor.position[0],
              sensor.position[1],
              sensor.rotation,
              sensor.sweepFlag,
              sensor.isDark,
              scaledSensorRadii,
              mappedChannel,
              displayMode
            );

            sensorIndex++;
          });
        }
      });
    }
  });
};
