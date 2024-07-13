import { ModuleLayout } from '../../utils/moduleLayout';

export const sensorArrayConfigPRIMECAM280 = [
  {
    name: 'Left AL',
    networks: ['Left AL 1', 'Left AL 2', 'Left AL 3', 'Left AL 4', 'Left AL 5', 'Left AL 6'],
  },
  {
    name: 'Right AL',
    networks: ['Right AL 1', 'Right AL 2', 'Right AL 3', 'Right AL 4', 'Right AL 5', 'Right AL 6'],
  },
  {
    name: 'SN',
    networks: ['SN 1', 'SN 2', 'SN 3', 'SN 4', 'SN 5', 'SN 6'],
  },
];

export const initializePrimeCamModule = (): ModuleLayout => {
  const moduleLayoutPrimeCam280: ModuleLayout = {
    moduleExtents: { x: 400, y: 400 },
    hexagons: [
      {
        name: 'Hex1',
        center: [0, 0],
        radius: 400,
        color: '#FFFFFF',
        networks: [
          {
            name: 'Hex1Net1',
            sensors: [
              {
                id: 6,
                position: [1, 1],
                rotation: 0,
                sweepFlag: 0,
                isDark: false,
                radius: 10,
              },
              {
                id: 3,
                position: [1, 1],
                rotation: 0,
                sweepFlag: 1,
                radius: 10,
                isDark: false,
              },
              // Add more sensors
            ],
          },
          // Add more networks
        ],
      },
      // Add more hexagons
    ],
  };

  return moduleLayoutPrimeCam280;
};
