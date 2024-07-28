export interface ModuleLayout {
  layoutExtent: { width: number; height: number };
  hexagons: HexagonInfo[];
}

export interface HexagonInfo {
  name: string;
  center: { x: number; y: number };
  extent: { width: number; height: number };
  sensorRadii: number;
  color: string;
  rotated: boolean;
  networks: NetworkInfo[];
}

interface NetworkInfo {
  name: string;
  sensors: SensorInfo[];
}

export interface SensorInfo {
  position: [number, number];
  rotation: number;
  sweepFlag: number;
  isDark: boolean;
}

const createNetworks = (moduleType: string, baseName: string, sensors: Record<string, SensorInfo[]>) =>
  Object.entries(sensors).map(([key, sensorArray]) => ({
    name: `${moduleType} ${baseName} ${key}`,
    sensors: sensorArray,
  }));

export const createHexagon = (
  moduleType: string,
  name: string,
  center: { x: number; y: number },
  extent: { width: number; height: number },
  sensorRadii: number,
  color: string,
  rotated: boolean,
  sensors: Record<string, SensorInfo[]>
): Readonly<HexagonInfo> =>
  Object.freeze({
    name: `${moduleType}_${name}`,
    center,
    extent,
    sensorRadii,
    color,
    rotated,
    networks: createNetworks(moduleType, name, sensors),
  });
