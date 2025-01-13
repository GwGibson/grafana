import { createHexagon, HexagonInfo } from '../../builderUtils';
import { componentMap } from '../componentMap';
import { AL_SENSORS } from '../sensors/al';
import { TIN_SENSORS } from '../sensors/tin';

// TODO: Uncouple the hexagons from the detector type.
const AL_CONFIG = {
  extent: { width: 140000, height: 140000 },
  sensorRadii: 500,
  color: '#F8D490',
  rotateHexagon: true,
}as const;

export const AL_HEXAGON_LEFT: Readonly<HexagonInfo> = createHexagon({
  name: componentMap['PRIMECAM-280'].arrayNames[0],
  center: { x: -63250, y: 37886.75 },
  extent: AL_CONFIG.extent,
  networkStartIndices: [0, 572, 1148, 1724, 2300, 2876],
  sensorRadii: AL_CONFIG.sensorRadii,
  color: AL_CONFIG.color,
  rotateHexagon: AL_CONFIG.rotateHexagon,
  networks: AL_SENSORS,
  networkRotationAngle: 120,
}as const);

export const AL_HEXAGON_RIGHT: Readonly<HexagonInfo> = createHexagon({
  name: componentMap['PRIMECAM-280'].arrayNames[1],
  center: { x: 63250, y: 37886.75 },
  extent: AL_CONFIG.extent,
  networkStartIndices: [3448, 4020, 4596, 5172, 5748, 6324],
  sensorRadii: AL_CONFIG.sensorRadii,
  color: AL_CONFIG.color,
  rotateHexagon: AL_CONFIG.rotateHexagon,
  networks: AL_SENSORS,
  networkRotationAngle: 0,
}as const);

export const TIN_HEXAGON: Readonly<HexagonInfo> = createHexagon({
  name: componentMap['PRIMECAM-280'].arrayNames[2],
  center: { x: 0, y: -70000 },
  extent: { width: 140000, height: 140000 },
  networkStartIndices: [6896, 7472, 8048, 8624, 9200, 9776],
  sensorRadii: 500,
  color: '#D3D4D5',
  rotateHexagon: true,
  networks: TIN_SENSORS,
  networkRotationAngle: 60,
}as const);

// TODO: temporary solution until revamp this to be more network oriented
// and develop a more robust layout manager.
export const AL_HEXAGON_LEFT_SOLO: Readonly<HexagonInfo> = createHexagon({
  name: componentMap['PRIMECAM-280'].arrayNames[0],
  center: { x: 0, y: 0 },
  extent: { width: 140000, height: 140000 },
  networkStartIndices: [0, 572, 1148, 1724, 2300, 2876],
  sensorRadii: 1000,
  color: AL_CONFIG.color,
  rotateHexagon: AL_CONFIG.rotateHexagon,
  networks: AL_SENSORS,
  networkRotationAngle: 120,
}as const);

export const AL_HEXAGON_RIGHT_SOLO: Readonly<HexagonInfo> = createHexagon({
  name: componentMap['PRIMECAM-280'].arrayNames[1],
  center: { x: 0, y: 0 },
  extent: { width: 140000, height: 140000 },
  networkStartIndices: [3448, 4020, 4596, 5172, 5748, 6324],
  sensorRadii: 1000,
  color: AL_CONFIG.color,
  rotateHexagon: AL_CONFIG.rotateHexagon,
  networks: AL_SENSORS,
  networkRotationAngle: 0,
}as const);

export const TIN_HEXAGON_SOLO: Readonly<HexagonInfo> = createHexagon({
  name: componentMap['PRIMECAM-280'].arrayNames[2],
  center: { x: 0, y: 0 },
  extent: { width: 140000, height: 140000 },
  networkStartIndices: [6896, 7472, 8048, 8624, 9200, 9776],
  sensorRadii: 1000,
  color: '#D3D4D5',
  rotateHexagon: true,
  networks: TIN_SENSORS,
  networkRotationAngle: 60,
}as const);
