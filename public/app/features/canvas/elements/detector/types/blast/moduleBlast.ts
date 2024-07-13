import { ModuleLayout } from '../../utils/moduleLayout';

export const sensorArrayConfigBLAST = [
  {
    name: 'Array 1',
    networks: ['Network 1'],
  },
];

export const initializeBlastModule = (): ModuleLayout => {
  try {
    // Load whole module layout from a JSON file?
    // Better to load hexagons from files then can load appropriate number
    // based on the number of sensor arrays from the dashboard?

    const moduleLayoutBlast: ModuleLayout = {
      moduleExtents: { x: 95000, y: 95000 },
      hexagons: [
        {
          name: 'Sensor Array 1',
          center: [0, 0],
          radius: 80000 * 1.15,// furthest point is 40000 + allowance for sensor radius
          color: '#C0C0C0',
          networks: [
            {
              name: 'Network 1',
              sensors: [
                {
                  id: 1,
                  position: [0, 0],
                  rotation: 0,
                  sweepFlag: 0,
                  isDark: false,
                  radius: 6,// TODO: should be unscaled?
                },
                {
                  id: 2,
                  position: [0, 0],
                  rotation: 0,
                  sweepFlag: 1,
                  radius: 6,
                  isDark: false,
                },
                {
                  id: 3,
                  position: [-40000, 4330.13],
                  rotation: 0,
                  sweepFlag: 0,
                  isDark: false,
                  radius: 6,
                },
                {
                  id: 4,
                  position: [-40000, 4330.13],
                  rotation: 0,
                  sweepFlag: 1,
                  radius: 6,
                  isDark: false,
                },
                {
                  id: 5,
                  position: [-40000, -4330.13],
                  rotation: 0,
                  sweepFlag: 0,
                  isDark: false,
                  radius: 6,
                },
                {
                  id: 6,
                  position: [-40000, -4330.13],
                  rotation: 0,
                  sweepFlag: 1,
                  radius: 6,
                  isDark: false,
                },
                {
                  id: 7,
                  position: [7500, 34641.02],
                  rotation: 0,
                  sweepFlag: 0,
                  isDark: false,
                  radius: 6,
                },
                {
                  id: 8,
                  position: [7500, 34641.02],
                  rotation: 0,
                  sweepFlag: 1,
                  radius: 6,
                  isDark: false,
                },
                // Add more sensors
              ],
            },
          ],
        },
      ],
    };

    return moduleLayoutBlast;
  } catch (error) {
    console.error('Error initializing module layout:', error);
    throw error;
  }
};
