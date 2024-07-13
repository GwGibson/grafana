import React from 'react';

import { useStyles2 } from '@grafana/ui';

import { getColor } from '../colorbar/colorbar';
import {
  DetectorColorData,
  DetectorData,
  DetectorMappingData,
  DetectorMeasurementData,
  DetectorVariableData,
  getDetectorDataStyles,
} from '../detector';
import { createHexagonComponent } from '../utils/geometryUtils';
import { ModuleLayout, SensorData } from '../utils/moduleLayout';
import { Sensor } from '../utils/sensor';
import { generateSensorLink, scaleCoordinates } from '../utils/sensorUtils';

interface DetectorBaseProps {
  data: DetectorData;
  extents: { x: number; y: number };
  initializeModuleLayout: () => ModuleLayout;
}

export const DetectorBase: React.FC<DetectorBaseProps> = ({ data, extents, initializeModuleLayout }) => {
  const dynamicStyles = useStyles2(getDetectorDataStyles(data));
  const hexagon = createHexagonComponent(extents, false);

  // Contains all required information to construct the module but no rendering occurs here
  const moduleLayout = initializeModuleLayout();

  if (!moduleLayout) {
    return <div>Error loading layout...</div>;
  }

  // TODO: Build hexagons here
  // const initialModuleData = generateInitialModuleLayout(moduleLayout);
  const initialSensorData = generateInitialSensorLayout(moduleLayout);
  const mappedSensorData = updateSensorDataWithMapping(initialSensorData, data.mappingData, data.variableData);
  const finalSensorData = updateSensorColorsAndText(
    mappedSensorData,
    data.measurementData,
    data.colorData,
    data.variableData.normalized
  );

  return (
    <g className={dynamicStyles.detector}>
      {hexagon}
      <g className={dynamicStyles.sensor}>
        {finalSensorData.map((sensor) => (
          <Sensor key={sensor.id} configData={sensor} />
        ))}
      </g>
    </g>
  );
};

const generateInitialSensorLayout = (moduleLayout: ModuleLayout): SensorData[] => {
  let sensorData: SensorData[] = [];

  moduleLayout.hexagons.forEach((hexagon) => {
    hexagon.networks.forEach((network) => {
      // TODO: Draw appropriate hexagons here
      const scaledCoords = scaleCoordinates(network.sensors.map((sensor) => sensor.position));
      network.sensors.forEach((sensor, sensorIndex) => {
        // TODO: Will need to assign each sensor an appropriate network
        sensorData.push({
          id: sensor.id,
          scaledPosition: scaledCoords[sensorIndex],
          unscaledPosition: sensor.position,
          rotation: sensor.rotation,
          sweepFlag: sensor.sweepFlag,
          isDark: sensor.isDark,
          radius: sensor.radius,
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
  measurementData: DetectorMeasurementData,
  colorData: DetectorColorData,
  normalized: boolean
): SensorData[] => {
  const { measurements } = measurementData;
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
