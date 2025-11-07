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
import { ChannelMappingViewer } from './editors/ChannelMappingViewer';
import { MinMaxSelectionEditor } from './editors/MinMaxSelectionEditor';
import { NetworkArrayEditor } from './editors/NetworkArrayEditor';
import { DetectorCanvas } from './renderers/canvas';
import { DetectorSVG } from './renderers/svg';
import { VIEWBOX_LAYOUT } from './utils/layout';
import { POOL_CONFIG } from './utils/poolConfig';
import PoolFactory from './utils/poolFactory';

export enum DisplayMode {
  DISPLAY,
  RENDER,
  FAST_RENDER,
}

export interface DetectorData {
  displayMode: DisplayMode;
  detectorType: string;
  networkMeasurements: Map<string, Float32Array>;
  displayData: DetectorDisplayData;
  colorData: DetectorColorData;
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

export interface DetectorConfig {
  measurements?: ScalarDimensionConfig;
  displayMode: DisplayMode;
  detectorType: string;
  networksByArray: { [arrayName: string]: string[] };
  colorBar: ColorBar;
  colorBarRange: {
    min: { value: number };
    max: { value: number };
  };
  flatArrayMode?: boolean;
  DetectorComponentData?: DetectorComponentData;
}

const DetectorDisplay: React.FC<CanvasElementProps<DetectorConfig, DetectorData>> = (props) => {
  const { config, data } = props;
  const context = usePanelContext();

  useEffect(() => {
    PoolFactory.initializePools(POOL_CONFIG.MAX_SENSOR_CAPACITY);
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
  ) : (
    <DetectorSVG detectorComponentData={detectorComponentData} data={data} />
  );
};

export const DEFAULT_DETECTOR_SETTINGS = {
  TYPE: getDefaultDetectorType(),
  COLORBAR: getDefaultColorBar(),
} as const;

/**
 * Apply channel mapping to raw measurement data
 * If mapping exists: sensor[i] = measurements[mapping[i]]
 * If no mapping: sensor[i] = measurements[i] (sequential, default behavior)
 */
const applyChannelMapping = (
  rawMeasurements: Float32Array,
  networkId: string,
  mappingPool: ReturnType<typeof PoolFactory.getChannelMappingPool>
): Float32Array => {
  const mapping = mappingPool.getNetworkMapping(networkId);

  if (!mapping) {
    // No mapping exists - use default sequential behavior
    return rawMeasurements;
  }

  // Apply mapping: create new array where sensor[i] gets measurement[mapping[i]]
  const mappedValues = new Float32Array(mapping.length);

  for (let i = 0; i < mapping.length; i++) {
    const sourceIdx = mapping[i];
    // Handle out-of-bounds indices gracefully
    mappedValues[i] = sourceIdx < rawMeasurements.length ? rawMeasurements[sourceIdx] : NaN;
  }

  return mappedValues;
};

export const detectorItem: CanvasElementItem<DetectorConfig, DetectorData> = {
  id: 'detector',
  name: 'Detector',
  description: 'Detector element for live-viewing',
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
      networksByArray: {},
      colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
      colorBarRange: {
        min: { value: DEFAULT_MIN },
        max: { value: DEFAULT_MAX },
      },
      flatArrayMode: false, // Default to network-mapped mode
      inEditMode: true,
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: CanvasElementOptions<DetectorConfig>): DetectorData => {
    const dataPool = PoolFactory.getDetectorPool();
    const mappingPool = PoolFactory.getChannelMappingPool();

    if (!cfg.config) {
      dataPool.reset();
      return dataPool.getDetectorData(DisplayMode.DISPLAY, DEFAULT_DETECTOR_SETTINGS.TYPE);
    }

    const config = cfg.config;

    // Derive arrays and create composite network IDs
    const selectedArrays = Object.keys(config.networksByArray || {});
    const selectedNetworks: string[] = [];

    // Create composite network IDs
    for (const [arrayName, networks] of Object.entries(config.networksByArray || {})) {
      for (const network of networks) {
        selectedNetworks.push(`${arrayName}:${network}`);
      }
    }

    if (config.measurements) {
      const scalarResult = ctx.getScalar(config.measurements);
      const rawValues = scalarResult.field?.values || [];

      // Check if this is a config message
      const messageType = scalarResult.field?.config?.custom?.messageType;
      if (messageType === 'config') {
        // Config message - extract and store channel mappings
        if (rawValues.length > 0) {
          const configData = rawValues[rawValues.length - 1];
          const channelMappings = configData?.channelMappings;

          if (channelMappings && typeof channelMappings === 'object') {
            // Convert object to Map for storage
            // Expected format: { "AL LEFT:1": [0, 5, 10, ...], "TIN:2": [...] }
            const mappingsMap = new Map<string, number[]>();
            for (const [networkId, indices] of Object.entries(channelMappings)) {
              if (Array.isArray(indices)) {
                mappingsMap.set(networkId, indices as number[]);
              }
            }

            // Store all mappings in the pool
            mappingPool.updateAllMappings(mappingsMap);

            console.log(
              `Detector: Channel mappings stored for ${mappingsMap.size} networks`,
              Array.from(mappingsMap.keys())
            );
          }
        }

        // Don't process measurements for config messages, just return current state
        dataPool.updateDisplayData(selectedArrays, selectedNetworks);
        return dataPool.getDetectorData(config.displayMode, config.detectorType);
      }

      if (rawValues.length > 0) {
        const displayValue = rawValues[rawValues.length - 1];
        const useFlatArrayMode = config.flatArrayMode === true;

        // Clear previous measurements before adding new ones
        dataPool.clearNetworkMeasurements();

        // Flat array mode is primarily for testing purposes
        if (useFlatArrayMode) {
          // Flat array mode: distribute single array to all selected networks
          if (Array.isArray(displayValue)) {
            // Direct array of values
            for (const networkId of selectedNetworks) {
              // Store directly to this network's buffer
              const storedArray = dataPool.setNetworkMeasurements(networkId, displayValue);
              // Apply channel mapping
              const mapped = applyChannelMapping(storedArray, networkId, mappingPool);
              // If mapping created a new array, store it back
              if (mapped !== storedArray) {
                dataPool.setNetworkMeasurements(networkId, mapped);
              }
            }
          } else if (typeof displayValue === 'object' && displayValue !== null) {
            // Could be an object with a single array property
            const values = Object.values(displayValue)[0];
            if (Array.isArray(values)) {
              for (const networkId of selectedNetworks) {
                const storedArray = dataPool.setNetworkMeasurements(networkId, values);
                const mapped = applyChannelMapping(storedArray, networkId, mappingPool);
                if (mapped !== storedArray) {
                  dataPool.setNetworkMeasurements(networkId, mapped);
                }
              }
            }
          } else if (typeof displayValue === 'number') {
            // Single flat array of numbers from multiple time points
            for (const networkId of selectedNetworks) {
              const storedArray = dataPool.setNetworkMeasurements(networkId, rawValues as number[]);
              const mapped = applyChannelMapping(storedArray, networkId, mappingPool);
              if (mapped !== storedArray) {
                dataPool.setNetworkMeasurements(networkId, mapped);
              }
            }
          }
        } else {
          // Network-mapped mode: expect object with network IDs as keys
          if (typeof displayValue === 'object' && !Array.isArray(displayValue) && displayValue !== null) {
            for (const [arrayName, networks] of Object.entries(config.networksByArray || {})) {
              for (const network of networks) {
                const compositeId = `${arrayName}:${network}`;
                // Try both composite ID and simple network ID for compatibility
                const values = (displayValue as any)[compositeId] || (displayValue as any)[network];
                if (Array.isArray(values)) {
                  // Store values directly to this network's pooled buffer
                  const storedArray = dataPool.setNetworkMeasurements(compositeId, values);
                  // Apply channel mapping if it exists, otherwise storedArray is used as-is
                  const mapped = applyChannelMapping(storedArray, compositeId, mappingPool);
                  // If mapping created a new array, store it back to the pool
                  if (mapped !== storedArray) {
                    dataPool.setNetworkMeasurements(compositeId, mapped);
                  }
                }
              }
            }
          }
        }
      }
    }

    const minMeasurement = config.colorBarRange.min.value;
    const maxMeasurement = config.colorBarRange.max.value;
    const { min: validMin, max: validMax } =
      minMeasurement < maxMeasurement
        ? { min: minMeasurement, max: maxMeasurement }
        : { min: DEFAULT_MIN, max: DEFAULT_MAX };

    dataPool.updateDisplayData(selectedArrays, selectedNetworks);
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
        id: 'networksByArray',
        path: 'config.networksByArray',
        name: 'Network Selection',
        description: 'Select networks for each array',
        editor: NetworkArrayEditor,
        defaultValue: {},
      })
      .addBooleanSwitch({
        category,
        path: 'config.flatArrayMode',
        name: 'Flat Array Mode',
        description: 'Enable this for test data that uses a single array distributed to all networks',
        defaultValue: false,
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
      })
      .addCustomEditor({
        category,
        id: 'channelMappings',
        path: 'config.channelMappings',
        name: 'Channel Mappings',
        description: 'View current channel mappings configured via backend config messages',
        editor: ChannelMappingViewer,
        defaultValue: {},
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
