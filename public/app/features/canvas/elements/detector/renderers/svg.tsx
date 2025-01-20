import React, { useState } from 'react';

import { useStyles2, useTheme2 } from '@grafana/ui';

import { ColorBarDisplay } from '../colorbar/colorbar';
import { getDetectorStaticStyles } from '../detector';
import { DetectorComponentData } from '../detectors/detectorFactory';
import { VIEWBOX_LAYOUT, DETECTOR_VIEWBOX_EXTENT } from '../utils/layout';

import { RenderProps, SensorProps } from './sharedTypes';

const GenerateSVGModuleDisplay: React.FC<DetectorComponentData> = ({ hexagons, sensors }): JSX.Element => {
  const staticStyles = useStyles2(getDetectorStaticStyles());
  const pointsToString = (points: Array<{ x: number; y: number }> | string): string => {
    if (Array.isArray(points)) {
      return points.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
    }
    return points;
  };
  return (
    <g>
      {hexagons.map((hexagon, index) => (
        <polygon
          key={index}
          points={pointsToString(hexagon.points)}
          className={staticStyles.outline}
          stroke={hexagon.color}
          fill={hexagon.color}
        />
      ))}
      {sensors.map((sensor) => (
        <Sensor key={sensor.id} configData={sensor} />
      ))}
    </g>
  );
};

const Sensor: React.FC<{ configData: SensorProps }> = ({ configData }) => {
  const theme = useTheme2();
  const styles = useStyles2(getDetectorStaticStyles());
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const [x, y] = configData.scaledPosition;
  const radius = configData.radius;
  const transform = `rotate(${configData.rotation}, ${x}, ${y})`;
  const dPath = `M ${x - radius} ${y} A ${radius} ${radius} 0 0 ${configData.sweepFlag} ${x + radius} ${y} L ${x} ${y} Z`;

  const strokeWidth = radius / 32;
  const strokeColor = configData.isDark ? ('brown' as const) : ('black' as const);

  const sensor = (
    <g onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <path
        d={dPath}
        fill={configData.fillColor}
        transform={transform}
        stroke={strokeColor}
        strokeWidth={theme.spacing(strokeWidth)}
        fillOpacity="1"
      />
      {configData.displayMode && isHovered && (
        <text
          x={DETECTOR_VIEWBOX_EXTENT.width / 2}
          y={DETECTOR_VIEWBOX_EXTENT.height + 12.5}
          textAnchor="middle"
          className={styles.hoverText}
        >
          <tspan x={DETECTOR_VIEWBOX_EXTENT.width / 2} dy="0">
            Channel: {configData.channel} | {configData.id}
          </tspan>
          <tspan x={DETECTOR_VIEWBOX_EXTENT.width / 2} dy="1.2em">
            ({configData.unscaledPosition[0]}, {configData.unscaledPosition[1]}) → (
            {configData.scaledPosition[0].toFixed(2)}, {configData.scaledPosition[1].toFixed(2)})
          </tspan>
          <tspan x={DETECTOR_VIEWBOX_EXTENT.width / 2} dy="1.2em" style={{ fill: configData.textFillColor }}>
            {`(${configData.text})`}
          </tspan>
        </text>
      )}
    </g>
  );

  // Temporarily disable
  // if (configData.isActive && configData.displayMode) {
  //   return (
  //     <a href={configData.sensorLink} target="_blank" rel="noreferrer">
  //       {sensor}
  //     </a>
  //   );
  // }

  return sensor;
};

export const DetectorSVG: React.FC<RenderProps> = ({ detectorComponentData: moduleDisplayData, data }) => {
  const staticStyles = useStyles2(getDetectorStaticStyles());
  return (
    <svg
      viewBox={`${VIEWBOX_LAYOUT.VIEWBOX.START_X} ${VIEWBOX_LAYOUT.VIEWBOX.START_Y} 
                  ${VIEWBOX_LAYOUT.VIEWBOX.WIDTH} ${VIEWBOX_LAYOUT.VIEWBOX.HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <desc id="desc">Visual representation of the detector layout with color-coded sensors</desc>
      <g className={staticStyles.outline}>
        <ColorBarDisplay
          colorBar={data.colorData.colorBar}
          minMeasurement={data.colorData.minMeasurement}
          maxMeasurement={data.colorData.maxMeasurement}
          dimensions={{
            x: VIEWBOX_LAYOUT.COLORBAR.X,
            y: VIEWBOX_LAYOUT.COLORBAR.Y,
            width: VIEWBOX_LAYOUT.COLORBAR.WIDTH,
            height: VIEWBOX_LAYOUT.COLORBAR.HEIGHT,
          }}
        />
        <GenerateSVGModuleDisplay {...moduleDisplayData} />
      </g>
    </svg>
  );
};
