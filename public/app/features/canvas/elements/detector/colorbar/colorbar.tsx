import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { usePanelContext, useStyles2 } from '@grafana/ui';

import { COLOR_SCALE_SIZE, ColorBarScheme, cividis, coolwarm, hot, plasma, viridis } from './colorSchemes';

export const DEFAULT_MIN = -1 as const;
export const DEFAULT_MAX = 1 as const;

// TODO: Lazy load scheme and create a map based on normalizedMeasurement -> color and load
// that when corresponding scheme is selected and do a simple lookup for getColor?
export const ColorBarData: Record<string, { label: string; scheme: ColorBarScheme }> = {
  cividis: { label: 'Cividis', scheme: cividis },
  viridis: { label: 'Viridis', scheme: viridis },
  hot: { label: 'Hot', scheme: hot },
  coolwarm: { label: 'Coolwarm', scheme: coolwarm },
  plasma: { label: 'Plasma', scheme: plasma },
};

export const colorBarOptions = Object.entries(ColorBarData).map(([key, value]) => ({
  value: key as ColorBar,
  label: value.label,
}));

export type ColorBar = keyof typeof ColorBarData;
export const getColorBarKey = (key: ColorBar): ColorBar => key;
export const getDefaultColorBar = (): ColorBar => 'coolwarm';

export const getColor = (
  measurements: number[],
  index: number,
  colorBarType: ColorBar,
  colorBarMin: number,
  colorBarMax: number,
  outOfRangeFactor: number
): string => {
  const scheme = ColorBarData[colorBarType].scheme;
  if (index >= measurements.length || index < 0) {
    return scheme.invalidColor;
  }

  const measurement = measurements[index];
  if (measurement < colorBarMin) {
    // Assuming colorBarMin is negative here
    return measurement < colorBarMin * outOfRangeFactor ? scheme.lowColor : scheme.colors[0];
  }
  if (measurement > colorBarMax) {
    // Assuming colorBarMax is positive here
    return measurement > colorBarMax * outOfRangeFactor ? scheme.highColor : scheme.colors[COLOR_SCALE_SIZE - 1];
  }
  // Normalize the measurement to [0, 1]
  const normalizedMeasurement = (measurement - colorBarMin) / (colorBarMax - colorBarMin);
  const scaledIndex = Math.floor(normalizedMeasurement * COLOR_SCALE_SIZE);
  // Ensuring we don't go out of bounds (probably not necessary)
  const clampedIndex = Math.max(0, Math.min(scaledIndex, COLOR_SCALE_SIZE - 1));
  return scheme.colors[clampedIndex];
};

