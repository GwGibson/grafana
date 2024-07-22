import { DetectorData } from '../../detector';
import { BaseComponent } from '../baseComponent';
import { SensorComponent } from '../sensorComponent';

import { MODULE_LAYOUT_BLAST } from './moduleBlast';

export const BaseComponentBlast = ({
  measurements,
  colorBar,
  extents,
}: {
  measurements: number[];
  colorBar: string;
  extents: {
    x: number;
    y: number;
  };
}) => {
  return (
    <BaseComponent
      measurements={measurements}
      colorBar={colorBar}
      extents={extents}
      moduleLayout={MODULE_LAYOUT_BLAST}
    />
  );
};

export const SensorComponentBlast = ({
  data,
  extents,
}: {
  data: DetectorData;
  extents: {
    x: number;
    y: number;
  };
}) => {
  return <SensorComponent data={data} extents={extents} moduleLayout={MODULE_LAYOUT_BLAST} />;
};
