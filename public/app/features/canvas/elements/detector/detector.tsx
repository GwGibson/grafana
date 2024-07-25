import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2, PanelOptionsEditorBuilder } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { ScalarDimensionConfig } from '@grafana/schema';
import { usePanelContext, useStyles2 } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions';
import { ScalarFieldDimensionEditor } from 'app/features/dimensions/editors';

import { CanvasElementItem, CanvasElementOptions, CanvasElementProps } from '../../element';

import {
  ColorBar,
  ColorBarData,
  ColorBarDisplay,
  colorBarOptions,
  getDefaultColorBar,
  NORMALIZED_MAX,
  NORMALIZED_MIN,
} from './colorbar/colorbar';
import { DetectorArrayEditor, DetectorNetworkEditor } from './detectorEditors';
import { DETECTOR_EXTENTS, DETECTOR_LAYOUT } from './layout';
import {
  DetectorType,
  GenerateModuleDisplay,
  getModuleDisplayData,
  ModuleDisplayData,
  updateSensorMeasurements,
} from './modules/moduleFactory';
import { detectorOptions, getDefaultDetectorType } from './modules/moduleUtils';
import { updateChannelMapping } from './utils/sensorUtils';

export interface DetectorData {
  // True -> render mode, False -> display mode
  renderMode: boolean;
  detectorType: DetectorType;
  measurements: number[];
  displayData: DetectorDisplayData;
  colorData: DetectorColorData;
  mappingData: DetectorMappingData;
  variableData: DetectorVariableData;
}

export interface DetectorDisplayData {
  selectedArrays: string[];
  selectedNetworks: string[];
}

export interface DetectorColorData {
  colorBar: ColorBar;
  minMeasurement: number;
  maxMeasurement: number;
}

export interface DetectorMappingData {
  // [channel] -> maps to sensor ids in ascending order
  channelMapping: number[];
  baseURL: string;
}

export interface DetectorVariableData {
  datastream: string;
  attribute: string;
  normalized: boolean;
}

export interface DetectorConfig {
  renderMode: boolean;
  detectorType: DetectorType;
  measurements?: ScalarDimensionConfig;
  arrays: string[];
  networks: string[];
  baseURL: string;
  channelMappingInput: string;
  lastChannelMappingInput: string;
  lastChannelMapping: number[];
  colorBar: ColorBar;
  moduleDisplayData?: ModuleDisplayData;
}

