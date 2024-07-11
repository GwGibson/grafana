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

    // const sensors = await loadSensorInfo('sensors.json');

    const moduleLayoutBlast: ModuleLayout = {
      hexagons: [
        {
          name: 'Sensor Array 1',
          center: [0, 0],
          radius: 40000 * 1.05,
          color: '#FFFFFF',
          networks: [
            {
              name: 'Network 1',
              sensors: [
                {
                  id: 1,
                  position: [1, 1],
                  rotation: 0,
                  sweepFlag: 0,
                  isDark: false,
                  radius: 8,
                },
                {
                  id: 2,
                  position: [1, 1],
                  rotation: 0,
                  sweepFlag: 1,
                  radius: 8,
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
