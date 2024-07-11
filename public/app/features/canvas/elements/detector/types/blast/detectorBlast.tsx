import React from 'react';

import { DetectorDisplayProps } from '../../layout';
import { DetectorBase } from '../detectorBase';

import { initializeBlastModule } from './moduleBlast';

export const DetectorBlast: React.FC<DetectorDisplayProps> = (props) => {
  return <DetectorBase {...props} initializeModuleLayout={initializeBlastModule} />;
};
