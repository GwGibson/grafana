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
  sensors: PooledSensorData[];
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

    const hexagons = generateDetectorLayout(selectedArrays, DETECTOR_VIEWBOX_EXTENT, detectorConfig);
    initializeSensorPool(data, DETECTOR_VIEWBOX_EXTENT, detectorConfig, sensorPool, displayMode);

    sensorPool.updateSensorMeasurements(
      data.networkMeasurements,
      data.colorData,
      displayMode,
      getSensorCount(data, detectorConfig)
    );

    const newComponentData: DetectorComponentData = {
      hexagons,
      sensors: sensorPool.getActiveSensors(),
    };

    config.DetectorComponentData = newComponentData;
    return newComponentData;
  } else {
    sensorPool.updateSensorMeasurements(
      data.networkMeasurements,
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

  return detectorLayout.hexagons.reduce((total, hexagon) => {
    if (selectedArrays.includes(hexagon.name)) {
      // Count sensors for networks that are selected for THIS specific array
      return (
        total +
        hexagon.networks.reduce((netTotal, network) => {
          const compositeNetworkId = `${hexagon.name}:${network.name}`;
          return selectedNetworks.includes(compositeNetworkId) ? netTotal + network.sensors.length : netTotal;
        }, 0)
      );
    }
    return total;
  }, 0);
};

const initializeSensorPool = (
  data: DetectorData,
  detectorViewboxExtent: { width: number; height: number },
  detectorLayout: DetectorLayout,
  sensorPool: SensorDataPool,
  displayMode: boolean
): void => {
  const { selectedArrays, selectedNetworks } = data.displayData;

  // Reset the sensor pool to clear any previous network mappings
  sensorPool.reset();

  let sensorIndex = 0;

  detectorLayout.hexagons.forEach((hexagon) => {
    if (selectedArrays.includes(hexagon.name)) {
      // Calculate all scaled coordinates for this hexagon
      const allSensorPositions = hexagon.networks.flatMap((network) =>
        network.sensors.map((sensor) => sensor.position)
      );

      const scaledCoords = scaleCoordinates(
        detectorViewboxExtent,
        detectorLayout.layoutExtent,
        allSensorPositions,
        hexagon.extent,
        hexagon.center,
        hexagon.networkRotationAngle
      );

      const scaledSensorRadii = scaleRadius(hexagon.sensorRadii, hexagon.extent, detectorViewboxExtent);

      let globalCoordIndex = 0; // Tracks position in the full scaledCoords array

      hexagon.networks.forEach((network) => {
        const networkSensorCount = network.sensors.length;
        const compositeNetworkId = `${hexagon.name}:${network.name}`;

        // Only process if this specific array-network combination is selected
        if (selectedNetworks.includes(compositeNetworkId)) {
          network.sensors.forEach((sensor, localIndex) => {
            const sensorId = `Network ${network.name}: ${localIndex + 1}`;
            const currentCoordIndex = globalCoordIndex + localIndex;
            const [scaledX, scaledY] = scaledCoords[currentCoordIndex];

            sensorPool.initializeSensor(
              sensorIndex,
              sensorId,
              compositeNetworkId,
              localIndex,
              scaledX,
              scaledY,
              sensor.position[0],
              sensor.position[1],
              sensor.rotation,
              sensor.sweepFlag,
              sensor.isDark,
              scaledSensorRadii,
              displayMode
            );

            sensorIndex++;
          });
        }

        globalCoordIndex += networkSensorCount;
      });
    }
  });
};
