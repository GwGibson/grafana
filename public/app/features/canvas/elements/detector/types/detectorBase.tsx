import { cx } from '@emotion/css';
import React from 'react';

import { useStyles2 } from '@grafana/ui';

import { getColor } from '../colorbar/colorbar';
import {
  DetectorColorData,
  DetectorData,
  DetectorMappingData,
  DetectorVariableData,
  getDetectorDynamicStyles,
  getDetectorStaticStyles,
} from '../detector';
import { createHexagonPoints, scaleCoordinates, scaleRadius } from '../utils/geometryUtils';
import { Sensor } from '../utils/sensor';
import { generateSensorLink } from '../utils/sensorUtils';

import { HexagonData, ModuleLayout, SensorData } from './moduleInfo';

interface DetectorBaseProps {
  data: DetectorData;
  extents: { x: number; y: number };
  moduleLayout: ModuleLayout;
}

export const DetectorBase: React.FC<DetectorBaseProps> = ({ data, extents, moduleLayout }) => {
  const dynamicStyles = useStyles2(getDetectorDynamicStyles(data));
  const staticStyles = useStyles2(getDetectorStaticStyles());
  const { selectedArrays, selectedNetworks } = data.displayData;

  const initialModuleData = generateModuleLayout(moduleLayout, extents);
  const initialSensorData = generateInitialSensorLayout(moduleLayout, extents, selectedArrays, selectedNetworks);
  const mappedSensorData = updateSensorDataWithMapping(initialSensorData, data.mappingData, data.variableData);
  const finalSensorData = updateSensorColorsAndText(
    mappedSensorData,
    data.measurements,
    data.colorData,
    data.variableData.normalized
  );

  return (
    <g className={dynamicStyles.detector}>
      {initialModuleData.map((hexagon, index) => (
        <polygon
          key={index}
          points={hexagon.points}
          className={cx(dynamicStyles.detector, staticStyles.outline)}
          stroke={hexagon.color}
        />
      ))}
      <g className={dynamicStyles.sensor}>
        {finalSensorData.map((sensor) => (
          <Sensor key={sensor.id} configData={sensor} />
        ))}
      </g>
    </g>
  );
};

const generateModuleLayout = (moduleLayout: ModuleLayout, detectorExtents: { x: number; y: number }): HexagonData[] => {
  return moduleLayout.hexagons.map((hexagon) => ({
    name: hexagon.name,
    center: { x: hexagon.center[0], y: hexagon.center[1] },
    radius: hexagon.radius,
    color: hexagon.color,
    points: createHexagonPoints(
      { x: hexagon.center[0], y: hexagon.center[1] },
      hexagon.radius,
      moduleLayout.moduleExtents,
      detectorExtents
    ),
  }));
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
          text: '(Inactive)',
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
      const text = isActive ? measurements[sensor.channel].toFixed(2) : '(Inactive)';
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
