import { DetectorData } from '../../detector';
import { DetectorBase } from '../detectorBase';

import { initializeBlastModule } from './moduleBlast';

export const DetectorBlast = ({
  data,
  extents,
}: {
  data: DetectorData;
  extents: {
    x: number;
    y: number;
  };
}) => {
  return <DetectorBase data={data} extents={extents} initializeModuleLayout={initializeBlastModule} />;
};
