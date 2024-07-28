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
import { VIEWBOX_MODULE_EXTENT, VIEWBOX_LAYOUT } from './layout';
import { detectorOptions, getDefaultDetectorType } from './modules/dataUtils';
import {
  DetectorType,
  GenerateModuleDisplay,
  getModuleDisplayData,
  ModuleDisplayData,
  updateSensorMeasurements,
} from './modules/moduleFactory';
import { updateChannelMapping } from './utils/sensorUtils';

export interface DetectorData {
  // True -> render mode (canvas, no hover text/link), False -> display mode (svg, hover text & link)
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
      viewBox={`${VIEWBOX_LAYOUT.VIEWBOX.START_X} ${VIEWBOX_LAYOUT.VIEWBOX.START_Y}
                ${VIEWBOX_LAYOUT.VIEWBOX.WIDTH} ${VIEWBOX_LAYOUT.VIEWBOX.HEIGHT}`}
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
            x: VIEWBOX_LAYOUT.COLORBAR.X,
            y: VIEWBOX_LAYOUT.COLORBAR.Y,
            width: VIEWBOX_LAYOUT.COLORBAR.WIDTH,
            height: VIEWBOX_LAYOUT.COLORBAR.HEIGHT,
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
    width: VIEWBOX_LAYOUT.VIEWBOX.WIDTH,
    height: VIEWBOX_LAYOUT.VIEWBOX.HEIGHT,
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

// TODO: Sensor links will not update properly if the datastream, attribute, or normalized values change
// Need to go into edit mode to update the links if in render mode...
// Not ideal but not sure it is worth updating them in render mode since sensors are not clickable anyway.
export const getModuleDataLogic = (
  data: DetectorData,
  config: DetectorConfig,
  isPanelEditing: boolean
): ModuleDisplayData => {
  let moduleDisplayData: ModuleDisplayData;

  if (!data.renderMode || isPanelEditing || !config.moduleDisplayData) {
    moduleDisplayData = getModuleDisplayData(data.detectorType)({
      data,
      viewboxModuleExtent: VIEWBOX_MODULE_EXTENT,
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
