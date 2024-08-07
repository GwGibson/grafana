import React from 'react';

import { useStyles2 } from '@grafana/ui';

import { getColor } from '../colorbar/colorbar';
import { DetectorColorData, DetectorData, getDetectorStaticStyles } from '../detector';
import { Sensor } from '../utils/displaySensor';
import { createHexagonPoints, scaleCoordinates, scaleRadius } from '../utils/geometryUtils';
import { generateSensorLink } from '../utils/sensorUtils';

import { MODULE_LAYOUT_BLAST, SENSOR_ARRAY_CONFIG_BLAST } from './blast/moduleBlast';
import { ModuleLayout } from './builderUtils';
import { HexagonData, SensorArray, SensorData } from './dataUtils';
import { MODULE_LAYOUT_PRIMECAM280, SENSOR_ARRAY_CONFIG_PRIMECAM280 } from './prime-cam/modulePrimeCam280';

export interface ModuleDisplayProps {
  data: DetectorData;
  viewboxModuleExtent: { width: number; height: number };
}

export interface ModuleProps extends ModuleDisplayProps {
  moduleLayout: ModuleLayout;
}

export interface ModuleDisplayData {
  hexagons: HexagonData[];
  sensors: SensorData[];
}

export const GenerateModuleDisplay: React.FC<ModuleDisplayData> = ({ hexagons, sensors }): JSX.Element => {
  const staticStyles = useStyles2(getDetectorStaticStyles());
  return (
    <g>
      {hexagons.map((hexagon, index) => (
        <polygon
          key={index}
          points={hexagon.points}
          className={staticStyles.outline}
          stroke={hexagon.color}
          fill={hexagon.color}
        />
      ))}
      {sensors.map((sensor) => (
        <Sensor key={sensor.id} configData={sensor} />
      ))}
    </g>
  );
};

export enum DetectorType {
  BLAST = 'BLAST',
  PRIMECAM_280 = 'PRIMECAM-280',
}

interface DetectorConfig {
  label: string;
  moduleLayout: ModuleLayout;
  sensorArrayConfig: SensorArray[];
}

const detectorConfigs: Record<DetectorType, DetectorConfig> = {
  [DetectorType.BLAST]: {
    label: 'BLAST',
    moduleLayout: MODULE_LAYOUT_BLAST,
    sensorArrayConfig: SENSOR_ARRAY_CONFIG_BLAST,
  },
  [DetectorType.PRIMECAM_280]: {
    label: 'PRIMECAM-280',
    moduleLayout: MODULE_LAYOUT_PRIMECAM280,
    sensorArrayConfig: SENSOR_ARRAY_CONFIG_PRIMECAM280,
  },
};

export const getModuleDisplayData =
  (type: DetectorType) =>
  (props: ModuleDisplayProps): ModuleDisplayData => {
    console.log('Getting Module Display Data from scratch.');
    const config = detectorConfigs[type];
    if (!config) {
      throw new Error(`Invalid detector type: ${type}`);
    }
    return {
      hexagons: generateModuleLayout(
        props.data.displayData.selectedArrays,
        props.viewboxModuleExtent,
        config.moduleLayout
      ),
      sensors: updateSensorMeasurements(
        generateSensorLayout(props.data, props.viewboxModuleExtent, config.moduleLayout),
        props.data.measurements,
        props.data.colorData,
        props.data.variableData.normalized,
        props.data.renderMode
      ),
    };
  };

interface ModuleMapData {
  label: string;
  displayModule: React.FC<ModuleDisplayData>;
  getDisplayData: (props: ModuleDisplayProps) => ModuleDisplayData;
  sensorArrays: SensorArray[];
}

export const ModuleMap: Record<DetectorType, ModuleMapData> = Object.entries(detectorConfigs).reduce(
  (acc, [type, config]) => {
    acc[type as DetectorType] = {
      label: config.label,
      displayModule: GenerateModuleDisplay,
      getDisplayData: getModuleDisplayData(type as DetectorType),
      sensorArrays: config.sensorArrayConfig,
    };
    return acc;
  },
  {} as Record<DetectorType, ModuleMapData>
);

