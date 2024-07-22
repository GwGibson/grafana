import * as PIXI from 'pixi.js';
import React, { useRef, useEffect, useState } from 'react';

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

export const SensorDisplayComponent: React.FC<SensorComponentProps> = ({ data, extents, moduleLayout }) => {
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

export const SensorRenderComponent: React.FC<SensorComponentProps> = ({ data, extents, moduleLayout }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let app: PIXI.Application | null = null;

    const initPixi = async () => {
      // Create a new application
      app = new PIXI.Application();

      // Initialize the application
      await app.init({
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        width: extents.x,
        height: extents.y,
        backgroundAlpha: 0,
        canvas: canvas,
      });

      const { selectedArrays, selectedNetworks } = data.displayData;
      const initialSensorData = generateInitialSensorLayout(moduleLayout, extents, selectedArrays, selectedNetworks);
      const mappedSensorData = updateSensorDataWithMapping(initialSensorData, data.mappingData, data.variableData);
      const finalSensorData = updateSensorColorsAndText(
        mappedSensorData,
        data.measurements,
        data.colorData,
        data.variableData.normalized
      );

      // Create a container for all sensors
      const sensorContainer = new PIXI.Container();
      app.stage.addChild(sensorContainer);

      // Render each sensor
      finalSensorData.forEach((sensorData) => {
        const [x, y] = sensorData.scaledPosition;
        const sensor = new PIXI.Graphics();

        // Draw the sensor shape
        sensor.beginFill(PIXI.Color.shared.setValue(sensorData.fillColor).toNumber());
        sensor.setStrokeStyle({
          width: sensorData.radius / 32,
          color: PIXI.Color.shared.setValue(sensorData.isDark ? 'brown' : 'black').toNumber(),
        });
        sensor.arc(0, 0, sensorData.radius, 0, Math.PI * (sensorData.sweepFlag === 0 ? 1 : -1));
        sensor.lineTo(0, 0);
        sensor.endFill();

        // Set position and rotation
        sensor.position.set(x, y);
        sensor.rotation = sensorData.rotation * (Math.PI / 180);

        sensorContainer.addChild(sensor);
      });
    };

    initPixi();

    return () => {
      if (app) {
        app.destroy(true, { children: true, texture: true });
        app = null;
      }
    };
  }, [data.colorData, data.displayData, data.mappingData, data.measurements, data.variableData, extents, moduleLayout]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
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
