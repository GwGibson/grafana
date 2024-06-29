import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { DetectorData } from '../detector';

import { COLOR_SCALE_SIZE, ColorBarScheme, cividis, coolwarm, hot, plasma, viridis } from './colorSchemes';

export enum ColorBar {
  cividis = 'cividis',
  viridis = 'viridis',
  hot = 'hot',
  coolwarm = 'coolwarm',
  plasma = 'plasma',
}

export const getColor = (
  measurements: number[],
  index: number,
  colorBarType: ColorBar,
  colorBarMin = -1,
  colorBarMax = 1
): string => {
  const scheme = colorBarMap[colorBarType];
  if (index >= measurements.length || index < 0) {
    return scheme.invalidColor;
  }
  const measurement = measurements[index];
  if (measurement < colorBarMin) {
    // return scheme.lowColor;
    return scheme.colors[0];
  }
  if (measurement > colorBarMax) {
    // return scheme.highColor;
    return scheme.colors[COLOR_SCALE_SIZE - 1];
  }
  // Normalize the measurement value to [0, 1]
  const normalizedMeasurement = (measurement - colorBarMin) / (colorBarMax - colorBarMin);
  // Scale to the color scale size
  const scaledIndex = Math.round(normalizedMeasurement * (COLOR_SCALE_SIZE - 1));
  return scheme.colors[scaledIndex];
};

export interface ColorbarDisplayProps {
  data: DetectorData;
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isPanelEditing: boolean;
}

export const ColorbarDisplay: React.FC<ColorbarDisplayProps> = ({ data, dimensions, isPanelEditing }) => {
  const scheme: ColorBarScheme = colorBarMap[data.colorBar || ColorBar.cividis];
  const styles = useStyles2(getColorBarStyles());
  const { colors, highColor, lowColor } = scheme;

  /*
  const mainColorBarHeight = dimensions.height * 0.8; // 80% of the total height for main colorbar
  const indicatorHeight = dimensions.height * 0.05; // 5% for each of the high and low indicators
  const colorBarWidth = dimensions.width * 0.75;
  const gradientId = `gradient-${isPanelEditing ? 'edit' : 'view'}-${data.colorBar}`;

  const [absMin, validMin, validMax, absMax] = data.normalized
    ? formatToExponential([0, -1, 1, 0])
    : formatToExponential([-1000, -10, 10, 1000]);

  const textElements = [
    { x: dimensions.x + colorBarWidth / 2, y: dimensions.y + indicatorHeight / 2, value: absMax, anchor: 'middle' },
    { x: dimensions.x + colorBarWidth, y: dimensions.y + indicatorHeight * 2, value: validMax, anchor: 'left' },
    {
      x: dimensions.x + colorBarWidth,
      y: dimensions.y + indicatorHeight * 2 + mainColorBarHeight,
      value: validMin,
      anchor: 'left',
    },
    {
      x: dimensions.x + colorBarWidth / 2,
      y: dimensions.y + indicatorHeight * 3.5 + mainColorBarHeight,
      value: absMin,
      anchor: 'middle',
    },
  ];
  */

  const mainColorBarHeight = dimensions.height * 0.95;
  const colorBarWidth = dimensions.width * 0.75;
  const gradientId = `gradient-${isPanelEditing ? 'edit' : 'view'}-${data.colorBar}`;

  const [absMin, _validMin, _validMax, absMax] = data.normalized
    ? [-1.0, 0.0, 0.0, 1.0]
    : formatRange([data.colorBarMin, 0, 0, data.colorBarMax]);

  const textElements = [
    { x: dimensions.x + colorBarWidth / 2, y: dimensions.y, value: absMax, anchor: 'middle' },
    {
      x: dimensions.x + colorBarWidth / 2,
      y: dimensions.y + dimensions.height,
      value: absMin,
      anchor: 'middle',
    },
  ];

  return (
    <g className={styles.outline}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
          {colors.map((color: string, index: number) => (
            <stop key={index} offset={`${(index / (colors.length - 1)) * 100}%`} stopColor={color} stopOpacity={1} />
          ))}
        </linearGradient>
      </defs>
      {/* Main color bar in the middle */}
      <rect
        x={dimensions.x}
        y={dimensions.y + (dimensions.height - mainColorBarHeight) / 2}
        width={colorBarWidth}
        height={mainColorBarHeight}
        fill={`url(#${gradientId})`}
      />
      {/* Rendering text elements iteratively */}
      {textElements.map((text, index) => (
        <text key={index} x={text.x} y={text.y} className={styles.textStyle} textAnchor={text.anchor}>
          {text.value}
        </text>
      ))}
    </g>
  );
};

// TODO: Not sure we still need four elements in the array
const formatRange = (colorBarRange: number[], numDecimalPlaces = 3): [string, string, string, string] => {
  // Ensure the array has exactly four elements, fill missing ones with 0
  const safeRange = [...colorBarRange.slice(0, 4), 0, 0, 0, 0].slice(0, 4);
  return safeRange.map((value) => {
    // Display in exponential form if the number is less than 1 and not zero or if the abs value is >= 10
    if ((Math.abs(value) < 1 && value !== 0) || Math.abs(value) >= 10) {
      return value.toExponential(numDecimalPlaces);
    } else {
      return value.toFixed(numDecimalPlaces);
    }
  }) as [string, string, string, string];
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
    alignmentBaseline: 'middle',
  }),
});

export const colorBarMap: { [key in ColorBar]: ColorBarScheme } = {
  [ColorBar.viridis]: viridis,
  [ColorBar.cividis]: cividis,
  [ColorBar.hot]: hot,
  [ColorBar.coolwarm]: coolwarm,
  [ColorBar.plasma]: plasma,
};