const generateModuleLayout = (
  selectedArrays: string[],
  viewboxModuleExtent: { width: number; height: number },
  moduleLayout: ModuleLayout
): HexagonData[] => {
  return moduleLayout.hexagons
    .filter((hexagon) => selectedArrays.includes(hexagon.name))
    .map((hexagon) => ({
      name: hexagon.name,
      center: { x: hexagon.center.x, y: hexagon.center.y },
      extent: hexagon.extent,
      color: hexagon.color,
      points: createHexagonPoints(
        viewboxModuleExtent,
        moduleLayout.layoutExtent,
        { x: hexagon.center.x, y: hexagon.center.y },
        hexagon.extent,
        hexagon.rotated
      ),
    }));
};

const generateSensorLayout = (
  data: DetectorData,
  viewboxModuleExtent: { width: number; height: number },
  moduleLayout: ModuleLayout
): SensorData[] => {
  const { channelMapping, baseURL } = data.mappingData;
  const { datastream, attribute, normalized } = data.variableData;
  const { selectedArrays, selectedNetworks } = data.displayData;

  // Pre-calculate the total number of sensors
  const totalSensors = moduleLayout.hexagons.reduce(
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
  let sensorIndex = 0;

  // Pre-calculate scaled coordinates for all hexagons
  const scaledCoordinatesMap = new Map(
    moduleLayout.hexagons.map((hexagon) => [
      hexagon.name,
      scaleCoordinates(
        viewboxModuleExtent,
        moduleLayout.layoutExtent,
        hexagon.networks.flatMap((network) => network.sensors.map((sensor) => sensor.position)),
        hexagon.extent,
        hexagon.center
      ),
    ])
  );

  const numMeasurements = data.measurements.length;
  const numMeasurementDigits = String(numMeasurements).length;
  let sensor_id = 1;

  moduleLayout.hexagons.forEach((hexagon) => {
    if (selectedArrays.includes(hexagon.name)) {
      const scaledSensorRadii = scaleRadius(hexagon.sensorRadii, hexagon.extent, viewboxModuleExtent);
      const scaledCoords = scaledCoordinatesMap.get(hexagon.name)!;
      let hexagonSensorIndex = 0;

      hexagon.networks.forEach((network) => {
        if (selectedNetworks.includes(network.name)) {
          network.sensors.forEach((sensor) => {
            const mappedChannel = sensorIndex < channelMapping.length ? channelMapping[sensorIndex] : sensor_id;

            sensorData[sensorIndex] = {
              id: sensor_id++,
              scaledPosition: scaledCoords[hexagonSensorIndex],
              unscaledPosition: sensor.position,
              rotation: sensor.rotation,
              sweepFlag: sensor.sweepFlag,
              isDark: sensor.isDark,
              radius: scaledSensorRadii,
              channel: mappedChannel,
              sensorLink: generateSensorLink(
                baseURL,
                mappedChannel,
                numMeasurements,
                numMeasurementDigits,
                datastream,
                attribute,
                normalized ? 'true' : 'false'
              ),
              isActive: false,
              fillColor: '',
              text: '',
              textFillColor: '',
              renderMode: data.renderMode,
            };

            sensorIndex++;
            hexagonSensorIndex++;
          });
        }
      });
    }
  });

  return sensorData.sort((a, b) => a.id - b.id);
};

export const updateSensorMeasurements = (
  sensorData: SensorData[],
  measurements: number[],
  colorData: DetectorColorData,
  normalized: boolean,
  renderMode: boolean
): SensorData[] => {
  // TODO: Part of color bar interface?
  const textOutOfRangeFactor = 1;
  const fillOutOfRangeFactor = 8;
  const { colorBar, minMeasurement, maxMeasurement } = colorData;

  const result = sensorData.map((sensor) => {
    const isActive = sensor.channel < measurements.length;

    // Always update fillColor
    const fillColor = getColor(
      measurements,
      sensor.channel,
      colorBar,
      minMeasurement,
      maxMeasurement,
      normalized,
      fillOutOfRangeFactor
    );

    let updatedSensor: SensorData = {
      ...sensor,
      isActive,
      fillColor,
    };

    // Only update text and textFillColor if renderMode is false
    if (!renderMode) {
      updatedSensor.text = isActive ? measurements[sensor.channel].toFixed(2) : 'Inactive';
      const activeTextFillColor = getColor(
        measurements,
        sensor.channel,
        colorBar,
        minMeasurement,
        maxMeasurement,
        normalized,
        textOutOfRangeFactor
      );
      updatedSensor.textFillColor = isActive ? activeTextFillColor : 'red';
    }

    return updatedSensor;
  });

  return result;
};
