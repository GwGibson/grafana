import React, { useMemo } from 'react';

import { useStyles2 } from '@grafana/ui';

import { getDetectorDataStyles } from '../detector';
import { DetectorDisplayProps } from '../detectorLayout';

import { createHexagonComponent } from './utils';

export const BLAST_NETWORKS = ['Network 1'];

export const DetectorBLAST: React.FC<DetectorDisplayProps> = ({ data, extents }) => {
  const styles = useStyles2(getDetectorDataStyles(data));
  const hexagonComponent = useMemo(() => createHexagonComponent(extents, false), [extents]);

  return <g className={styles.detector}>{hexagonComponent}</g>;
};
