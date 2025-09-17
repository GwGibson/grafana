export interface DetectorLayout {
  layoutExtent: { width: number; height: number };
  hexagons: HexagonInfo[];
}

export interface HexagonInfo {
  name: string;
  center: { x: number; y: number };
  extent: { width: number; height: number };
  networkStartIndices: number[];
  sensorRadii: number;
  color: string;
  rotateHexagon: boolean;
  networks: NetworkInfo[];
  networkRotationAngle: number;
}

export interface NetworkInfo {
  name: string;
  sensors: SensorInfo[];
}

interface SensorInfo {
  position: [number, number];
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
}

export const createHexagon = (hexagonInfo: HexagonInfo): HexagonInfo => {
  return hexagonInfo;
};
