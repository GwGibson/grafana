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
  colorBarMin: number,
  colorBarMax: number,
  allowOutOfRange: boolean,
  outOfRangeFactor: number
): string => {
  const scheme = colorBarMap[colorBarType];
  if (index >= measurements.length || index < 0) {
    return scheme.invalidColor;
  }
  const measurement = measurements[index];
  // Assuming colorBarMin is -1 and colorBarMax is 1 here!
  // This may not work properly if the normalized min and max are changed.
  // Non normalized measurements should not be subject to out of range coloring.
  if (measurement < colorBarMin) {
    return allowOutOfRange && measurement < colorBarMin * outOfRangeFactor ? scheme.lowColor : scheme.colors[0];
  }
  if (measurement > colorBarMax) {
    return allowOutOfRange && measurement > colorBarMax * outOfRangeFactor
      ? scheme.highColor
      : scheme.colors[COLOR_SCALE_SIZE - 1];
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
  const { colorBar, minMeasurement, maxMeasurement } = data.colorData;
  const scheme: ColorBarScheme = colorBarMap[colorBar || ColorBar.cividis];
  const styles = useStyles2(getColorBarStyles());
  const { colors, highColor, lowColor } = scheme;

  const mainColorBarHeight = dimensions.height * 0.875; // 80% of the total height for main colorbar
  const indicatorHeight = dimensions.height * 0.05; // 5% for each of the high and low indicators
  const colorBarWidth = dimensions.width * 0.75;
  const gradientId = `gradient-${isPanelEditing ? 'edit' : 'view'}-${colorBar}`;

  const normalized = data.variableData.normalized;
  const [min, max] = normalized ? [-1.0, 1.0] : formatRange([minMeasurement, maxMeasurement]);

  const textElements: Array<{
    x: number;
    y: number;
    value: number | string;
    textAnchor: 'start' | 'middle' | 'end';
    alignmentBaseline: 'baseline' | 'middle' | 'hanging';
  }> = [
    {
      x: dimensions.x + colorBarWidth / 2,
      y: dimensions.y + indicatorHeight * 1.75,
      value: max,
      textAnchor: 'middle',
      alignmentBaseline: 'baseline',
    },
    {
      x: dimensions.x + colorBarWidth / 2,
      y: dimensions.y + indicatorHeight * 2.2 + mainColorBarHeight,
      value: min,
      textAnchor: 'middle',
      alignmentBaseline: 'hanging',
    },
  ];

  // Should only display the high and low indicators if data.normalized is true
  return (
    <g className={styles.outline}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
          {colors.map((color: string, index: number) => (
            <stop key={index} offset={`${(index / (colors.length - 1)) * 100}%`} stopColor={color} stopOpacity={1} />
          ))}
        </linearGradient>
      </defs>

      {/* High color indicator */}
      {normalized && (
        <rect x={dimensions.x} y={dimensions.y} width={colorBarWidth} height={indicatorHeight} fill={highColor} />
      )}

      {/* Main color bar in the middle */}
      <rect
        x={dimensions.x}
        y={dimensions.y + indicatorHeight * 2}
        width={colorBarWidth}
        height={mainColorBarHeight}
        fill={`url(#${gradientId})`}
      />

      {/* Low color indicator */}
      {normalized && (
        <rect
          x={dimensions.x}
          y={dimensions.y + indicatorHeight * 3 + mainColorBarHeight}
          width={colorBarWidth}
          height={indicatorHeight}
          fill={lowColor}
        />
      )}

      {/* Rendering text elements iteratively */}
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

// TODO: Not sure we still need four elements in the array
const formatRange = (colorBarRange: number[], numDecimalPlaces = 3): [string, string] => {
  // Ensure the array has exactly four elements, fill missing ones with 0
  const safeRange = [...colorBarRange.slice(0, 2), 0, 0].slice(0, 2);
  return safeRange.map((value) => {
    // Display in exponential form if the number is less than 1 and not zero or if the abs value is >= 10
    if ((Math.abs(value) < 1 && value !== 0) || Math.abs(value) >= 10) {
      return value.toExponential(numDecimalPlaces);
    } else {
      return value.toFixed(numDecimalPlaces);
    }
  }) as [string, string];
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

export const colorBarMap: { [key in ColorBar]: ColorBarScheme } = {
  [ColorBar.viridis]: viridis,
  [ColorBar.cividis]: cividis,
  [ColorBar.hot]: hot,
  [ColorBar.coolwarm]: coolwarm,
  [ColorBar.plasma]: plasma,
};
