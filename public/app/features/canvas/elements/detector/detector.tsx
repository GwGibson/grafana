import { css } from '@emotion/css';
import React, { useEffect, useRef } from 'react';

import { GrafanaTheme2, PanelOptionsEditorBuilder, SelectableValue } from '@grafana/data';
import { ScalarDimensionConfig } from '@grafana/schema';
import { usePanelContext } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions/context';
import { ScalarFieldDimensionEditor } from 'app/features/dimensions/editors';

import { CanvasElementItem, CanvasElementOptions, CanvasElementProps } from '../../element';

import {
  ColorBar,
  ColorBarData,
  colorBarOptions,
  DEFAULT_MAX,
  DEFAULT_MIN,
  getDefaultColorBar,
} from './colorbar/colorbar';
import { detectorOptions, getDefaultDetectorType } from './detectors/data/componentMap';
import { getDetectorComponentData, DetectorComponentData } from './detectors/detectorFactory';
import { DetectorArrayEditor, DetectorNetworkEditor } from './editors/ArrayNetworkSelectionEditor';
import { MinMaxSelectionEditor } from './editors/MinMaxSelectionEditor';
import { DetectorCanvas } from './renderers/canvas';
import { DetectorSVG } from './renderers/svg';
import { DetectorWebGLCanvas } from './renderers/webGL';
import { VIEWBOX_LAYOUT } from './utils/layout';
import PoolFactory from './utils/poolFactory';

export enum DisplayMode {
  DISPLAY,
  RENDER,
  FAST_RENDER,
}

export interface DetectorData {
  displayMode: DisplayMode;
  detectorType: string;
  measurements: Float32Array;
  displayData: DetectorDisplayData;
  colorData: DetectorColorData;
  mappingData: DetectorMappingData;
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
  channelMapping: Int32Array;
}

export interface DetectorConfig {
  measurements?: ScalarDimensionConfig;
  displayMode: DisplayMode;
  detectorType: string;
  arrays: string[];
  networks: string[];
  channelMappingInput: string;
  colorBar: ColorBar;
  colorBarRange: {
    min: { value: number };
    max: { value: number };
  };
  DetectorComponentData?: DetectorComponentData;
}

