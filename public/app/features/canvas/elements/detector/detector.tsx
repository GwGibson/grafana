import { css } from '@emotion/css';

import { GrafanaTheme2, PanelOptionsEditorBuilder, SelectableValue } from '@grafana/data';
import { ScalarDimensionConfig } from '@grafana/schema';
import { usePanelContext } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions';
import { ScalarFieldDimensionEditor } from 'app/features/dimensions/editors';
import { APIEditor } from 'app/plugins/panel/canvas/editor/element/APIEditor';

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
import { VIEWBOX_LAYOUT } from './utils/layout';

export enum DisplayMode {
  SVG_DISPLAY,
  SVG_RENDER,
  FAST_RENDER,
}

export interface DetectorData {
  // display mode will have hover text & links and generate the module display data on the fly
  displayMode: DisplayMode;
  detectorType: string;
  measurements: number[];
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
  // [channel] -> maps to sensor ids in ascending order
  channelMapping: number[];
  baseURL: string;
}

export interface DetectorConfig {
  measurements?: ScalarDimensionConfig;
  displayMode: DisplayMode;
  detectorType: string;
  arrays: string[];
  networks: string[];
  baseURL: string;
  channelMappingInput: string;
  colorBar: ColorBar;
  colorBarRange: {
    min: { value: number };
    max: { value: number };
  };
  DetectorComponentData?: DetectorComponentData;
  // Need to store colorscheme map and configuration info in here too I think
  // Lazy load and store here so we can use it and then swap it out when we
  // are in edit more or something
}

const DetectorDisplay: React.FC<CanvasElementProps<DetectorConfig, DetectorData>> = (props) => {
  const { config, data } = props;
  const context = usePanelContext();

  if (!data) {
    return null;
  }

  const scene = context.instanceState?.scene;
  const detectorComponentData = getDetectorComponentData(data, config, scene?.isPanelEditing || false);

  return config.displayMode === DisplayMode.FAST_RENDER ? (
    <DetectorCanvas detectorComponentData={detectorComponentData} data={data} />
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
      displayMode: DisplayMode.SVG_DISPLAY,
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
    // TODO: Only need to update measurements unless we are in editing mode.
    // Should store all previous settings in config and only update the measurements
    // unless we are in edit mode (if not in edit mode, nothing else can change).
    if (!cfg.config) {
      // Return some default/empty DetectorData if config is not defined
      return {
        displayMode: DisplayMode.SVG_DISPLAY,
        detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
        measurements: [],
        displayData: {
          selectedArrays: [],
          selectedNetworks: [],
        },
        colorData: {
          colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
          minMeasurement: DEFAULT_MIN,
          maxMeasurement: DEFAULT_MAX,
        },
        mappingData: {
          channelMapping: [],
          baseURL: '',
        },
      };
    }

    // Only really need to update measurements unless we are in edit more but for now we will update everything
    // Unsure if it is worthwhile optimization to skip updates when we are in edit mode as it is not clear
    // how to determine if we are in edit mode here. Can update configs in DetectorDisplay but that is not ideal.
    const config = cfg.config;
    const measurements = (config.measurements && ctx.getScalar(config.measurements).field?.values) || [];

    const minMeasurement = config.colorBarRange.min.value;
    const maxMeasurement = config.colorBarRange.max.value;
    // Ensure min < max and use defaults if not
    const { min: validMin, max: validMax } =
      minMeasurement < maxMeasurement
        ? { min: minMeasurement, max: maxMeasurement }
        : { min: DEFAULT_MIN, max: DEFAULT_MAX };

    // TODO: This should definitely only be updated if we are in edit mode or if the mapping has changed
    // If channelMappingInput is empty, create identity mapping string
    if (!config.channelMappingInput?.trim()) {
      const mappingPairs = Array.from({ length: measurements.length }, (_, i) => `${i + 1}:${i + 1}`);
      config.channelMappingInput = mappingPairs.join(', ');
    }
    const channelMapping = parseChannelMapping(config.channelMappingInput);

    return {
      displayMode: config.displayMode,
      detectorType: config.detectorType,
      measurements: measurements,
      displayData: {
        selectedArrays: config?.arrays || [],
        selectedNetworks: config?.networks || [],
      },
      colorData: {
        colorBar: config.colorBar,
        minMeasurement: validMin,
        maxMeasurement: validMax,
      },
      mappingData: {
        channelMapping: channelMapping,
        baseURL: '', // TODO: turn this back into an options input
      },
    };
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
            { label: 'SVG Display', value: DisplayMode.SVG_DISPLAY },
            { label: 'SVG Render', value: DisplayMode.SVG_RENDER },
            { label: 'Fast Render', value: DisplayMode.FAST_RENDER },
          ] as Array<SelectableValue<DisplayMode>>,
        },
        defaultValue: DisplayMode.SVG_DISPLAY,
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
      .addCustomEditor({
        category,
        id: 'api-channel-mapping-input',
        path: 'config.apiChannelMappingInput',
        name: 'API Channel Mapping Input',
        description: 'For demo purposes - currently non functional',
        editor: APIEditor,
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

const parseChannelMapping = (inputText: string): number[] => {
  if (!inputText.trim().length) {
    return [];
  }

  try {
    const pairs = inputText.split(',').map((s) => s.trim());
    const result: number[] = [];

    for (const pair of pairs) {
      const [sensorStr, channelStr] = pair.split(':').map((s) => s.trim());
      const sensor = parseInt(sensorStr, 10);
      const channel = parseInt(channelStr, 10);

      if (isNaN(sensor) || isNaN(channel)) {
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
