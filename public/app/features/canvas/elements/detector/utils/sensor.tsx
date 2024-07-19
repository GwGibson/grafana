import { useState } from 'react';

import { useStyles2, useTheme2 } from '@grafana/ui';

import { getDetectorStaticStyles } from '../detector';
import { DETECTOR_EXTENTS } from '../layout';

interface SensorProps {
  id: number;
  channel: number;
  scaledPosition: [number, number];
  unscaledPosition: [number, number];
  radius: number;
  sweepFlag: number;
  rotation: number;
  sensorLink: string;
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;
  isDark: boolean;
}

export const Sensor: React.FC<{ configData: SensorProps }> = ({ configData }) => {
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

  // Define the stroke color and width based on isDark property
  // TODO: Need to improve this
  const strokeWidth = radius / 32;
  const strokeColor = configData.isDark ? 'brown' : 'black';

  const sensorElement = (
    <g onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <path
        d={dPath}
        fill={configData.fillColor}
        transform={transform}
        stroke={strokeColor}
        strokeWidth={theme.spacing(strokeWidth)}
        fillOpacity="1"
      />
      {isHovered && (
        <text x={DETECTOR_EXTENTS.x / 2} y={DETECTOR_EXTENTS.y + 12.5} textAnchor="middle" className={styles.hoverText}>
          <tspan x={DETECTOR_EXTENTS.x / 2} dy="0">
            ID: {configData.id} | Channel: {configData.channel}
          </tspan>
          <tspan x={DETECTOR_EXTENTS.x / 2} dy="1.2em">
            ({configData.unscaledPosition[0]}, {configData.unscaledPosition[1]})
          </tspan>
          <tspan x={DETECTOR_EXTENTS.x / 2} dy="1.2em" style={{ fill: configData.textFillColor }}>
            {`(${configData.text})`}
          </tspan>
        </text>
      )}
    </g>
  );

  if (configData.isActive) {
    return (
      <a href={configData.sensorLink} target="_blank" rel="noreferrer">
        {sensorElement}
      </a>
    );
  }

  return sensorElement;
};
