import React from 'react';

import { getColor } from '../colorbar/colorbar';
import { DetectorColorData, DetectorData, DetectorMappingData, DetectorVariableData } from '../detector';
import { scaleCoordinates, scaleRadius } from '../utils/geometryUtils';
import { Sensor } from '../utils/sensor';
import { generateSensorLink } from '../utils/sensorUtils';

import { ModuleLayout, SensorData } from './moduleUtils';

export interface SensorDisplayProps {
  data: DetectorData;
  extents: { x: number; y: number };
}

export interface SensorComponentProps extends SensorDisplayProps {
  moduleLayout: ModuleLayout;
}

export const SensorComponent: React.FC<SensorComponentProps> = ({ data, extents, moduleLayout }) => {
  const { selectedArrays, selectedNetworks } = data.displayData;
  const initialSensorData = generateInitialSensorLayout(moduleLayout, extents, selectedArrays, selectedNetworks);
  const mappedSensorData = updateSensorDataWithMapping(initialSensorData, data.mappingData, data.variableData);
  const finalSensorData = updateSensorColorsAndText(
    mappedSensorData,
    data.measurements,
    data.colorData,
    data.variableData.normalized
  );

  return (
    <g>
      {finalSensorData.map((sensor) => (
        <Sensor key={sensor.id} configData={sensor} />
      ))}
    </g>
  );
};

const generateInitialSensorLayout = (
  moduleLayout: ModuleLayout,
  detectorExtents: { x: number; y: number },
  selectedArrays: string[],
  selectedNetworks: string[]
): SensorData[] => {
  let sensorData: SensorData[] = [];

  const scaledSensorRadii = scaleRadius(moduleLayout.sensorRadii, moduleLayout.moduleExtents, detectorExtents);
  const filteredHexagons = moduleLayout.hexagons.filter((hexagon) => selectedArrays.includes(hexagon.name));
  filteredHexagons.forEach((hexagon) => {
    const filteredNetworks = hexagon.networks.filter((network) => selectedNetworks.includes(network.name));
    filteredNetworks.forEach((network) => {
      const scaledCoords = scaleCoordinates(
        network.sensors.map((sensor) => sensor.position),
        moduleLayout.moduleExtents,
        detectorExtents
      );
      network.sensors.forEach((sensor, sensorIndex) => {
        sensorData.push({
          id: sensor.id,
          scaledPosition: scaledCoords[sensorIndex],
          unscaledPosition: sensor.position,
          rotation: sensor.rotation,
          sweepFlag: sensor.sweepFlag,
          isDark: sensor.isDark,
          radius: scaledSensorRadii,
          channel: sensor.id,
          sensorLink: '',
          isActive: false,
          fillColor: 'black',
          text: 'Inactive',
          textFillColor: 'red',
        });
      });
    });
  });

  return sensorData.sort((a, b) => a.id - b.id);
};

const updateSensorDataWithMapping = (
  sensorData: SensorData[],
  mappingData: DetectorMappingData,
  variableData: DetectorVariableData
): SensorData[] => {
  const { channelMapping, paddedSensorIds, baseURL } = mappingData;
  const { datastream, attribute, normalized } = variableData;

  return sensorData.map((sensor, index) => {
    if (index < channelMapping.length && sensor.channel !== channelMapping[index]) {
      return {
        ...sensor,
        channel: channelMapping[index],
        sensorLink: generateSensorLink(
          baseURL,
          paddedSensorIds,
          channelMapping[index],
          datastream,
          attribute,
          normalized ? 'true' : 'false'
        ),
      };
    }
    return sensor;
  });
};

const updateSensorColorsAndText = (
  sensorData: SensorData[],
  measurements: number[],
  colorData: DetectorColorData,
  normalized: boolean
): SensorData[] => {
  const { colorBar, minMeasurement, maxMeasurement } = colorData;

  return sensorData.map((sensor, index) => {
    if (index < measurements.length) {
      const isActive = sensor.channel < measurements.length;
      const [fillColor, activeTextFillColor] = [false, true].map((isText) =>
        getColor(measurements, sensor.channel, colorBar, minMeasurement, maxMeasurement, normalized, isText ? 1 : 8)
      );
      const text = isActive ? measurements[sensor.channel].toFixed(2) : 'Inactive';
      const textFillColor = isActive ? activeTextFillColor : 'red';

      return {
        ...sensor,
        isActive,
        fillColor,
        text,
        textFillColor,
      };
    }
    return sensor;
  });
};
