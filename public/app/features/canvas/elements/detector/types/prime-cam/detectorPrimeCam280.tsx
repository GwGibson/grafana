import React from 'react';

import { DetectorDisplayProps } from '../../layout';
import { DetectorBase } from '../detectorBase';

import { initializePrimeCamModule } from './modulePrimeCam280';

export const DetectorPrimeCam280: React.FC<DetectorDisplayProps> = (props) => {
  return <DetectorBase {...props} initializeModuleLayout={initializePrimeCamModule} />;
};
