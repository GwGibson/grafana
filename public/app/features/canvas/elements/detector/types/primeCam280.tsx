import React, { useMemo } from 'react';

import { useStyles2 } from '@grafana/ui';

import { getDetectorDataStyles } from '../detector';
import { DetectorDisplayProps } from '../detectorLayout';

import { createHexagonComponent, createLineComponents } from './utils';

export const PRIMECAM280_NETWORKS = ['Network 1', 'Network 2', 'Network 3', 'Network 4', 'Network 5', 'Network 6'];

export const DetectorPRIMECAM280: React.FC<DetectorDisplayProps> = ({ data, extents }) => {
  const styles = useStyles2(getDetectorDataStyles(data));
  const hexagonComponent = useMemo(() => createHexagonComponent(extents, true), [extents]);
  const lineComponents = useMemo(() => createLineComponents(extents, true), [extents]);

  return (
    <g className={styles.detector}>
      {hexagonComponent}
      {lineComponents}
    </g>
  );
};
