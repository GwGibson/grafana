export const createHexagonPoints = (
  center: { x: number; y: number },
  radius: number,
  moduleExtents: { x: number; y: number },
  detectorExtents: { x: number; y: number },
  rotate90 = false
) => {
  const scaleX = detectorExtents.x / moduleExtents.x;
  const scaleY = detectorExtents.y / moduleExtents.y;
  const scale = Math.min(scaleX, scaleY); // Uniform scaling to maintain aspect ratio

  // Calculate the offset to center the coordinate system
  const offsetX = detectorExtents.x / 2;
  const offsetY = detectorExtents.y / 2;

  const scaledCenter = {
    x: center.x * scale + offsetX,
    y: center.y * scale + offsetY,
  };
  const scaledRadius = radius * scale / 2;

  const hexagonPoints = Array.from({ length: 6 }).map((_, index) => {
    const angle = (Math.PI / 3) * index - (rotate90 ? Math.PI / 2 : 0);
    return {
      x: scaledCenter.x + scaledRadius * Math.cos(angle),
      y: scaledCenter.y + scaledRadius * Math.sin(angle),
    };
  });

  const pointsString = hexagonPoints.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
  return pointsString;
};

export const scaleCoordinates = (
  coords: Array<[number, number]>,
  moduleExtents: { x: number; y: number },
  detectorExtents: { x: number; y: number }
): Array<[number, number]> => {
  // Calculate the scale factor
  const scaleX = detectorExtents.x / moduleExtents.x;
  const scaleY = detectorExtents.y / moduleExtents.y;
  const scale = Math.min(scaleX, scaleY);

  // Calculate the center of the detector view box
  const centerX = detectorExtents.x / 2;
  const centerY = detectorExtents.y / 2;

  const scaledCoords: Array<[number, number]> = coords.map(([x, y]) => [
    x * scale + centerX,
    y * scale + centerY,
  ]);

  return scaledCoords;
};

export const scaleRadius = (
  radius: number,
  moduleExtents: { x: number; y: number },
  detectorExtents: { x: number; y: number }
): number => {
  const scaleX = detectorExtents.x / moduleExtents.x;
  const scaleY = detectorExtents.y / moduleExtents.y;
  const scale = Math.min(scaleX, scaleY);

  return radius * scale;
};

export const createLineComponents = (
  moduleExtents: { x: number; y: number },
  detectorExtents: { X: number; Y: number },
  rotate90 = false
) => {
  const scaleX = detectorExtents.X / moduleExtents.x;
  const scaleY = detectorExtents.Y / moduleExtents.y;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = detectorExtents.X / 2;
  const offsetY = detectorExtents.Y / 2;

  const hexagonPoints = calculateHexagonalPoints(moduleExtents, rotate90).map((point) => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  }));

  const xCenter = offsetX;
  const yCenter = offsetY;

  return hexagonPoints
    .filter((_, index) => [0, 2, 4].includes(index))
    .map((point) => <line key={`${point.x},${point.y}`} x1={xCenter} y1={yCenter} x2={point.x} y2={point.y} />);
};

const calculateHexagonalPoints = (extents: { x: number; y: number }, rotate90 = false) => {
  const xCenter = extents.x / 2;
  const yCenter = extents.y / 2;
  const radius = Math.min(extents.x, extents.y) / 2;

  // Generate hexagonal points, optionally rotated by 90 degrees
  return Array.from({ length: 6 }).map((_, index) => {
    const angle = (Math.PI / 3) * index - (rotate90 ? Math.PI / 2 : 0);
    return {
      x: xCenter + radius * Math.cos(angle),
      y: yCenter + radius * Math.sin(angle),
    };
  });
};
