import { DetectorData } from '../../detector';
import { BaseComponent } from '../baseComponent';
import { SensorComponent } from '../sensorComponent';

import { MODULE_LAYOUT_PRIMECAM280 } from './modulePrimeCam280';

export const BaseComponentPrimeCam280 = ({
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
      moduleLayout={MODULE_LAYOUT_PRIMECAM280}
    />
  );
};

export const SensorComponentPrimeCam280 = ({
  data,
  extents,
}: {
  data: DetectorData;
  extents: {
    x: number;
    y: number;
  };
}) => {
  return <SensorComponent data={data} extents={extents} moduleLayout={MODULE_LAYOUT_PRIMECAM280} />;
};