const DetectorDisplay: React.FC<CanvasElementProps<DetectorConfig, DetectorData>> = (props) => {
  const { config, data } = props;
  const staticStyles = useStyles2(getDetectorStaticStyles());
  const context = usePanelContext();

  if (!data) {
    return null;
  }

  const scene = context.instanceState?.scene;
  const moduleDisplayData = getModuleDataLogic(data, config, scene?.isPanelEditing || false);

  return (
    <svg
      viewBox={`${DETECTOR_LAYOUT.VIEWBOX.START_X} ${DETECTOR_LAYOUT.VIEWBOX.START_Y}
                ${DETECTOR_LAYOUT.VIEWBOX.WIDTH} ${DETECTOR_LAYOUT.VIEWBOX.HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <desc id="desc">Visual representation of the detector layout with color-coded sensors</desc>
      <g className={staticStyles.outline}>
        <ColorBarDisplay
          colorBar={data.colorData.colorBar}
          minMeasurement={data.colorData.minMeasurement}
          maxMeasurement={data.colorData.maxMeasurement}
          normalized={data.variableData.normalized}
          dimensions={{
            x: DETECTOR_LAYOUT.COLORBAR.X,
            y: DETECTOR_LAYOUT.COLORBAR.Y,
            width: DETECTOR_LAYOUT.COLORBAR.WIDTH,
            height: DETECTOR_LAYOUT.COLORBAR.HEIGHT,
          }}
        />
        <GenerateModuleDisplay {...moduleDisplayData} />
      </g>
    </svg>
  );
};

export const DEFAULT_DETECTOR_SETTINGS = {
  TYPE: getDefaultDetectorType(),
  COLORBAR: getDefaultColorBar(),
} as const;

export const detectorItem: CanvasElementItem<DetectorConfig, DetectorData> = {
  id: 'detector',
  name: 'Detector',
  description: 'Detector element for historical live-viewing',
  display: DetectorDisplay,
  defaultSize: {
    width: DETECTOR_LAYOUT.VIEWBOX.WIDTH,
    height: DETECTOR_LAYOUT.VIEWBOX.HEIGHT,
  },

  getNewOptions: (options) => ({
    ...options,
    config: {
      renderMode: false,
      detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
      arrays: [],
      networks: [],
      baseURL: '',
      channelMappingInput: '',
      lastChannelMappingInput: '',
      lastChannelMapping: [],
      colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: CanvasElementOptions<DetectorConfig>): DetectorData => {
    if (!cfg.config) {
      // Return some default/empty DetectorData if config is not defined
      return {
        renderMode: false,
        detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
        measurements: [],
        displayData: {
          selectedArrays: [],
          selectedNetworks: [],
        },
        colorData: {
          colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
          minMeasurement: 0,
          maxMeasurement: 0,
        },
        mappingData: {
          channelMapping: [],
          baseURL: '',
        },
        variableData: {
          datastream: '',
          attribute: '',
          normalized: true,
        },
      };
    }

    const config = cfg.config;

    const renderMode = config.renderMode;
    const detectorType = config.detectorType;

    const measurements = (config.measurements && ctx.getScalar(config.measurements).field?.values) || [];
    const selectedArrays = config?.arrays || [];
    const selectedNetworks = config?.networks || [];

    const datastream = ((value) => (value !== '$datastream' ? value : ''))(getTemplateSrv().replace('$datastream'));
    const attribute = ((value) => (value !== '$attribute' ? value : ''))(getTemplateSrv().replace('$attribute'));
    const normalized = ((value) => value === 'true' || value === '$normalized')(
      getTemplateSrv().replace('$normalized')
    );
    const colorBar = config.colorBar;
    const minMeasurement = normalized
      ? NORMALIZED_MIN
      : ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : NORMALIZED_MIN))(
          getTemplateSrv().replace('$minimum')
        );

    const maxMeasurement = normalized
      ? NORMALIZED_MAX
      : ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : NORMALIZED_MAX))(
          getTemplateSrv().replace('$maximum')
        );

    const baseURL = config.baseURL || '';
    // Only update channelMapping & paddedSensorIds if the channel mapping input has changed.
    const channelMapping = updateChannelMapping(config, measurements);

    return {
      renderMode: renderMode,
      detectorType: detectorType,
      measurements: measurements,
      displayData: {
        selectedArrays: selectedArrays,
        selectedNetworks: selectedNetworks,
      },
      colorData: {
        colorBar: colorBar,
        minMeasurement: minMeasurement,
        maxMeasurement: maxMeasurement,
      },
      mappingData: {
        channelMapping: channelMapping,
        baseURL: baseURL,
      },
      variableData: {
        datastream: datastream,
        attribute: attribute,
        normalized: normalized,
      },
    };
  },

  registerOptionsUI: (builder: PanelOptionsEditorBuilder<CanvasElementOptions<DetectorConfig>>) => {
    const category = ['Detector'];
    builder
      .addBooleanSwitch({
        category,
        path: 'config.renderMode',
        name: 'Render Mode',
        settings: {
          id: 'display-mode-select',
          label: 'Display Mode Selection',
        },
        defaultValue: false,
      })
      .addSelect({
        category,
        path: 'config.detectorType',
        name: 'Detector Type Selection',
        settings: {
          options: detectorOptions,
          id: 'detector-type-select',
          label: 'Detector Type Selection',
        },
        defaultValue: getDefaultDetectorType(),
      })
      .addSelect({
        category,
        path: 'config.colorBar',
        name: 'Color Theme',
        settings: {
          options: colorBarOptions,
          id: 'colorbar-type-select',
          label: 'Colorbar Type Selection',
        },
        defaultValue: getDefaultColorBar(),
      })
      .addCustomEditor({
        category,
        id: 'measurements',
        path: 'config.measurements',
        name: 'Measurements',
        description: 'Select a field for the channel measurements.',
        settings: {
          id: 'measurement-field-select',
          label: 'Measurement Field Selector',
        },
        editor: ScalarFieldDimensionEditor,
      })
      .addTextInput({
        category,
        path: 'config.channelMappingInput',
        name: 'Channel Mapping Input',
        description: 'Input channels and they will be mapped to sensor ids in ascending order',
        settings: {
          id: 'channel-mapping-input',
          label: 'Channel Mapping Input',
        },
      })
      .addCustomEditor({
        category,
        id: 'arrays',
        path: 'config.arrays',
        name: 'Sensor Arrays',
        description: 'Select sensor arrays to display',
        settings: {
          id: 'sensor-array-select',
          label: 'Sensor Array Selector',
        },
        editor: DetectorArrayEditor,
        defaultValue: [],
      })
      .addCustomEditor({
        category,
        id: 'networks',
        path: 'config.networks',
        name: 'Networks',
        description: 'Select networks to display',
        settings: {
          id: 'network-select',
          label: 'Network Selector',
        },
        editor: DetectorNetworkEditor,
        defaultValue: [],
      })
      .addTextInput({
        category,
        path: 'config.baseURL',
        name: 'Base URL',
        description: 'Input the base URL to the time series panel.',
        settings: {
          id: 'base-url-input',
          label: 'Base URL Input',
        },
      });
  },
};

// Not used but should consider using this when time allows for aesthetic enhancements
export const getDetectorDynamicStyles = (validMeasurements: boolean, colorBar: ColorBar) => (theme: GrafanaTheme2) => ({
  detector: css({
    // TBD
  }),
  sensor: css({
    fillOpacity: '1',
    stroke: validMeasurements ? theme.colors.background.primary : ColorBarData[colorBar].scheme.invalidColor,
    strokeWidth: theme.spacing(0.1),
  }),
  darkSensor: css({
    fillOpacity: '1',
    stroke: 'black',
    strokeWidth: theme.spacing(0.1),
  }),
});

export const getDetectorStaticStyles = () => (theme: GrafanaTheme2) => ({
  outline: css({
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: theme.spacing(0.625),
  }),
  hoverText: css({
    fontSize: theme.typography.bodySmall.fontSize,
    fontFamily: theme.typography.fontFamilyMonospace,
    fill: theme.colors.text.primary,
    strokeWidth: theme.spacing(0.01),
    textShadow: `1px 1px 2px ${theme.colors.background.canvas}`,
  }),
});

export const getModuleDataLogic = (
  data: DetectorData,
  config: DetectorConfig,
  isPanelEditing: boolean
): ModuleDisplayData => {
  let moduleDisplayData: ModuleDisplayData;

  if (isPanelEditing || !config.moduleDisplayData) {
    moduleDisplayData = getModuleDisplayData(data.detectorType)({
      data,
      extents: DETECTOR_EXTENTS,
    });
    config.moduleDisplayData = moduleDisplayData;
  } else {
    moduleDisplayData = {
      hexagons: config.moduleDisplayData.hexagons,
      sensors: updateSensorMeasurements(
        config.moduleDisplayData.sensors,
        data.measurements,
        data.colorData,
        data.variableData.normalized,
        data.renderMode
      ),
    };
  }

  return moduleDisplayData;
};

// const canvasRef = useRef<HTMLCanvasElement>(null);
// const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
// const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);
// const [offscreenContext, setOffscreenContext] = useState<OffscreenCanvasRenderingContext2D | null>(null);

// useEffect(() => {
//   if (canvasRef.current) {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d', { alpha: true });
//     setCanvasContext(ctx);

//     // Create offscreen canvas
//     const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
//     const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: true });
//     setOffscreenContext(offscreenCtx);
//     offscreenCanvasRef.current = offscreenCanvas;
//   }
// }, []);

// useEffect(() => {
//   if (data?.renderMode && offscreenContext && canvasContext) {
//     drawDetector(offscreenContext, data);
//     // Copy from offscreen canvas to main canvas
//     canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
//     canvasContext.drawImage(offscreenCanvasRef.current!, 0, 0);
//   }
// });

// if (data.renderMode) {
//   return (
//     <canvas
//       ref={canvasRef}
//       width={DETECTOR_LAYOUT.VIEWBOX.WIDTH}
//       height={DETECTOR_LAYOUT.VIEWBOX.HEIGHT}
//       style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
//     />
//   );
// }

// const drawColorBar = (
//   ctx: OffscreenCanvasRenderingContext2D,
//   colorBar: ColorBar,
//   minMeasurement: number,
//   maxMeasurement: number,
//   normalized: boolean,
//   dimensions: {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//   }
// ) => {
//   const scheme: ColorBarScheme = ColorBarData[colorBar].scheme;
//   const { colors, highColor, lowColor } = scheme;

//   const mainColorBarHeight = dimensions.height * 0.875;
//   const indicatorHeight = dimensions.height * 0.05;
//   const colorBarWidth = dimensions.width * 0.75;

//   const [min, max] = normalized ? [-1.0, 1.0] : [minMeasurement, maxMeasurement];

//   // Draw main color bar
//   const gradient = ctx.createLinearGradient(
//     dimensions.x,
//     dimensions.y + indicatorHeight * 2 + mainColorBarHeight,
//     dimensions.x,
//     dimensions.y + indicatorHeight * 2
//   );
//   colors.forEach((color: string, index: number) => {
//     gradient.addColorStop(index / (colors.length - 1), color);
//   });

//   ctx.fillStyle = gradient;
//   ctx.fillRect(dimensions.x, dimensions.y + indicatorHeight * 2, colorBarWidth, mainColorBarHeight);

//   // Draw indicator bars for normalized data
//   if (normalized) {
//     ctx.fillStyle = highColor;
//     ctx.fillRect(dimensions.x, dimensions.y, colorBarWidth, indicatorHeight);

//     ctx.fillStyle = lowColor;
//     ctx.fillRect(dimensions.x, dimensions.y + indicatorHeight * 3 + mainColorBarHeight, colorBarWidth, indicatorHeight);
//   }

//   // Draw text
//   ctx.fillStyle = 'white';
//   ctx.font = '12px Arial';
//   ctx.textAlign = 'center';
//   ctx.fillText(max.toString(), dimensions.x + colorBarWidth / 2, dimensions.y + indicatorHeight * 1.75);
//   ctx.fillText(
//     min.toString(),
//     dimensions.x + colorBarWidth / 2,
//     dimensions.y + indicatorHeight * 2.2 + mainColorBarHeight + 12
//   );
// };

// const drawDetector = (ctx: OffscreenCanvasRenderingContext2D, data: DetectorData) => {
//   const SEMICIRCLE_COUNT = 30000;
//   const width = ctx.canvas.width;
//   const height = ctx.canvas.height;

//   // Clear the canvas
//   ctx.clearRect(0, 0, width, height);
//   const dimensions = {
//     x: DETECTOR_LAYOUT.VIEWBOX.START_X,
//     y: DETECTOR_LAYOUT.VIEWBOX.START_Y,
//     width: DETECTOR_LAYOUT.VIEWBOX.WIDTH,
//     height: DETECTOR_LAYOUT.VIEWBOX.HEIGHT,
//   };
//   drawColorBar(
//     ctx,
//     data.colorData.colorBar,
//     data.colorData.minMeasurement,
//     data.colorData.maxMeasurement,
//     data.variableData.normalized,
//     dimensions
//   );
//   // Calculate grid dimensions
//   const columns = Math.ceil(Math.sqrt(SEMICIRCLE_COUNT / 2));
//   const rows = Math.ceil(SEMICIRCLE_COUNT / (2 * columns));
//   const cellWidth = width / columns;
//   const cellHeight = height / rows;
//   const radius = Math.min(cellWidth, cellHeight) * 0.4;

//   // Pre-calculate semicircle positions and angles
//   const semicircles = new Array(SEMICIRCLE_COUNT);
//   for (let i = 0; i < SEMICIRCLE_COUNT; i++) {
//     const col = Math.floor(i / (2 * rows));
//     const row = i % (2 * rows);
//     const x = (col + 0.5) * cellWidth;
//     const y = (row + 0.5) * cellHeight;
//     const startAngle = i % 2 === 0 ? 0 : Math.PI;
//     semicircles[i] = { x, y, startAngle };
//   }

//   // Draw semicircles
//   for (let i = 0; i < SEMICIRCLE_COUNT; i++) {
//     const { x, y, startAngle } = semicircles[i];
//     ctx.beginPath();
//     ctx.arc(x, y, radius, startAngle, startAngle + Math.PI);
//     ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`; // Replace with actual color data
//     ctx.fill();
//   }
// };
