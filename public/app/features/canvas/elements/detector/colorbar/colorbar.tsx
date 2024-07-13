import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { usePanelContext, useStyles2 } from '@grafana/ui';

import { COLOR_SCALE_SIZE, ColorBarScheme, cividis, coolwarm, hot, plasma, viridis } from './colorSchemes';

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
  allowOutOfRange: boolean,
  outOfRangeFactor: number
): string => {
  const scheme = ColorBarData[colorBarType].scheme;
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
  colorBar: string;
  minMeasurement: number;
  maxMeasurement: number;
  normalized: boolean;
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const ColorBarDisplay: React.FC<ColorbarDisplayProps> = ({
  colorBar,
  minMeasurement,
  maxMeasurement,
  normalized,
  dimensions,
}) => {
  const context = usePanelContext();
  const scene = context.instanceState?.scene;
  const isPanelEditing = scene?.isPanelEditing || false;

  const scheme: ColorBarScheme = ColorBarData[colorBar].scheme;
  const styles = useStyles2(getColorBarStyles());
  const { colors, highColor, lowColor } = scheme;

  const mainColorBarHeight = dimensions.height * 0.875;
  const indicatorHeight = dimensions.height * 0.05;
  const colorBarWidth = dimensions.width * 0.75;
  const gradientId = `gradient-${isPanelEditing ? 'edit' : 'view'}-${colorBar}`;

  const [min, max] = normalized ? [-1.0, 1.0] : formatRange([minMeasurement, maxMeasurement]);

  const textElements = [
    {
      x: dimensions.x + colorBarWidth / 2,
      y: dimensions.y + indicatorHeight * 1.75,
      value: max,
      textAnchor: 'middle' as const,
      alignmentBaseline: 'baseline' as const,
    },
    {
      x: dimensions.x + colorBarWidth / 2,
      y: dimensions.y + indicatorHeight * 2.2 + mainColorBarHeight,
      value: min,
      textAnchor: 'middle' as const,
      alignmentBaseline: 'hanging' as const,
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

      {normalized && (
        <rect x={dimensions.x} y={dimensions.y} width={colorBarWidth} height={indicatorHeight} fill={highColor} />
      )}

      <rect
        x={dimensions.x}
        y={dimensions.y + indicatorHeight * 2}
        width={colorBarWidth}
        height={mainColorBarHeight}
        fill={`url(#${gradientId})`}
      />

      {normalized && (
        <rect
          x={dimensions.x}
          y={dimensions.y + indicatorHeight * 3 + mainColorBarHeight}
          width={colorBarWidth}
          height={indicatorHeight}
          fill={lowColor}
        />
      )}

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
