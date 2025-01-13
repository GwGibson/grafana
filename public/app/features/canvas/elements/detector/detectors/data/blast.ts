import { createHexagon, DetectorLayout} from '../builderUtils';

import { componentMap } from './componentMap';
import { BLAST_SENSORS } from './sensors/blast';

const BLAST_HEXAGON = createHexagon({
  name: componentMap['BLAST'].arrayNames[0],
  center: { x: 0, y: 0 },
  extent: { width: 95000, height: 95000 },
  networkStartIndices: [0],
  sensorRadii: 1200,
  color: '#C0C0C0',
  rotateHexagon: false,
  networks: BLAST_SENSORS,
  networkRotationAngle: 0,
}as const);

export const BLAST_DETECTOR_LAYOUT: DetectorLayout = {
  layoutExtent: { width: 95000, height: 95000 },
  hexagons: [BLAST_HEXAGON],
}as const;
