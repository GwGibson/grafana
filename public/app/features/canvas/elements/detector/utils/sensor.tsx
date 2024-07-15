import React, { useEffect, useState } from 'react';

import { useStyles2 } from '@grafana/ui';

import { getDetectorStaticStyles } from '../detector';
import { DETECTOR_EXTENTS } from '../layout';

export const Sensor = ({
  configData: {
    id,
    channel,
    scaledPosition,
    unscaledPosition,
    radius,
    sweepFlag,
    rotation,
    sensorLink,
    isActive,
    fillColor,
    text,
    textFillColor,
  },
}: {
  configData: {
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
  };
}) => {
  const [x, y] = scaledPosition;
  const styles = useStyles2(getDetectorStaticStyles());
  const transform = `rotate(${rotation}, ${x}, ${y})`;
  const dPath = `M ${x - radius} ${y} A ${radius} ${radius} 0 0 ${sweepFlag} ${x + radius} ${y} L ${x} ${y} Z`;

  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const sensorElement = (
    <g onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <SensorPath initialFillColor={fillColor} dPath={dPath} transform={transform} />
      {isHovered && (
        <text x={DETECTOR_EXTENTS.x / 2} y={DETECTOR_EXTENTS.y + 12.5} textAnchor="middle" className={styles.hoverText}>
          <tspan x={DETECTOR_EXTENTS.x / 2} dy="0">
            ID: {id} | Channel: {channel}
          </tspan>
          <tspan x={DETECTOR_EXTENTS.x / 2} dy="1.2em">
            ({unscaledPosition[0]}, {unscaledPosition[1]})
          </tspan>
          <tspan x={DETECTOR_EXTENTS.x / 2} dy="1.2em" style={{ fill: textFillColor }}>{`(${text})`}</tspan>
        </text>
      )}
    </g>
  );

  if (isActive) {
    return (
      <a key={`sensor-${channel}`} href={sensorLink} target="_blank" rel="noreferrer">
        {sensorElement}
      </a>
    );
  }

  return sensorElement;
};

const SensorPath = React.memo(function SensorPath({
  initialFillColor,
  dPath,
  transform,
}: {
  initialFillColor: string;
  dPath: string;
  transform: string;
}) {
  const [fillColor, setFillColor] = useState(initialFillColor);

  useEffect(() => {
    setFillColor(initialFillColor);
  }, [initialFillColor]);

  return <path d={dPath} fill={fillColor} transform={transform} />;
});
