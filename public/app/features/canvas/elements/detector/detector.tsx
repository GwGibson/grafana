import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2, PanelOptionsEditorBuilder } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { ScalarDimensionConfig } from '@grafana/schema';
import { useStyles2 } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions';
import { ScalarFieldDimensionEditor } from 'app/features/dimensions/editors';

import { CanvasElementItem, CanvasElementOptions, CanvasElementProps } from '../../element';

import { ColorBar, ColorBarData, ColorBarDisplay, colorBarOptions, getDefaultColorBar } from './colorbar/colorbar';
import { DetectorArrayEditor, DetectorNetworkEditor } from './detectorEditors';
import { DETECTOR_EXTENTS, DETECTOR_LAYOUT } from './layout';
import { DetectorType, detectorOptions, getDetectorComponent, getDefaultDetectorType } from './types';
import { updateChannelMapping } from './utils/sensorUtils';

export interface DetectorData {
  detectorType: DetectorType;
  measurementData: DetectorMeasurementData;
  colorData: DetectorColorData;
  mappingData: DetectorMappingData;
  variableData: DetectorVariableData;
}

export interface DetectorMeasurementData {
  measurements: number[];
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
  paddedSensorIds: string[];
  baseURL: string;
}

export interface DetectorVariableData {
  datastream: string;
  attribute: string;
  normalized: boolean;
}

export interface DetectorConfig {
  detectorType: DetectorType;
  measurements?: ScalarDimensionConfig;
  arrays: string[];
  networks: string[];
  baseURL: string;
  channelMappingInput: string;
  lastMappingConfigs: DetectorMappingConfig;
  colorBar: ColorBar;
}

interface DetectorMappingConfig {
  channelMappingInput: string;
  channelMapping: number[];
  paddedSensorIds: string[];
}

// Should build this in 3 components -> Permanent Layout -> Mapping Update -> Color Update
// Not sure why memoization isn't working. Probably necessary particulary for the initial layout.
export const DetectorDisplay: React.FC<CanvasElementProps<DetectorConfig, DetectorData>> = (props) => {
  const { data } = props;
  const staticStyles = useStyles2(getDetectorStaticStyles());

  return data ? (
    <svg
      viewBox={`-10 -10 ${DETECTOR_LAYOUT.VIEWBOX.WIDTH} ${DETECTOR_LAYOUT.VIEWBOX.HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
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
        {data &&
          data.detectorType &&
          (() => {
            const DetectorComponent = getDetectorComponent(data.detectorType as DetectorType);
            return <DetectorComponent data={data} extents={DETECTOR_EXTENTS} />;
          })()}
      </g>
    </svg>
  ) : null;
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
      detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
      arrays: [],
      networks: [],
      baseURL: '',
      channelMappingInput: '',
      lastMappingConfigs: { channelMappingInput: '', channelMapping: [], paddedSensorIds: [] },
      colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: CanvasElementOptions<DetectorConfig>): DetectorData => {
    if (!cfg.config) {
      // Return some default/empty DetectorData if config is not defined
      return {
        detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
        measurementData: {
          measurements: [],
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
          paddedSensorIds: [],
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
    const minMeasurement = ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : -1))(
      getTemplateSrv().replace('$minimum')
    );
    const maxMeasurement = ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : 1))(
      getTemplateSrv().replace('$maximum')
    );

    const baseURL = config.baseURL || '';
    // Only update channelMapping & paddedSensorIds if the channel mapping input has changed.
    const { channelMapping, paddedSensorIds } = updateChannelMapping(config, measurements);

    return {
      detectorType: detectorType,
      measurementData: {
        measurements: measurements,
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
        paddedSensorIds: paddedSensorIds,
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
      .addSelect({
        category,
        path: 'config.detectorType',
        name: 'Type',
        settings: {
          options: detectorOptions,
        },
        defaultValue: getDefaultDetectorType(),
      })
      .addSelect({
        category,
        path: 'config.colorBar',
        name: 'Color Theme',
        settings: {
          options: colorBarOptions,
        },
        defaultValue: getDefaultColorBar(),
      })
      .addCustomEditor({
        category,
        id: 'measurements',
        path: 'config.measurements',
        name: 'Measurements',
        description: 'Select a field for the channel measurements.',
        editor: ScalarFieldDimensionEditor,
      })
      .addTextInput({
        category,
        path: 'config.channelMappingInput',
        name: 'Channel Mapping Input',
        description: 'Input channels and they will be mapped to sensor ids in ascending order',
      })
      .addCustomEditor({
        category,
        id: 'arrays',
        path: 'config.arrays',
        name: 'Sensor Arrays',
        description: 'Select sensor arrays to display',
        editor: DetectorArrayEditor,
        defaultValue: [],
      })
      .addCustomEditor({
        category,
        id: 'networks',
        path: 'config.networks',
        name: 'Networks',
        description: 'Select networks to display',
        editor: DetectorNetworkEditor,
        defaultValue: [],
      })
      .addTextInput({
        category,
        path: 'config.baseURL',
        name: 'Base URL',
        description: 'Input the base URL to the time series panel.',
      });
  },
};

export const getDetectorDynamicStyles = (data: DetectorData | undefined) => (theme: GrafanaTheme2) => ({
  detector: css({
    fill:
      (data?.measurementData.measurements ?? []).length > 0
        ? 'white'
        : ColorBarData[data?.colorData.colorBar ?? getDefaultColorBar()].scheme.invalidColor,
  }),
  sensor: css({
    fillOpacity: '1',
    stroke:
      (data?.measurementData.measurements ?? []).length > 0
        ? theme.colors.background.primary
        : ColorBarData[data?.colorData.colorBar ?? getDefaultColorBar()].scheme.invalidColor,
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
