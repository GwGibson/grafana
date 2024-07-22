import React from 'react';

import { BaseComponent, BaseDisplayProps } from './baseComponent';
import { MODULE_LAYOUT_BLAST, SENSOR_ARRAY_CONFIG_BLAST } from './blast/moduleBlast';
import { DetectorType, ModuleLayout, SensorArray } from './moduleUtils';
import { MODULE_LAYOUT_PRIMECAM280, SENSOR_ARRAY_CONFIG_PRIMECAM280 } from './prime-cam/modulePrimeCam280';
import { SensorDisplayComponent, SensorDisplayProps, SensorRenderComponent } from './sensorComponents';

// Factory function to create both BaseComponent and SensorComponent
const createDetectorComponents = (moduleLayout: ModuleLayout) => {
  const CreatedBaseComponent: React.FC<BaseDisplayProps> = ({ numMeasurements, colorBar, extents }): JSX.Element => {
    return (
      <BaseComponent
        numMeasurements={numMeasurements}
        colorBar={colorBar}
        extents={extents}
        moduleLayout={moduleLayout}
      />
    );
  };

  const CreatedSensorDisplayComponent: React.FC<SensorDisplayProps> = ({ data, extents }): JSX.Element => {
    return <SensorDisplayComponent data={data} extents={extents} moduleLayout={moduleLayout} />;
  };

  const CreatedSensorRenderComponent: React.FC<SensorDisplayProps> = ({ data, extents }): JSX.Element => {
    return <SensorRenderComponent data={data} extents={extents} moduleLayout={moduleLayout} />;
  };

  return {
    BaseComponent: CreatedBaseComponent,
    SensorDisplayComponent: CreatedSensorDisplayComponent,
    SensorRenderComponent: CreatedSensorRenderComponent,
  };
};

const {
  BaseComponent: BaseComponentBlast,
  SensorDisplayComponent: SensorDisplayComponentBlast,
  SensorRenderComponent: SensorRenderComponentBlast,
} = createDetectorComponents(MODULE_LAYOUT_BLAST);
const {
  BaseComponent: BaseComponentPrimeCam280,
  SensorDisplayComponent: SensorComponentPrimeCam280,
  SensorRenderComponent: SensorRenderComponentPrimeCam280,
} = createDetectorComponents(MODULE_LAYOUT_PRIMECAM280);

export {
  BaseComponentBlast,
  SensorDisplayComponentBlast,
  SensorRenderComponentBlast,
  BaseComponentPrimeCam280,
  SensorComponentPrimeCam280,
  SensorRenderComponentPrimeCam280,
};

export const ModuleData: Record<
  string,
  {
    label: string;
    baseComponent: React.FC<BaseDisplayProps>;
    sensorDisplayComponent: React.FC<SensorDisplayProps>;
    sensorRenderComponent: React.FC<SensorDisplayProps>;
    arrays: SensorArray[];
  }
> = {
  BLAST: {
    label: 'BLAST',
    baseComponent: BaseComponentBlast,
    sensorDisplayComponent: SensorDisplayComponentBlast,
    sensorRenderComponent: SensorRenderComponentBlast,
    arrays: SENSOR_ARRAY_CONFIG_BLAST,
  },
  'PRIMECAM-280': {
    label: 'PRIMECAM-280',
    baseComponent: BaseComponentPrimeCam280,
    sensorDisplayComponent: SensorComponentPrimeCam280,
    sensorRenderComponent: SensorRenderComponentPrimeCam280,
    arrays: SENSOR_ARRAY_CONFIG_PRIMECAM280,
  },
};

export const getBaseComponent = (type: DetectorType): React.FC<BaseDisplayProps> => ModuleData[type].baseComponent;
export const getSensorDisplayComponent = (type: DetectorType): React.FC<SensorDisplayProps> =>
  ModuleData[type].sensorDisplayComponent;
export const getSensorRenderComponent = (type: DetectorType): React.FC<SensorDisplayProps> =>
  ModuleData[type].sensorRenderComponent;
