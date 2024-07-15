import { HexagonInfo, SensorInfo } from '../moduleInfo';

const TIN_SENSORS_1: SensorInfo[] = [
  {
    id: 1,
    position: [0, 0],
    rotation: 0,
    sweepFlag: 0,
    isDark: false,
  },
  {
    id: 2,
    position: [0, 0],
    rotation: 0,
    sweepFlag: 1,
    isDark: false,
  },
];
const TIN_SENSORS_2: SensorInfo[] = [
  {
    id: 3,
    position: [10, 10],
    rotation: 0,
    sweepFlag: 0,
    isDark: false,
  },
  {
    id: 4,
    position: [10, 10],
    rotation: 0,
    sweepFlag: 1,
    isDark: false,
  },
];
const TIN_SENSORS_3: SensorInfo[] = [
  {
    id: 5,
    position: [-10, -10],
    rotation: 0,
    sweepFlag: 0,
    isDark: false,
  },
  {
    id: 6,
    position: [-10, -10],
    rotation: 0,
    sweepFlag: 1,
    isDark: false,
  },
];
const TIN_SENSORS_4: SensorInfo[] = [
  {
    id: 7,
    position: [20, 20],
    rotation: 0,
    sweepFlag: 0,
    isDark: false,
  },
  {
    id: 8,
    position: [20, 20],
    rotation: 0,
    sweepFlag: 1,
    isDark: false,
  },
];
const TIN_SENSORS_5: SensorInfo[] = [
  {
    id: 9,
    position: [-20, -20],
    rotation: 0,
    sweepFlag: 0,
    isDark: false,
  },
  {
    id: 10,
    position: [-20, -20],
    rotation: 0,
    sweepFlag: 1,
    isDark: false,
  },
];
const TIN_SENSORS_6: SensorInfo[] = [
  {
    id: 11,
    position: [30, 30],
    rotation: 0,
    sweepFlag: 0,
    isDark: true,
  },
  {
    id: 12,
    position: [30, 30],
    rotation: 0,
    sweepFlag: 1,
    isDark: true,
  },
];

export const TIN_HEXAGON: HexagonInfo  = {
  name: 'SN',
  center: [0, 0],
  radius: 400,
  color: '#D3D4D5',
  networks: [
    {
      name: 'SN 1',
      sensors: TIN_SENSORS_1,
    },
    {
      name: 'SN 2',
      sensors: TIN_SENSORS_2,
    },
    {
      name: 'SN 3',
      sensors: TIN_SENSORS_3,
    },
    {
      name: 'SN 4',
      sensors: TIN_SENSORS_4,
    },
    {
      name: 'SN 5',
      sensors: TIN_SENSORS_5,
    },
    {
      name: 'SN 6',
      sensors: TIN_SENSORS_6,
    },
  ],
};
