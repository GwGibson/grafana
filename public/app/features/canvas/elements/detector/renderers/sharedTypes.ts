import { DetectorData } from '../detector';
import { DetectorComponentData } from '../detectors/detectorFactory';

export interface SensorProps {
  id: string;
  channel: number;
  scaledPosition: [number, number];
  unscaledPosition: [number, number];
  radius: number;
  sweepFlag: number;
  rotation: number;
  sensorLink: string;
  isActive: boolean;
  fillColor: string;
  text: string;
  textFillColor: string;
  isDark: boolean;
  displayMode: boolean;
}

export interface RenderProps {
  detectorComponentData: DetectorComponentData;
  data: DetectorData;
}

export const generateSensorLink = (
  baseURL: string,
  channel: number,
  numMeasurements: number,
  padding: number
): string => {
  const channelString = channel <= numMeasurements ? `channel_${String(channel).padStart(padding, '0')}` : 'All';
  return `${baseURL}&var-channel=${channelString}`;
};
