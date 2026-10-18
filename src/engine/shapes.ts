import type { Point, DetectedShapeType, ShapeKind } from '../types';
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
 * Distance from point (px, py) to line segment (x1, y1)-(x2, y2)
 */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Average distance from points to a polygon perimeter
 */
function averageDistToPolygon(
  points: Point[],
  vertices: { x: number; y: number }[]
): number {
  let total = 0;
  for (const p of points) {
    let minDist = Infinity;
    for (let i = 0; i < vertices.length - 1; i++) {
      const d = distToSegment(
        p.x,
        p.y,
        vertices[i].x,
        vertices[i].y,
        vertices[i + 1].x,
        vertices[i + 1].y
      );
      if (d < minDist) minDist = d;
    }
    total += minDist;
  }
  return total / points.length;
}

/**
 * Recognizes geometric shapes from user's hand-drawn ink points
 */
export function detectGeometricShape(points: Point[]): {
  type: DetectedShapeType;
  perfectPoints: Point[];
} {
  if (points.length < 4) {
    return { type: 'none', perfectPoints: points };
  }

  const pStart = points[0];
  const pEnd = points[points.length - 1];
  const totalLength = calculatePathLength(points);
  const directDistance = distance(pStart, pEnd);

  // 1. Straight Line Detection: direct distance is close to total stroke length
  if (totalLength > 15 && directDistance / totalLength > 0.80) {
    const linePoints: Point[] = [
      { x: pStart.x, y: pStart.y, pressure: 0.5, time: pStart.time },
      { x: pEnd.x, y: pEnd.y, pressure: 0.5, time: pEnd.time },
    ];
    return { type: 'line', perfectPoints: linePoints };
  }

  // 2. Closed Loop Detection
  const isClosed = directDistance / totalLength < 0.35 || directDistance < 45;
  if (!isClosed) {
    return { type: 'none', perfectPoints: points };
  }

  // Compute bounding box and center
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
  const width = Math.max(12, maxX - minX);
  const height = Math.max(12, maxY - minY);
  const diag = Math.hypot(width, height) || 1;
  const radiusX = width / 2;
  const radiusY = height / 2;
  const now = points[0].time;

  // Candidate A: Circle / Ellipse
  let radiusDiffSum = 0;
  for (const p of points) {
    const normDist = Math.hypot((p.x - centerX) / radiusX, (p.y - centerY) / radiusY);
    radiusDiffSum += Math.abs(normDist - 1.0);
  }
  const ellipseError = radiusDiffSum / count;

  // Candidate B: Rectangle / Square
  const rectCorners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
    { x: minX, y: minY },
  ];
  const rectError = averageDistToPolygon(points, rectCorners) / diag;

  // Candidate C: Triangle
  // Find top vertex, bottom-right vertex, and bottom-left vertex
  let pTop = points[0];
  let pBottomLeft = points[0];
  let pBottomRight = points[0];

  for (const p of points) {
    if (p.y < pTop.y) pTop = p;
    if (p.x - p.y < pBottomLeft.x - pBottomLeft.y) pBottomLeft = p;
    if (p.x + p.y > pBottomRight.x + pBottomRight.y) pBottomRight = p;
  }

  const triangleVertices = [
    { x: pTop.x, y: pTop.y },
    { x: pBottomRight.x, pBottomRight: pBottomRight.y },
    { x: pBottomLeft.x, y: pBottomLeft.y },
    { x: pTop.x, y: pTop.y },
  ].map((v) => ({ x: v.x, y: (v as any).pBottomRight || v.y }));

  const triangleError = averageDistToPolygon(points, triangleVertices) / diag;

  // Candidate D: Diamond
  const diamondVertices = [
    { x: centerX, y: minY },
    { x: maxX, y: centerY },
    { x: centerX, y: maxY },
    { x: minX, y: centerY },
    { x: centerX, y: minY },
  ];
  const diamondError = averageDistToPolygon(points, diamondVertices) / diag;

  // Determine best matching shape with error tolerance
  const errors = [
    { type: 'ellipse' as const, err: ellipseError },
    { type: 'rectangle' as const, err: rectError },
    { type: 'triangle' as const, err: triangleError },
    { type: 'diamond' as const, err: diamondError },
  ].sort((a, b) => a.err - b.err);

  const best = errors[0];

  if (best.type === 'ellipse' && best.err < 0.28) {
    const isCircle = Math.abs(width - height) / Math.max(width, height) < 0.22;
    const rX = isCircle ? (radiusX + radiusY) / 2 : radiusX;
    const rY = isCircle ? rX : radiusY;

    const circlePoints: Point[] = [];
    const numSteps = 48;
    for (let i = 0; i <= numSteps; i++) {
      const theta = (i / numSteps) * Math.PI * 2;
      circlePoints.push({
        x: centerX + rX * Math.cos(theta),
        y: centerY + rY * Math.sin(theta),
        pressure: 0.5,
        time: now,
      });
    }

    return {
      type: isCircle ? 'circle' : 'ellipse',
      perfectPoints: circlePoints,
    };
  }

  if (best.type === 'rectangle' && best.err < 0.26) {
    const isSquare = Math.abs(width - height) / Math.max(width, height) < 0.18;
    const side = isSquare ? (width + height) / 2 : 0;
    const l = isSquare ? centerX - side / 2 : minX;
    const r = isSquare ? centerX + side / 2 : maxX;
    const t = isSquare ? centerY - side / 2 : minY;
    const b = isSquare ? centerY + side / 2 : maxY;

    return {
      type: 'rectangle',
      perfectPoints: [
        { x: l, y: t, pressure: 0.5, time: now },
        { x: r, y: t, pressure: 0.5, time: now },
        { x: r, y: b, pressure: 0.5, time: now },
        { x: l, y: b, pressure: 0.5, time: now },
        { x: l, y: t, pressure: 0.5, time: now },
      ],
    };
  }

  if (best.type === 'triangle' && best.err < 0.26) {
    return {
      type: 'triangle',
      perfectPoints: [
        { x: centerX, y: minY, pressure: 0.5, time: now },
        { x: maxX, y: maxY, pressure: 0.5, time: now },
        { x: minX, y: maxY, pressure: 0.5, time: now },
        { x: centerX, y: minY, pressure: 0.5, time: now },
      ],
    };
  }

  if (best.type === 'diamond' && best.err < 0.26) {
    return {
      type: 'diamond',
      perfectPoints: [
        { x: centerX, y: minY, pressure: 0.5, time: now },
        { x: maxX, y: centerY, pressure: 0.5, time: now },
        { x: centerX, y: maxY, pressure: 0.5, time: now },
        { x: minX, y: centerY, pressure: 0.5, time: now },
        { x: centerX, y: minY, pressure: 0.5, time: now },
      ],
    };
  }

  return { type: 'none', perfectPoints: points };
}

/**
 * Generates exact geometric shapes from drag start and end bounds
 */
export function generateExplicitShape(
  kind: ShapeKind,
  p1: Point,
  p2: Point
): Point[] {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  const width = Math.max(8, maxX - minX);
  const height = Math.max(8, maxY - minY);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const now = Date.now();

  if (kind === 'line') {
    return [
      { x: p1.x, y: p1.y, pressure: 0.5, time: now },
      { x: p2.x, y: p2.y, pressure: 0.5, time: now },
    ];
  }

  if (kind === 'arrow') {
    return [
      { x: p1.x, y: p1.y, pressure: 0.5, time: now },
      { x: p2.x, y: p2.y, pressure: 0.5, time: now },
    ];
  }

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
    const numSteps = 48;
    for (let i = 0; i <= numSteps; i++) {
      const angle = (i / numSteps) * Math.PI * 2;
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
    const rx = width / 2;
    const ry = height / 2;
    const points: Point[] = [];
    const numSteps = 48;
    for (let i = 0; i <= numSteps; i++) {
      const angle = (i / numSteps) * Math.PI * 2;
      points.push({
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle),
        pressure: 0.5,
        time: now,
      });
    }
    return points;
  }

  return [p1, p2];
}
