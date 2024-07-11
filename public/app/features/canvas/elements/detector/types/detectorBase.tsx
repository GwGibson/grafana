import React from 'react';

import { useStyles2 } from '@grafana/ui';

import { getColor } from '../colorbar/colorbar';
import { getDetectorDataStyles } from '../detector';
import { DetectorDisplayProps } from '../layout';
import { createHexagonComponent } from '../utils/geometryUtils';
import { ModuleLayout, SensorData } from '../utils/moduleLayout';
import { Sensor } from '../utils/sensor';
import { generateSensorLink, scaleCoordinates } from '../utils/sensorUtils';

interface DetectorBaseProps extends DetectorDisplayProps {
  initializeModuleLayout: () => ModuleLayout;
}

export const DetectorBase: React.FC<DetectorBaseProps> = ({ data, extents, initializeModuleLayout }) => {
  const dynamicStyles = useStyles2(getDetectorDataStyles(data));
  const hexagon = createHexagonComponent(extents, false);

  const moduleLayout = initializeModuleLayout();

  // Initialize sensor data
  let sensorData: SensorData[] = [];
  if (moduleLayout) {
    moduleLayout.hexagons.forEach((hexagon) => {
      hexagon.networks.forEach((network) => {
        const scaledCoords = scaleCoordinates(network.sensors.map((sensor) => sensor.position));
        network.sensors.forEach((sensor, sensorIndex) => {
          sensorData.push({
            // Permanent values
            id: sensor.id,
            scaledPosition: scaledCoords[sensorIndex],
            unscaledPosition: sensor.position,
            rotation: sensor.rotation,
            sweepFlag: sensor.sweepFlag,
            isDark: sensor.isDark,
            radius: sensor.radius,
            // Give default values below as they will be updated later
            // Semi-dynamic -> need updating when channelMapping changes
            channel: sensor.id,
            sensorLink: '',
            // Dynamic -> need updating when measurements change
            isActive: false,
            fillColor: 'black',
            text: '(Inactive)',
            textFillColor: 'red',
          });
        });
      });
    });
    sensorData.sort((a, b) => a.id - b.id);
  }

  // Update sensor data with channel mappings
  const { channelMapping, paddedSensorIds, baseURL } = data.mappingData;
  const { datastream, attribute, normalized } = data.variableData;

  channelMapping.forEach((channel, index) => {
    if (index < sensorData.length && sensorData[index].channel !== channel) {
      sensorData[index] = {
        ...sensorData[index],
        channel,
        sensorLink: generateSensorLink(
          baseURL,
          paddedSensorIds,
          channel,
          datastream,
          attribute,
          normalized ? 'true' : 'false'
        ),
      };
    }
  });

  // Update sensor colors and text based on measurements
  const { measurements } = data.measurementData;
  const { colorBar, minMeasurement, maxMeasurement } = data.colorData;

  Object.values(sensorData).forEach((sensor, index) => {
    if (index < measurements.length) {
      const isActive = sensor.channel < measurements.length;
      const [fillColor, activeTextFillColor] = [false, true].map((isText) =>
        getColor(measurements, sensor.channel, colorBar, minMeasurement, maxMeasurement, normalized, isText ? 1 : 8)
      );
      const text = isActive ? measurements[sensor.channel].toFixed(2) : '(Inactive)';
      const textFillColor = isActive ? activeTextFillColor : 'red';
      sensorData[index] = {
        ...sensor,
        isActive,
        fillColor,
        text,
        textFillColor,
      };
    }
  });

  if (!moduleLayout) {
    return <div>Loading...</div>;
  }

  return (
    <g className={dynamicStyles.detector}>
      {hexagon}
      <g className={dynamicStyles.sensor}>
        {Object.values(sensorData).map((sensor) => (
          <Sensor
            key={sensor.id}
            configData={{
              ...sensor,
            }}
          />
        ))}
      </g>
    </g>
  );
};
