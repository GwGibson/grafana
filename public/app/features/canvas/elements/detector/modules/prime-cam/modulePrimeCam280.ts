import { ModuleLayout } from '../builderUtils';

import { AL_HEXAGON_LEFT, AL_HEXAGON_RIGHT } from './alHexagon';
import { TIN_HEXAGON } from './tinHexagon';

// TODO: Multiple module for each different layout?
// 3, 2, 2, 2, 1, 1, 1 -> 7 possibilities
// Can reuse sensor arrays for all so this should be fine

export const MODULE_LAYOUT_PRIMECAM280: ModuleLayout = {
  layoutExtent: { width: 280000, height: 280000 },
  hexagons: [AL_HEXAGON_LEFT, AL_HEXAGON_RIGHT, TIN_HEXAGON],
};

export const SENSOR_ARRAY_CONFIG_PRIMECAM280 = MODULE_LAYOUT_PRIMECAM280.hexagons.map((hexagon) => ({
  name: hexagon.name,
  networks: hexagon.networks.map((network) => network.name),
}));
