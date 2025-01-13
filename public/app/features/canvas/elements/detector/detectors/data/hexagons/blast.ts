import { createHexagon, HexagonInfo } from '../../builderUtils';
import { componentMap } from '../componentMap';
import { BLAST_SENSORS } from '../sensors/blast';

const BLAST_CONFIG = {
    extent: { width: 95000, height: 95000 },
    sensorRadii: 1200,
    color: '#C0C0C0',
    rotateHexagon: false,
  } as const;
  
  export const BLAST_HEXAGON: Readonly<HexagonInfo> = createHexagon({
    name: componentMap['BLAST'].arrayNames[0],
    center: { x: 0, y: 0 },
    extent: BLAST_CONFIG.extent,
    networkStartIndices: [0],
    sensorRadii: BLAST_CONFIG.sensorRadii,
    color: BLAST_CONFIG.color,
    rotateHexagon: BLAST_CONFIG.rotateHexagon,
    networks: BLAST_SENSORS,
    networkRotationAngle: 0,
  }as const);