interface ColorBarConfig {
  colorBar: string;
  minMeasurement: number;
  maxMeasurement: number;
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ColorBarLayout {
  scheme: ColorBarScheme;
  mainColorBarHeight: number;
  indicatorHeight: number;
  colorBarWidth: number;
  min: string;
  max: string;
  gradient: Array<{ offset: number; color: string }>;
  textElements: Array<{
    x: number;
    y: number;
    value: string;
    textAnchor: 'middle';
    alignmentBaseline: 'baseline' | 'hanging';
  }>;
}

const calculateColorBarLayout = (config: ColorBarConfig, isCanvas: boolean): ColorBarLayout => {
  const scheme: ColorBarScheme = ColorBarData[config.colorBar].scheme;
  const { colors } = scheme;

  const mainColorBarHeight = config.dimensions.height * 0.875;
  const indicatorHeight = config.dimensions.height * 0.05;
  const colorBarWidth = config.dimensions.width * 0.75;

  const [min, max] = formatRange(config.minMeasurement, config.maxMeasurement);

  const gradient = colors.map((color, index) => ({
    offset: index / (colors.length - 1),
    color,
  }));

  const bottomAlignFactor = isCanvas ? 2.75 : 2.2;
  const textElements = [
    {
      x: config.dimensions.x + colorBarWidth / 2,
      y: config.dimensions.y + indicatorHeight * 1.75,
      value: max,
      textAnchor: 'middle' as const,
      alignmentBaseline: 'baseline' as const,
    },
    {
      x: config.dimensions.x + colorBarWidth / 2,
      y: config.dimensions.y + indicatorHeight * bottomAlignFactor + mainColorBarHeight,
      value: min,
      textAnchor: 'middle' as const,
      alignmentBaseline: 'hanging' as const,
    },
  ];

  return {
    scheme,
    mainColorBarHeight,
    indicatorHeight,
    colorBarWidth,
    min,
    max,
    gradient,
    textElements,
  };
};

export const ColorBarDisplay: React.FC<ColorBarConfig> = (props) => {
  const context = usePanelContext();
  const scene = context.instanceState?.scene;
  const isPanelEditing = scene?.isPanelEditing || false;

  const layout = calculateColorBarLayout(props, false);
  const { scheme, mainColorBarHeight, indicatorHeight, colorBarWidth, gradient, textElements } = layout;
  const dimensions = props.dimensions;
  const styles = useStyles2(getColorBarStyles());
  const gradientId = `gradient-${isPanelEditing ? 'edit' : 'view'}-${props.colorBar}`;

  return (
    <g className={styles.outline}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
          {gradient.map(({ offset, color }, index) => (
            <stop key={index} offset={`${offset * 100}%`} stopColor={color} stopOpacity={1} />
          ))}
        </linearGradient>
      </defs>

      <rect x={dimensions.x} y={dimensions.y} width={colorBarWidth} height={indicatorHeight} fill={scheme.highColor} />

      <rect
        x={dimensions.x}
        y={dimensions.y + indicatorHeight * 2}
        width={colorBarWidth}
        height={mainColorBarHeight}
        fill={`url(#${gradientId})`}
      />

      <rect
        x={dimensions.x}
        y={dimensions.y + indicatorHeight * 3 + mainColorBarHeight}
        width={colorBarWidth}
        height={indicatorHeight}
        fill={scheme.lowColor}
      />

      {textElements.map((text, index) => (
        <text
          key={index}
          x={text.x}
          y={text.y}
          className={styles.textStyle}
          textAnchor={text.textAnchor}
          alignmentBaseline={text.alignmentBaseline}
        >
          {text.value}
        </text>
      ))}
    </g>
  );
};

export const renderColorBar = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  config: ColorBarConfig
) => {
  const layout = calculateColorBarLayout(config, true);
  const { scheme, mainColorBarHeight, indicatorHeight, colorBarWidth, gradient, textElements } = layout;
  const dimensions = config.dimensions;

  // Create gradient
  const canvasGradient = ctx.createLinearGradient(
    dimensions.x,
    dimensions.y + indicatorHeight * 2 + mainColorBarHeight,
    dimensions.x,
    dimensions.y + indicatorHeight * 2
  );
  gradient.forEach(({ offset, color }) => {
    canvasGradient.addColorStop(offset, color);
  });

  // Draw color bar
  ctx.fillStyle = scheme.highColor;
  ctx.fillRect(dimensions.x, dimensions.y, colorBarWidth, indicatorHeight);

  ctx.fillStyle = canvasGradient;
  ctx.fillRect(dimensions.x, dimensions.y + indicatorHeight * 2, colorBarWidth, mainColorBarHeight);

  ctx.fillStyle = scheme.lowColor;
  ctx.fillRect(dimensions.x, dimensions.y + indicatorHeight * 3 + mainColorBarHeight, colorBarWidth, indicatorHeight);

  // Draw text
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';

  textElements.forEach((text) => {
    ctx.fillText(text.value, text.x, text.y);
  });
};

const formatRange = (
  min: number,
  max: number,
  intSwitch = 10000000,
  floatSwitch = 10000,
  numDecimalPlaces = 3
): [string, string] => {
  const formatNumber = (value: number): string => {
    const absValue = Math.abs(value);
    const isInteger = Number.isInteger(value);

    if ((!isInteger && absValue >= floatSwitch) || (isInteger && absValue >= intSwitch)) {
      return value.toExponential(numDecimalPlaces);
    }
    return isInteger ? value.toString() : value.toFixed(numDecimalPlaces);
  };

  return [formatNumber(min), formatNumber(max)];
};

const getColorBarStyles = () => (theme: GrafanaTheme2) => ({
  outline: css({
    stroke: theme.isDark ? '#fff' : '#000',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: '0.5px',
  }),
  textStyle: css({
    fill: theme.colors.text.primary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
});
