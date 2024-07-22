import React, { useEffect, useRef } from 'react';

import { useStyles2 } from '@grafana/ui';

import { ColorBarData } from '../colorbar/colorbar';
import { getDetectorStaticStyles } from '../detector';
import { createHexagonPoints } from '../utils/geometryUtils';

import { HexagonData, ModuleLayout } from './moduleUtils';

export interface BaseDisplayProps {
  numMeasurements: number;
  colorBar: string;
  extents: { x: number; y: number };
}

export interface BaseComponentProps extends BaseDisplayProps {
  moduleLayout: ModuleLayout;
}

export const BaseComponent: React.FC<BaseComponentProps> = ({ numMeasurements, colorBar, extents, moduleLayout }) => {
  const staticStyles = useStyles2(getDetectorStaticStyles());

  const initialModuleData = generateModuleLayout(moduleLayout, extents);

  const renderStartTime = useRef<number | null>(null);
  useEffect(() => {
    const renderEndTime = performance.now();
    if (renderStartTime.current !== null) {
      const renderDuration = renderEndTime - renderStartTime.current;
      console.log(`Render took ${renderDuration.toFixed(2)} milliseconds`);
    }
    renderStartTime.current = performance.now();
  });

  if (renderStartTime.current === null) {
    renderStartTime.current = performance.now();
  }

  return (
    <g>
      {initialModuleData.map((hexagon, index) => (
        <polygon
          key={index}
          points={hexagon.points}
          className={staticStyles.outline}
          stroke={hexagon.color}
          fill={numMeasurements > 0 ? hexagon.color : ColorBarData[colorBar].scheme.invalidColor}
        />
      ))}
    </g>
  );
};

const generateModuleLayout = (moduleLayout: ModuleLayout, detectorExtents: { x: number; y: number }): HexagonData[] => {
  return moduleLayout.hexagons.map((hexagon) => ({
    name: hexagon.name,
    center: { x: hexagon.center[0], y: hexagon.center[1] },
    radius: hexagon.radius,
    color: hexagon.color,
    points: createHexagonPoints(
      { x: hexagon.center[0], y: hexagon.center[1] },
      hexagon.radius,
      moduleLayout.moduleExtents,
      detectorExtents,
      hexagon.rotated
    ),
  }));
};
