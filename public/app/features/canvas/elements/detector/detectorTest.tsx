// { css } from '@emotion/css';

// import { GrafanaTheme2 } from '@grafana/data';
import { ResourceDimensionConfig } from '@grafana/schema';
// import { useStyles2 } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions';
import { ResourceDimensionEditor } from 'app/features/dimensions/editors';

import { CanvasElementItem, CanvasElementOptions, CanvasElementProps } from '../../element';

interface DetectorData {
  measurements?: number[];
  sensors?: number;
}

interface DetectorConfig {
  measurements?: ResourceDimensionConfig;
  sensors?: number;
}

const getScaledRandomMeasurement = (measurements: number[]): number => {
  if (measurements.length === 0) {
    return 0;
  }

  if (Math.random() < 0.05) {
    return Math.random() < 0.5 ? 0 : 1;
  }

  const randomIndex = Math.floor(Math.random() * measurements.length);
  const randomValue = measurements[randomIndex];
  const scaledMeasurement = Math.min(Math.max(randomValue, 0), 100) / 100;
  return scaledMeasurement;
};

const DetectorDisplay = ({ data }: CanvasElementProps<DetectorConfig, DetectorData>) => {
  // const styles = useStyles2(getStyles);

  const measurements = data?.measurements || [];
  const numSensors = data?.sensors || 15;
  // const fieldName = data?.field || 'No Data';
  const xDistance = 75;
  const yDistance = 90;
  const xIncrease = xDistance / numSensors;
  const yIncrease = yDistance / numSensors;
  const numRows = numSensors + 1;
  const xAvailable = xDistance / numSensors;
  const yAvailable = (yDistance / numRows) * 0.866;
  const maxDiameter = Math.min(xAvailable, yAvailable);
  const radius = (maxDiameter / 2) * 0.95; // For a small gap between sensors
  let id = 1;
  let rowID = 1;

  const svg = (
    <svg viewBox="13 100 187 400" fill="none" preserveAspectRatio="xMidYMid meet">
      <polygon
        points="100,100 13.4,150 13.4,250 100,300 186.6,250 186.6,150"
        fill="white"
        stroke="black"
        strokeWidth="1"
      />
      <line x1="100" y1="100" x2="100" y2="200" stroke="black" strokeWidth="1" />
      <line x1="13.4" y1="250" x2="100" y2="200" stroke="black" strokeWidth="1" />
      <line x1="186.6" y1="250" x2="100" y2="200" stroke="black" strokeWidth="1" />
      {
        // First Quadrant
        Array.from({ length: numRows }).map((_, row: number) => {
          let cx = 20 + xIncrease * row;
          let cy = 150 - (yIncrease / 2) * row;
          return (
            <g key={`row-${rowID++}`}>
              {Array.from({ length: numSensors }).map((__, col: number) => {
                cy += yIncrease;
                return (
                  <circle
                    key={`sensor-${id}`}
                    id={`sensor-${id++}`}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="red"
                    fillOpacity={getScaledRandomMeasurement(measurements)}
                  />
                );
              })}
            </g>
          );
        })
      }
      {
        // Second Quadrant
        Array.from({ length: numRows }).map((_, row) => {
          let cx = 105 + xIncrease * row;
          let cy = 105 + (yIncrease / 2) * row;
          return (
            <g key={`row-${rowID++}`}>
              {Array.from({ length: numSensors }).map((__, col) => {
                cy += yIncrease;
                return (
                  <circle
                    key={`sensor-${id}`}
                    id={`sensor-${id++}`}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="red"
                    fillOpacity={getScaledRandomMeasurement(measurements)}
                  />
                );
              })}
            </g>
          );
        })
      }
      {
        // Third Quadrant
        Array.from({ length: numRows }).map((_, row) => {
          const xIncrease = 80 / numSensors;
          let cx = 20 + xIncrease * row;
          let cy = 250 + (yIncrease / 2) * row;
          return (
            <g key={`row-${rowID++}`}>
              {Array.from({ length: numSensors }).map((__, col) => {
                cx += xIncrease;
                cy -= yIncrease * 0.5;
                return (
                  <circle
                    key={`sensor-${id}`}
                    id={`sensor-${id++}`}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="red"
                    fillOpacity={getScaledRandomMeasurement(measurements)}
                  />
                );
              })}
            </g>
          );
        })
      }
    </svg>
  );

  return svg;
};

export const detectorTestItem: CanvasElementItem = {
  id: 'test detector',
  name: 'Test Detector',
  description: 'Test Detector',
  display: DetectorDisplay,
  defaultSize: {
    width: 400,
    height: 300,
  },

  getNewOptions: (options) => ({
    ...options,
    background: {
      color: {
        fixed: 'transparent',
      },
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: CanvasElementOptions<DetectorConfig>) => {
    const detectorConfigs = cfg.config;

    const measurementValues =
      (detectorConfigs?.measurements && ctx.getResource(detectorConfigs.measurements).field?.values) || [];
    const sensorCount = Math.min(Math.max(detectorConfigs?.sensors || 15, 10), 100);

    const data: DetectorData = {
      measurements: measurementValues,
      sensors: sensorCount,
    };

    return data;
  },

  registerOptionsUI: (builder: any) => {
    const category = ['Detector'];
    builder
      .addCustomEditor({
        category,
        id: 'measurements',
        path: 'config.measurements',
        name: 'Measurements',
        editor: ResourceDimensionEditor,
      })
      .addNumberInput({
        category,
        path: 'config.sensors',
        name: 'Number of Sensors Modifier',
        settings: {
          placeholder: '15',
        },
      });
  },
};

// const getStyles = (theme: GrafanaTheme2) => ({});
