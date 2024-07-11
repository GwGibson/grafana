import { css } from '@emotion/css';

import { GrafanaTheme2, PanelOptionsEditorBuilder } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { ScalarDimensionConfig } from '@grafana/schema';
import { usePanelContext, useStyles2 } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions';
import { ScalarFieldDimensionEditor } from 'app/features/dimensions/editors';

import { CanvasElementItem, CanvasElementOptions, CanvasElementProps } from '../../element';

import { colorBarMap, ColorBar, ColorbarDisplay } from './colorbar/colorbar';
import { DetectorArrayEditor, DetectorNetworkEditor } from './detectorEditors';
import { DETECTOR_EXTENTS, DETECTOR_LAYOUT } from './layout';
import { DetectorType, DetectorBlast, DetectorPrimeCam280 } from './types';
import { updateChannelMapping } from './utils/sensorUtils';

export interface DetectorData {
  detectorType: DetectorType;
  measurementData: DetectorMeasurementData;
  colorData: DetectorColorData;
  mappingData: DetectorMappingData;
  variableData: DetectorVariableData;
}

interface DetectorMeasurementData {
  measurements: number[];
  selectedArrays: string[];
  selectedNetworks: string[];
}

interface DetectorColorData {
  colorBar: ColorBar;
  minMeasurement: number;
  maxMeasurement: number;
}

interface DetectorMappingData {
  // [channel] -> maps to sensor ids in ascending order
  channelMapping: number[];
  paddedSensorIds: string[];
  baseURL: string;
}

interface DetectorVariableData {
  datastream: string;
  attribute: string;
  normalized: boolean;
}

export interface DetectorConfig {
  measurements?: ScalarDimensionConfig;
  arrays: string[];
  networks: string[];
  baseURL: string;
  channelMappingInput: string;
  channelMappingInputHash: string;
  detectorType: DetectorType;
  lastDetectorType: DetectorType;
  colorBar: ColorBar;
  lastMappingConfigs: DetectorMappingConfig;
}

interface DetectorMappingConfig {
  channelMappingInput: string;
  channelMapping: number[];
  paddedSensorIds: string[];
}

const DetectorDisplay = (props: CanvasElementProps<DetectorConfig, DetectorData>) => {
  // console.log("Detector Display called!");
  const { data } = props;
  const staticStyles = useStyles2(getDetectorStaticStyles());
  const context = usePanelContext();
  const scene = context.instanceState?.scene;
  const isPanelEditing = scene?.isPanelEditing || false;

  return data ? (
    <svg
      key={isPanelEditing ? 'edit' : 'view'}
      viewBox={`-10 -10 ${DETECTOR_LAYOUT.VIEWBOX.WIDTH} ${DETECTOR_LAYOUT.VIEWBOX.HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <g className={staticStyles.outline}>
        <ColorbarDisplay
          data={data}
          dimensions={{
            x: DETECTOR_LAYOUT.COLORBAR.X,
            y: DETECTOR_LAYOUT.COLORBAR.Y,
            width: DETECTOR_LAYOUT.COLORBAR.WIDTH,
            height: DETECTOR_LAYOUT.COLORBAR.HEIGHT,
          }}
          isPanelEditing={isPanelEditing}
        />
        {data && data.detectorType === DetectorType.Blast ? (
          <DetectorBlast data={data} extents={DETECTOR_EXTENTS} />
        ) : data && data.detectorType === DetectorType.PrimeCam280 ? (
          <DetectorPrimeCam280 data={data} extents={DETECTOR_EXTENTS} />
        ) : null}
      </g>
    </svg>
  ) : null;
};

export const DEFAULT_DETECTOR_SETTINGS = {
  TYPE: DetectorType.PrimeCam280,
  COLORBAR: ColorBar.coolwarm,
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
      channelMappingInputHash: '',
      lastDetectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
      colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
      lastMappingConfigs: { channelMappingInput: '', channelMapping: [], paddedSensorIds: [] },
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
          normalized: false,
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
    const minMeasurement = ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : 0))(
      getTemplateSrv().replace('$minimum')
    );
    const maxMeasurement = ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : 0))(
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
          options: [
            { value: DetectorType.Blast, label: DetectorType.Blast },
            { value: DetectorType.PrimeCam280, label: DetectorType.PrimeCam280 },
          ],
        },
        defaultValue: DetectorType.PrimeCam280,
      })
      .addSelect({
        category,
        path: 'config.colorBar',
        name: 'Color Theme',
        settings: {
          options: [
            { value: ColorBar.cividis, label: ColorBar.cividis },
            { value: ColorBar.viridis, label: ColorBar.viridis },
            { value: ColorBar.hot, label: ColorBar.hot },
            { value: ColorBar.coolwarm, label: ColorBar.coolwarm },
            { value: ColorBar.plasma, label: ColorBar.plasma },
          ],
        },
        defaultValue: ColorBar.coolwarm,
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

export const getDetectorDataStyles = (data: DetectorData | undefined) => (theme: GrafanaTheme2) => ({
  detector: css({
    fill:
      (data?.measurementData.measurements ?? []).length > 0
        ? 'white'
        : colorBarMap[data?.colorData.colorBar ?? ColorBar.coolwarm].invalidColor,
  }),
  sensor: css({
    fillOpacity: '1',
    stroke:
      (data?.measurementData.measurements ?? []).length > 0
        ? theme.colors.background.primary
        : colorBarMap[data?.colorData.colorBar ?? ColorBar.coolwarm].invalidColor,
    strokeWidth: theme.spacing(0.1),
  }),
});

export const getDetectorStaticStyles = () => (theme: GrafanaTheme2) => ({
  outline: css({
    stroke: theme.colors.warning.main,
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
