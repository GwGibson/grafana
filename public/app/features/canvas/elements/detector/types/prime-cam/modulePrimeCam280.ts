import { ModuleLayout } from '../moduleInfo';

import { TIN_HEXAGON } from './tinHexagon';

// TODO: Multiple module for each different layout?
// 3, 2, 2, 2, 1, 1, 1 -> 7 possibilities
// Can reuse sensor arrays for all so this should be fine

export const MODULE_LAYOUT_PRIMECAM280: ModuleLayout = {
  sensorRadii: 5,
  moduleExtents: { x: 400, y: 400 },
  hexagons: [TIN_HEXAGON],
};

export const SENSOR_ARRAY_CONFIG_PRIMECAM280 = MODULE_LAYOUT_PRIMECAM280.hexagons.map((hexagon) => ({
  name: hexagon.name,
  networks: hexagon.networks.map((network) => network.name),
}));

// TODO: Generate from names in ModuleLayout
// export const SENSOR_ARRAY_CONFIG_PRIMECAM280  = [
//   {
//     name: 'Left AL',
//     networks: ['Left AL 1', 'Left AL 2', 'Left AL 3', 'Left AL 4', 'Left AL 5', 'Left AL 6'],
//   },
//   {
//     name: 'Right AL',
//     networks: ['Right AL 1', 'Right AL 2', 'Right AL 3', 'Right AL 4', 'Right AL 5', 'Right AL 6'],
//   },
//   {
//     name: 'SN',
//     networks: ['SN 1', 'SN 2', 'SN 3', 'SN 4', 'SN 5', 'SN 6'],
//   },
// ];