const DetectorDisplay: React.FC<CanvasElementProps<DetectorConfig, DetectorData>> = (props) => {
  const { config, data } = props;
  const context = usePanelContext();

  // Initialize pools with matching capacity on first render
  // TODO: Allow user to configure capacity via panel option? Or just set a high default?
  // I think ~30,000 is the max should ask Zach :( (Darshan)
  useEffect(() => {
    PoolFactory.initializePools(20000);
  }, []);

  const sensorPoolRef = useRef(PoolFactory.getSensorPool());
  const prevConfigRef = useRef<DetectorConfig>();

  // Clear sensor cache when color scheme changes
  useEffect(() => {
    if (prevConfigRef.current?.colorBar !== config.colorBar) {
      sensorPoolRef.current.clearColorCache();
    }
    prevConfigRef.current = config;
  }, [config]);

  if (!data) {
    return null;
  }

  const scene = context.instanceState?.scene;
  const detectorComponentData = getDetectorComponentData(
    data,
    config,
    scene?.isPanelEditing || false,
    sensorPoolRef.current
  );

  return config.displayMode === DisplayMode.RENDER ? (
    <DetectorCanvas detectorComponentData={detectorComponentData} data={data} />
  ) : config.displayMode === DisplayMode.FAST_RENDER ? (
    <DetectorWebGLCanvas detectorComponentData={detectorComponentData} data={data} />
  ) : (
    <DetectorSVG detectorComponentData={detectorComponentData} data={data} />
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
      displayMode: DisplayMode.DISPLAY,
      detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
      arrays: [],
      networks: [],
      baseURL: '',
      channelMappingInput: '',
      colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
      colorBarRange: {
        min: { value: DEFAULT_MIN },
        max: { value: DEFAULT_MAX },
      },
      inEditMode: true,
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: CanvasElementOptions<DetectorConfig>): DetectorData => {
    const dataPool = PoolFactory.getDetectorPool();

    if (!cfg.config) {
      dataPool.reset();
      return dataPool.getDetectorData(DisplayMode.DISPLAY, DEFAULT_DETECTOR_SETTINGS.TYPE);
    }

    const config = cfg.config;

    let measurementsView: Float32Array;
    if (config.measurements) {
      const scalarResult = ctx.getScalar(config.measurements);
      const rawValues = scalarResult.field?.values || [];

      if (rawValues.length > 0) {
        if (Array.isArray(rawValues[0])) {
          // Use the first (most recent) array of measurements
          measurementsView = dataPool.updateMeasurements(rawValues[0]);
        } else {
          // Flat array of values
          measurementsView = dataPool.updateMeasurements(rawValues);
        }
      } else {
        measurementsView = dataPool.updateMeasurements([]);
      }
    } else {
      measurementsView = dataPool.updateMeasurements([]);
    }

    // Validate and update color range
    const minMeasurement = config.colorBarRange.min.value;
    const maxMeasurement = config.colorBarRange.max.value;
    const { min: validMin, max: validMax } =
      minMeasurement < maxMeasurement
        ? { min: minMeasurement, max: maxMeasurement }
        : { min: DEFAULT_MIN, max: DEFAULT_MAX };

    // Update channel mapping
    if (!config.channelMappingInput?.trim()) {
      const mappingPairs = Array.from({ length: measurementsView.length }, (_, i) => `${i + 1}:${i + 1}`);
      config.channelMappingInput = mappingPairs.join(', ');
    }
    const channelMapping = parseChannelMapping(config.channelMappingInput);
    dataPool.updateChannelMapping(channelMapping);

    // Update all data in place (no new allocations)
    dataPool.updateDisplayData(config.arrays || [], config.networks || []);
    dataPool.updateColorData(config.colorBar, validMin, validMax);
    return dataPool.getDetectorData(config.displayMode, config.detectorType);
  },

  registerOptionsUI: (builder: PanelOptionsEditorBuilder<CanvasElementOptions<DetectorConfig>>) => {
    const category = ['Detector'];
    builder
      .addRadio({
        category,
        path: 'config.displayMode',
        name: 'Display Mode',
        settings: {
          options: [
            { label: 'Info', value: DisplayMode.DISPLAY },
            { label: 'Render', value: DisplayMode.RENDER },
            // { label: 'Experimental', value: DisplayMode.FAST_RENDER }, // Does not seem necessary with new pool implementations
          ] as Array<SelectableValue<DisplayMode>>,
        },
        defaultValue: DisplayMode.DISPLAY,
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
        path: 'config.channelMappingInput',
        name: 'Channel Mapping Input',
        description: 'Input channel to sensor pairs in the form 1:1, 2:200, ...',
        settings: {
          id: 'channel-mapping-input',
          label: 'Channel Mapping Input',
        },
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
        id: 'colorBarRange',
        path: 'config.colorBarRange',
        name: 'Color Bar Range',
        description: 'Set the min and max values for the color bar',
        editor: MinMaxSelectionEditor,
        defaultValue: {
          min: { value: DEFAULT_MIN },
          max: { value: DEFAULT_MAX },
        },
      });
  },
};

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

const parseChannelMapping = (inputText: string): number[] => {
  if (!inputText.trim().length) {
    return [];
  }

  try {
    const pairs = inputText.split(',').map((s) => s.trim());
    const result: number[] = [];

    for (const pair of pairs) {
      const [channelStr, sensorStr] = pair.split(':').map((s) => s.trim());
      const channel = parseInt(channelStr, 10);
      const sensor = parseInt(sensorStr, 10);

      if (isNaN(channel) || isNaN(sensor)) {
        console.warn(`Invalid mapping pair: ${pair}. Skipping.`);
        continue;
      }

      // Subtract 1 from sensor index to convert from 1-based to 0-based
      const sensorIndex = sensor - 1;

      // Make the array long enough to hold this index
      if (sensorIndex >= result.length) {
        result.length = sensorIndex + 1;
      }

      result[sensorIndex] = channel;
    }

    return result;
  } catch (error) {
    console.error('Error parsing channel mapping:', error);
    return [];
  }
};
