import { DetectorData } from '../../detector';
import { DetectorBase } from '../detectorBase';

import { initializePrimeCamModule } from './modulePrimeCam280';

export const DetectorPrimeCam280 = ({
  data,
  extents,
}: {
  data: DetectorData;
  extents: {
    x: number;
    y: number;
  };
}) => {
  return <DetectorBase data={data} extents={extents} initializeModuleLayout={initializePrimeCamModule} />;
};
