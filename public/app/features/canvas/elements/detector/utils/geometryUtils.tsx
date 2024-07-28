// Utility types
type Point = { x: number; y: number };
type Extent = { width: number; height: number };

// Utility Functions
// Fit within
const calculateScaleFit = (fromExtent: Extent, toExtent: Extent): number => {
  const scaleX = toExtent.width / fromExtent.width;
  const scaleY = toExtent.height / fromExtent.height;
  return Math.min(scaleX, scaleY);
};

// Non-uniform scaling (may distort)
const calculateScaleNonUniform = (fromExtent: Extent, toExtent: Extent): Extent => {
  return {
    width: toExtent.width / fromExtent.width,
    height: toExtent.height / fromExtent.height,
  };
};

const calculateOffset = (extent: Extent): Point => ({
  x: extent.width / 2,
  y: extent.height / 2,
});

const scalePoint = (point: Point, offset: Point, scale = { width: 1, height: 1 }): Point => ({
  x: point.x * scale.width + offset.x,
  y: offset.y - point.y * scale.height, // For traditional x-y orientation
});

// Main functions
export const createHexagonPoints = (
  viewboxModuleExtent: Extent,
  layoutExtent: Extent,
  center: Point,
  hexagonExtent: Extent,
  rotate = false
): string => {
  const offset = calculateOffset(viewboxModuleExtent);
  const scaledCenter = scalePoint(center, offset, calculateScaleNonUniform(layoutExtent, viewboxModuleExtent));
  const scaledRadius =
    (Math.max(hexagonExtent.width, hexagonExtent.height) * calculateScaleFit(layoutExtent, viewboxModuleExtent)) / 2;

  const hexagonPoints = Array.from({ length: 6 }).map((_, index) => {
    const angle = (Math.PI / 3) * index - (rotate ? Math.PI / 2 : 0);
    return {
      x: scaledCenter.x + scaledRadius * Math.cos(angle),
      y: scaledCenter.y + scaledRadius * Math.sin(angle),
    };
  });

  return hexagonPoints.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
};

export const scaleCoordinates = (
  viewboxModuleExtent: Extent,
  layoutExtent: Extent,
  coords: Array<[number, number]>,
  hexagonExtent: Extent,
  center: Point
): Array<[number, number]> => {
  const offset = calculateOffset(viewboxModuleExtent);
  const layoutScale = calculateScaleNonUniform(layoutExtent, viewboxModuleExtent);
  const hexagonScale = calculateScaleNonUniform(hexagonExtent, viewboxModuleExtent);

  const hexagonToLayoutScale = {
    width: hexagonExtent.width / layoutExtent.width,
    height: hexagonExtent.height / layoutExtent.height
  };

  // Calculate the final scale for the coordinates
  const finalScale = {
    width: hexagonScale.width * hexagonToLayoutScale.width,
    height: hexagonScale.height * hexagonToLayoutScale.height
  };

  // Scale the center point
  const scaledCenter = scalePoint(center, offset, layoutScale);

  return coords.map(([x, y]) => {
    // Scale the coordinates
    const scaledX = x * finalScale.width;
    const scaledY = y * finalScale.height;

    // Position the scaled coordinates relative to the scaled center
    return [
      scaledCenter.x + scaledX,
      scaledCenter.y - scaledY, // Invert Y for SVG coordinate system
    ];
  });
};

export const scaleRadius = (radius: number, fromExtent: Extent, toExtent: Extent): number => {
  const scale = calculateScaleFit(fromExtent, toExtent);
  return radius * scale;
};
