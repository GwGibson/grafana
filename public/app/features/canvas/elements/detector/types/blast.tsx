import React, { useMemo } from 'react';

import { useStyles2 } from '@grafana/ui';

import { getDetectorDataStyles } from '../detector';
import { DetectorDisplayProps } from '../detectorLayout';

import { createHexagonComponent } from './utils';

export const DetectorBLAST: React.FC<DetectorDisplayProps> = ({ data, extents }) => {
  const styles = useStyles2(getDetectorDataStyles(data));
  const hexagonComponent = useMemo(() => createHexagonComponent(extents, false), [extents]);

  return <g className={styles.detector}>{hexagonComponent}</g>;
};

// Layout details should provide the following:
// Required:
// 1. Number of hexagons (arrays) and the center of each hexagon if there are more than 1.
// 2. Number of networks per hexagon (assumed to be the same for all hexagons)
// 3. Sensor/pixel position and rotation metrics for each network (x, y, rotation)
// 4. isDark details
// 5. Sensor/pixel radius/spacing details (not sure if required yet)
// Optional aesthetic details:
// 1. Hexagon coloring
// 2. 
