import React from 'react';

export const createHexagonComponent = (extents: { x: number; y: number }, rotate90 = false) => {
  const hexagonPoints = calculateHexagonalPoints(extents, rotate90);
  const pointsString = hexagonPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  return <polygon points={pointsString} />;
};

export const createLineComponents = (extents: { x: number; y: number }, rotate90 = false) => {
  const hexagonPoints = calculateHexagonalPoints(extents, rotate90);
  const xCenter = extents.x / 2;
  const yCenter = extents.y / 2;

  // Filter and create lines from the center to the 0th, 2nd, and 4th vertices
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
