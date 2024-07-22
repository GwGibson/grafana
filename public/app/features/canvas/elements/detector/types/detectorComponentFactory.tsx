import React from 'react';

import { BaseComponent, BaseDisplayProps } from './baseComponent';
import { MODULE_LAYOUT_BLAST, SENSOR_ARRAY_CONFIG_BLAST } from './blast/moduleBlast';
import { DetectorType, ModuleLayout, SensorArray } from './moduleUtils';
import { MODULE_LAYOUT_PRIMECAM280, SENSOR_ARRAY_CONFIG_PRIMECAM280 } from './prime-cam/modulePrimeCam280';
import { SensorComponent, SensorDisplayProps } from './sensorComponent';

// Factory function to create both BaseComponent and SensorComponent
const createDetectorComponents = (moduleLayout: ModuleLayout) => {
  const CreatedBaseComponent: React.FC<BaseDisplayProps> = ({ measurements, colorBar, extents }): JSX.Element => {
    return (
      <BaseComponent measurements={measurements} colorBar={colorBar} extents={extents} moduleLayout={moduleLayout} />
    );
  };

  const CreatedSensorComponent: React.FC<SensorDisplayProps> = ({ data, extents }): JSX.Element => {
    return <SensorComponent data={data} extents={extents} moduleLayout={moduleLayout} />;
  };

  return { BaseComponent: CreatedBaseComponent, SensorComponent: CreatedSensorComponent };
};

const { BaseComponent: BaseComponentBlast, SensorComponent: SensorComponentBlast } =
  createDetectorComponents(MODULE_LAYOUT_BLAST);
const { BaseComponent: BaseComponentPrimeCam280, SensorComponent: SensorComponentPrimeCam280 } =
  createDetectorComponents(MODULE_LAYOUT_PRIMECAM280);

export { BaseComponentBlast, SensorComponentBlast, BaseComponentPrimeCam280, SensorComponentPrimeCam280 };

export const ModuleData: Record<
  string,
  {
    label: string;
    baseComponent: React.FC<BaseDisplayProps>;
    sensorComponent: React.FC<SensorDisplayProps>;
    arrays: SensorArray[];
  }
> = {
  BLAST: {
    label: 'BLAST',
    baseComponent: BaseComponentBlast,
    sensorComponent: SensorComponentBlast,
    arrays: SENSOR_ARRAY_CONFIG_BLAST,
  },
  'PRIMECAM-280': {
    label: 'PRIMECAM-280',
    baseComponent: BaseComponentPrimeCam280,
    sensorComponent: SensorComponentPrimeCam280,
    arrays: SENSOR_ARRAY_CONFIG_PRIMECAM280,
  },
};

export const getBaseComponent = (type: DetectorType): React.FC<BaseDisplayProps> => ModuleData[type].baseComponent;
export const getSensorComponent = (type: DetectorType): React.FC<SensorDisplayProps> =>
  ModuleData[type].sensorComponent;
