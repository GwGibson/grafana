import { ModuleLayout } from '../moduleUtils';

import { TIN_HEXAGON } from './tinHexagon';

// TODO: Multiple module for each different layout?
// 3, 2, 2, 2, 1, 1, 1 -> 7 possibilities
// Can reuse sensor arrays for all so this should be fine

export const MODULE_LAYOUT_PRIMECAM280: ModuleLayout = {
  sensorRadii: 1000,
  moduleExtents: { x: 140000, y: 140000 },
  hexagons: [TIN_HEXAGON],
};

export const SENSOR_ARRAY_CONFIG_PRIMECAM280 = MODULE_LAYOUT_PRIMECAM280.hexagons.map((hexagon) => ({
  name: hexagon.name,
  networks: hexagon.networks.map((network) => network.name),
}));
