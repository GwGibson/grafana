import { css } from '@emotion/css';
import React, { useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { ScalarDimensionConfig } from '@grafana/schema';
import { usePanelContext, useStyles2 } from '@grafana/ui';
import { DimensionContext } from 'app/features/dimensions';
import { ScalarFieldDimensionEditor } from 'app/features/dimensions/editors';

import { CanvasElementItem, CanvasElementOptions, CanvasElementProps } from '../../element';

import { colorBarMap, ColorBar, ColorbarDisplay } from './colorbar/colorbar';
import { DETECTOR_EXTENTS, DETECTOR_LAYOUT } from './detectorLayout';
import { generateSensorElementsFromConfig } from './detectorUtils';
import { DetectorBLAST, DetectorCCAT } from './types';

export interface DetectorData {
  measurements: number[];
  baseURL: string;
  sensors: React.JSX.Element[];
  detectorType: DetectorType;
  radius: number;
  datastream: string;
  attribute: string;
  normalized: boolean;
  colorBar: ColorBar;
  colorBarMin: number;
  colorBarMax: number;
}

export enum DetectorType {
  Blast = 'BLAST',
  Ccat = 'PRIME CAM ?hz',
}

interface DetectorMappingConfig {
  channelMappingInput: string;
  paddedSensorIds: string[];
  scaledMapping: Array<[number, number, number, number]>;
  sweepFlags: number[];
}

export interface DetectorConfig {
  measurements?: ScalarDimensionConfig;
  baseURL?: string;
  channelMappingInput?: string;
  detectorType: DetectorType;
  lastDetectorType: DetectorType;
  radius: number;
  colorBar: ColorBar;
  lastMappingConfigs: DetectorMappingConfig;
}

const DetectorDisplay = (props: CanvasElementProps<DetectorConfig, DetectorData>) => {
  const { data } = props;
  const staticStyles = useStyles2(getDetectorStaticStyles());
  const dynamicStyles = useStyles2(getDetectorDataStyles(data));
  const context = usePanelContext();
  const scene = context.instanceState?.scene;
  const isPanelEditing = scene?.isPanelEditing || false;
  const isClickable = !isPanelEditing && !!data?.baseURL;

  const handleClick = useCallback(() => {
    if (!isPanelEditing && data?.baseURL) {
      const url = `${data.baseURL}&var-datastream=${data.datastream}&var-attribute=${data.attribute}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [data?.baseURL, data?.datastream, data?.attribute, isPanelEditing]);

  return data ? (
    <svg
      key={isPanelEditing ? 'edit' : 'view'}
      viewBox={`-10 -10 ${DETECTOR_LAYOUT.VIEWBOX.WIDTH} ${DETECTOR_LAYOUT.VIEWBOX.HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      onClick={isClickable ? handleClick : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
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
          <DetectorBLAST data={data} extents={DETECTOR_EXTENTS} />
        ) : data && data.detectorType === DetectorType.Ccat ? (
          <DetectorCCAT data={data} extents={DETECTOR_EXTENTS} />
        ) : null}
        <g className={dynamicStyles.sensor}>{data && data.sensors}</g>
      </g>
    </svg>
  ) : null;
};

const DEFAULT_DETECTOR_SETTINGS = {
  TYPE: DetectorType.Ccat,
  COLORBAR: ColorBar.coolwarm,
  RADIUS: 4,
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
      lastDetectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
      colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
      radius: DEFAULT_DETECTOR_SETTINGS.RADIUS,
      lastMappingConfigs: { channelMappingInput: '', paddedSensorIds: [], scaledMapping: [], sweepFlags: [] },
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: CanvasElementOptions<DetectorConfig>) => {
    if (!cfg.config) {
      // Return some default/empty DetectorData if config is not defined
      return {
        measurements: [],
        baseURL: '',
        sensors: [],
        detectorType: DEFAULT_DETECTOR_SETTINGS.TYPE,
        colorBar: DEFAULT_DETECTOR_SETTINGS.COLORBAR,
        radius: DEFAULT_DETECTOR_SETTINGS.RADIUS,
        datastream: '',
        attribute: '',
        normalized: false,
        colorBarMin: 0,
        colorBarMax: 0,
      };
    }

    const config = cfg.config;

    const measurements = (config.measurements && ctx.getScalar(config.measurements).field?.values) || [];
    const radius = config.radius;
    const colorBar = config.colorBar;
    const baseURL = config.baseURL || '';
    const detectorType = config.detectorType;
    const datastream = ((value) => (value !== '$datastream' ? value : ''))(getTemplateSrv().replace('$datastream'));
    const attribute = ((value) => (value !== '$attribute' ? value : ''))(getTemplateSrv().replace('$attribute'));
    const normalized = ((value) => value === 'true' || value === '$normalized')(
      getTemplateSrv().replace('$normalized')
    );
    const colorBarMin = ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : 0))(
      getTemplateSrv().replace('$minimum')
    );
    const colorBarMax = ((value) => (!isNaN(parseFloat(value)) ? parseFloat(value) : 0))(
      getTemplateSrv().replace('$maximum')
    );

    // Create SVG elements for sensors
    const sensors = generateSensorElementsFromConfig(
      config,
      measurements,
      radius,
      colorBar,
      baseURL,
      datastream,
      attribute,
      normalized,
      colorBarMin,
      colorBarMax
    );

    return {
      measurements,
      baseURL,
      sensors,
      detectorType,
      colorBar,
      radius,
      datastream,
      attribute,
      normalized,
      colorBarMin,
      colorBarMax,
    };
  },

  registerOptionsUI: (builder: any) => {
    const category = ['Detector'];
    builder
      .addSelect({
        category,
        path: 'config.detectorType',
        name: 'Detector Type',
        settings: {
          options: [
            { value: DetectorType.Blast, label: DetectorType.Blast },
            { value: DetectorType.Ccat, label: DetectorType.Ccat },
          ],
        },
        defaultValue: DetectorType.Ccat,
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
      // Rotation should be fixed in initial svg generation?
      .addTextInput({
        category,
        id: 'channel_mapping_input',
        path: 'config.channelMappingInput',
        name: 'Channel Mapping Input',
        description: 'Input channel mapping in the format: channel x y rotation.',
      })
      .addTextInput({
        category,
        id: 'base_url',
        path: 'config.baseURL',
        name: 'Base URL',
        description: 'Input the base URL to the time series panel.',
      })
      .addNumberInput({
        category,
        path: 'config.radius',
        name: 'Sensor Radius',
        settings: {
          placeholder: '1',
        },
      });
  },
};

export const getDetectorDataStyles = (data: DetectorData | undefined) => (theme: GrafanaTheme2) => ({
  detector: css({
    fill:
      (data?.measurements ?? []).length > 0 ? 'white' : colorBarMap[data?.colorBar ?? ColorBar.coolwarm].invalidColor,
  }),
  sensor: css({
    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      // Refresh rate needed here
    },
    fillOpacity: '1',
    stroke:
      (data?.measurements ?? []).length > 0
        ? theme.colors.background.primary
        : colorBarMap[data?.colorBar ?? ColorBar.coolwarm].invalidColor,
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
  activeStatus: css({
    fill: theme.colors.success.text,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  inactiveStatus: css({
    fill: theme.colors.error.text,
    fontWeight: theme.typography.fontWeightMedium,
  }),
});
