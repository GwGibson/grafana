import React, { useRef, useEffect, useMemo } from 'react';

import { renderColorBar } from '../colorbar/colorbar';
import { VIEWBOX_LAYOUT } from '../utils/layout';
import { renderingHelpers, SENSOR_STYLES } from '../utils/renderingConfig';

import { RenderProps } from './sharedTypes';

// Pre-create reusable Path2D objects outside component
const SENSOR_PATH_0 = new Path2D();
SENSOR_PATH_0.moveTo(-1, 0);
SENSOR_PATH_0.arc(0, 0, 1, Math.PI, 0, false);
SENSOR_PATH_0.closePath();

const SENSOR_PATH_1 = new Path2D();
SENSOR_PATH_1.moveTo(1, 0);
SENSOR_PATH_1.arc(0, 0, 1, 0, Math.PI, false);
SENSOR_PATH_1.closePath();

interface SensorGroup {
  fillColor: string;
  strokeColor: string;
  sensors: Array<{
    x: number;
    y: number;
    radius: number;
    rotation: number;
    sweepFlag: number;
  }>;
}

export const DetectorCanvas: React.FC<RenderProps> = ({ detectorComponentData, data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pre-group sensors to avoid repeated grouping
  const sensorGroups = useMemo(() => {
    const groups = new Map<string, SensorGroup>();

    for (const sensor of detectorComponentData.sensors) {
      const strokeColor = renderingHelpers.getStrokeColor(sensor.isDark);
      const key = `${sensor.fillColor}-${strokeColor}`;

      if (!groups.has(key)) {
        groups.set(key, {
          fillColor: sensor.fillColor,
          strokeColor: strokeColor,
          sensors: [],
        });
      }

      const group = groups.get(key)!;
      group.sensors.push({
        x: sensor.scaledPosition[0],
        y: sensor.scaledPosition[1],
        radius: sensor.radius,
        rotation: sensor.rotation,
        sweepFlag: sensor.sweepFlag,
      });
    }

    return Array.from(groups.values());
  }, [detectorComponentData.sensors]);

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

    // Clear canvas (transparent background like SVG)
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Draw hexagons (standard approach - only 3 hexagons max)
    for (const hexagon of detectorComponentData.hexagons) {
      const { points, color } = hexagon;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
    }

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

    // Draw sensors using pre-grouped data
    ctx.lineWidth = SENSOR_STYLES.STROKE_WIDTH_CANVAS;

    for (const group of sensorGroups) {
      ctx.fillStyle = group.fillColor;
      ctx.strokeStyle = group.strokeColor;

      for (const sensor of group.sensors) {
        ctx.save();
        ctx.translate(sensor.x, sensor.y);
        ctx.rotate((sensor.rotation * Math.PI) / 180);
        ctx.scale(sensor.radius, sensor.radius);

        const path = sensor.sweepFlag === 1 ? SENSOR_PATH_1 : SENSOR_PATH_0;
        ctx.fill(path);
        ctx.stroke(path);

        ctx.restore();
      }
    }

    // Copy to visible canvas
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

    // Create offscreen canvas only once
    if (!offscreenCanvasRef.current) {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = VIEWBOX_LAYOUT.VIEWBOX.WIDTH;
      offscreenCanvas.height = VIEWBOX_LAYOUT.VIEWBOX.HEIGHT;
      offscreenCanvasRef.current = offscreenCanvas;
    }

    renderAllContent();
  });

  return (
    <canvas
      ref={canvasRef}
      width={VIEWBOX_LAYOUT.VIEWBOX.WIDTH}
      height={VIEWBOX_LAYOUT.VIEWBOX.HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
};
