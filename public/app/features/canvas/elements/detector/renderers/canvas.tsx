import React, { useRef, useEffect } from 'react';

import { renderColorBar } from '../colorbar/colorbar';
import { VIEWBOX_LAYOUT } from '../utils/layout';

import { RenderProps } from './sharedTypes';

export const DetectorCanvas: React.FC<RenderProps> = ({ detectorComponentData, data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderAllContent = () => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!canvas || !offscreenCanvas) {
      return;
    }

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Render hexagons
    detectorComponentData.hexagons.forEach((hexagon) => {
      const { points, color } = hexagon;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
    });

    // Render color bar
    renderColorBar(ctx, {
      colorBar: data.colorData.colorBar,
      minMeasurement: data.colorData.minMeasurement,
      maxMeasurement: data.colorData.maxMeasurement,
      dimensions: {
        x: VIEWBOX_LAYOUT.COLORBAR.X,
        y: VIEWBOX_LAYOUT.COLORBAR.Y,
        width: VIEWBOX_LAYOUT.COLORBAR.WIDTH,
        height: VIEWBOX_LAYOUT.COLORBAR.HEIGHT,
      },
    });

    const sensorPath0 = new Path2D();
    sensorPath0.moveTo(-1, 0);
    sensorPath0.arc(0, 0, 1, Math.PI, 0, false);
    sensorPath0.closePath();

    const sensorPath1 = new Path2D();
    sensorPath1.moveTo(1, 0);
    sensorPath1.arc(0, 0, 1, 0, Math.PI, false);
    sensorPath1.closePath();

    // Group sensors to reduce state changes
    const groupedSensors = detectorComponentData.sensors.reduce(
      (acc, sensor) => {
        const key = `${sensor.fillColor}-${sensor.isDark}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(sensor);
        return acc;
      },
      {} as Record<string, typeof detectorComponentData.sensors>
    );

    Object.entries(groupedSensors).forEach(([key, sensors]) => {
      const [fillColor, isDark] = key.split('-');
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = isDark === 'true' ? 'brown' : 'black';
      ctx.lineWidth = 0.125;

      sensors.forEach((sensor) => {
        const [x, y] = sensor.scaledPosition;
        const radius = sensor.radius;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((sensor.rotation * Math.PI) / 180);
        ctx.scale(radius, radius);

        const currentPath = sensor.sweepFlag === 1 ? sensorPath1 : sensorPath0;

        ctx.fill(currentPath);
        ctx.stroke(currentPath);

        ctx.restore();
      });
    });

    // Copy the offscreen canvas to the visible canvas
    const visibleCtx = canvas.getContext('2d');
    if (visibleCtx) {
      visibleCtx.clearRect(0, 0, canvas.width, canvas.height);
      visibleCtx.drawImage(offscreenCanvas, 0, 0);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // Create offscreen canvas
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = VIEWBOX_LAYOUT.VIEWBOX.WIDTH;
    offscreenCanvas.height = VIEWBOX_LAYOUT.VIEWBOX.HEIGHT;
    offscreenCanvasRef.current = offscreenCanvas;

    // Render content
    renderAllContent();
  }); // Dependencies to re-render when data changes

  return (
    <canvas
      ref={canvasRef}
      width={VIEWBOX_LAYOUT.VIEWBOX.WIDTH}
      height={VIEWBOX_LAYOUT.VIEWBOX.HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
};
