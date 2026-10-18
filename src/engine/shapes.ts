import type { Point, DetectedShapeType } from '../types';
import { distance } from './inking';

/**
 * Calculates total path length of points
 */
export function calculatePathLength(points: Point[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += distance(points[i], points[i + 1]);
  }
  return len;
}

/**
 * Attempts to recognize geometric shapes from a sequence of raw or smoothed points
 */
export function detectGeometricShape(points: Point[]): {
  type: DetectedShapeType;
  perfectPoints: Point[];
} {
  if (points.length < 5) {
    return { type: 'none', perfectPoints: points };
  }

  const pStart = points[0];
  const pEnd = points[points.length - 1];
  const totalLength = calculatePathLength(points);
  const directDistance = distance(pStart, pEnd);

  // 1. Line Detection: direct distance is very close to path length
  if (directDistance / totalLength > 0.88) {
    // Generate clean straight line
    const steps = 10;
    const linePoints: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      linePoints.push({
        x: pStart.x + (pEnd.x - pStart.x) * t,
        y: pStart.y + (pEnd.y - pStart.y) * t,
        pressure: (pStart.pressure + pEnd.pressure) / 2,
        time: pStart.time + (pEnd.time - pStart.time) * t,
      });
    }
    return { type: 'line', perfectPoints: linePoints };
  }

  // 2. Closed Loop Detection (Start and End close to each other)
  const isClosed = directDistance / totalLength < 0.22;

  if (isClosed) {
    // Compute center and bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      sumX += p.x;
      sumY += p.y;
    }

    const count = points.length;
    const centerX = sumX / count;
    const centerY = sumY / count;
    const width = maxX - minX;
    const height = maxY - minY;
    const radiusX = width / 2;
    const radiusY = height / 2;

    // Check Circle / Ellipse: evaluate distance from center
    let radiusDiffSum = 0;
    for (const p of points) {
      // Normalized distance in ellipse equation
      const normDist = Math.hypot((p.x - centerX) / (radiusX || 1), (p.y - centerY) / (radiusY || 1));
      radiusDiffSum += Math.abs(normDist - 1.0);
    }
    const ellipseError = radiusDiffSum / count;

    if (ellipseError < 0.25) {
      const isCircle = Math.abs(width - height) / Math.max(width, height) < 0.18;
      const rX = isCircle ? (radiusX + radiusY) / 2 : radiusX;
      const rY = isCircle ? rX : radiusY;

      const circlePoints: Point[] = [];
      const numSteps = 48;
      const basePressure = points[0].pressure || 0.5;

      for (let i = 0; i <= numSteps; i++) {
        const theta = (i / numSteps) * Math.PI * 2;
        circlePoints.push({
          x: centerX + rX * Math.cos(theta),
          y: centerY + rY * Math.sin(theta),
          pressure: basePressure,
          time: points[0].time + i * 10,
        });
      }

      return {
        type: isCircle ? 'circle' : 'ellipse',
        perfectPoints: circlePoints,
      };
    }

    // 3. Rectangle / Square Detection
    // Check if points stay close to the bounding box perimeter
    let boxDistSum = 0;
    for (const p of points) {
      const distLeft = Math.abs(p.x - minX);
      const distRight = Math.abs(p.x - maxX);
      const distTop = Math.abs(p.y - minY);
      const distBottom = Math.abs(p.y - maxY);
      const minDistToEdge = Math.min(distLeft, distRight, distTop, distBottom);
      boxDistSum += minDistToEdge;
    }
    const boxError = boxDistSum / (count * ((width + height) / 4 || 1));

    if (boxError < 0.22) {
      const rectCorners = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY },
      ];
      const rectPoints: Point[] = [];
      const basePressure = points[0].pressure || 0.5;

      for (let i = 0; i < rectCorners.length - 1; i++) {
        const c1 = rectCorners[i];
        const c2 = rectCorners[i + 1];
        for (let s = 0; s < 8; s++) {
          const t = s / 8;
          rectPoints.push({
            x: c1.x + (c2.x - c1.x) * t,
            y: c1.y + (c2.y - c1.y) * t,
            pressure: basePressure,
            time: points[0].time,
          });
        }
      }
      rectPoints.push({
        x: rectCorners[0].x,
        y: rectCorners[0].y,
        pressure: basePressure,
        time: points[0].time,
      });

      return { type: 'rectangle', perfectPoints: rectPoints };
    }
  }

  return { type: 'none', perfectPoints: points };
}

/**
 * Generates exact geometric shapes from drag bounds
 */
export function generateExplicitShape(
  kind: 'rect' | 'circle' | 'triangle' | 'diamond' | 'capsule',
  p1: Point,
  p2: Point
): Point[] {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const now = Date.now();

  if (kind === 'rect') {
    return [
      { x: minX, y: minY, pressure: 0.5, time: now },
      { x: maxX, y: minY, pressure: 0.5, time: now },
      { x: maxX, y: maxY, pressure: 0.5, time: now },
      { x: minX, y: maxY, pressure: 0.5, time: now },
      { x: minX, y: minY, pressure: 0.5, time: now },
    ];
  }

  if (kind === 'circle') {
    const rx = width / 2;
    const ry = height / 2;
    const points: Point[] = [];
    for (let i = 0; i <= 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      points.push({
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle),
        pressure: 0.5,
        time: now,
      });
    }
    return points;
  }

  if (kind === 'triangle') {
    return [
      { x: centerX, y: minY, pressure: 0.5, time: now },
      { x: maxX, y: maxY, pressure: 0.5, time: now },
      { x: minX, y: maxY, pressure: 0.5, time: now },
      { x: centerX, y: minY, pressure: 0.5, time: now },
    ];
  }

  if (kind === 'diamond') {
    return [
      { x: centerX, y: minY, pressure: 0.5, time: now },
      { x: maxX, y: centerY, pressure: 0.5, time: now },
      { x: centerX, y: maxY, pressure: 0.5, time: now },
      { x: minX, y: centerY, pressure: 0.5, time: now },
      { x: centerX, y: minY, pressure: 0.5, time: now },
    ];
  }

  if (kind === 'capsule') {
    const points: Point[] = [];
    for (let i = 0; i <= 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      points.push({
        x: centerX + (width / 2) * Math.cos(angle),
        y: centerY + (height / 2) * Math.sin(angle),
        pressure: 0.5,
        time: now,
      });
    }
    return points;
  }

  return [p1, p2];
}
