import type { Point, Stroke, ToolType, BoundingBox } from '../types';

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/**
 * Computes dynamic radius for a point based on tool, pressure, velocity, and tilt
 */
export function computeRadius(
  point: Point,
  prevPoint: Point | null,
  tool: ToolType,
  baseWidth: number,
  index: number,
  totalPoints: number
): number {
  if (tool === 'highlighter') {
    return baseWidth;
  }

  const p = point.pressure > 0 ? point.pressure : 0.5;

  let velocity = 0;
  let angle = 0;
  if (prevPoint) {
    const dist = distance(point, prevPoint);
    const dt = Math.max(1, point.time - prevPoint.time) / 1000;
    velocity = dist / dt;
    angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
  }

  // Velocity dampening
  const vFactor = Math.max(0.35, 1.0 - Math.min(velocity / 3200, 0.65));

  if (tool === 'pen') {
    // Ballpoint: consistent, clean ink flow with subtle pressure feedback
    return (baseWidth / 2) * (0.85 + 0.3 * p);
  }

  if (tool === 'fountain') {
    // Fountain Pen: fluid, expressive ink with start/end tapering
    let radius = (baseWidth / 2) * (0.3 + 1.2 * p) * vFactor;
    if (index < 4 && totalPoints > 8) {
      radius *= (index + 1) / 5;
    } else if (index >= totalPoints - 4 && totalPoints > 8) {
      radius *= (totalPoints - index) / 5;
    }
    return Math.max(radius, baseWidth * 0.15);
  }

  if (tool === 'calligraphy') {
    // Calligraphy Chisel Nib: fixed 40 degree blade angle
    const nibAngle = (40 * Math.PI) / 180;
    const diffAngle = angle - nibAngle;
    const chiselFactor = Math.abs(Math.sin(diffAngle));
    const width = (baseWidth / 2) * (0.25 + 1.2 * chiselFactor) * (0.8 + 0.4 * p);
    return Math.max(width, baseWidth * 0.2);
  }

  if (tool === 'pencil') {
    // Graphite Pencil: softer response, broader when tilted
    const tilt = point.tiltX && point.tiltY ? Math.hypot(point.tiltX, point.tiltY) : 0;
    const tiltMultiplier = 1.0 + Math.min(tilt / 45, 0.8);
    return (baseWidth / 2) * (0.6 + 0.6 * p) * tiltMultiplier;
  }

  if (tool === 'brush') {
    return (baseWidth / 2) * (0.2 + 1.6 * p);
  }

  return baseWidth / 2;
}

/**
 * Smooths raw points using Catmull-Rom splines and sub-segment interpolation
 */
export function smoothPoints(rawPoints: Point[]): Point[] {
  if (rawPoints.length < 3) return rawPoints;

  const smoothed: Point[] = [rawPoints[0]];

  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p0 = i > 0 ? rawPoints[i - 1] : rawPoints[0];
    const p1 = rawPoints[i];
    const p2 = rawPoints[i + 1];
    const p3 = i < rawPoints.length - 2 ? rawPoints[i + 2] : p2;

    const segDist = distance(p1, p2);
    const steps = Math.min(8, Math.max(1, Math.floor(segDist / 3.5)));

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
      const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
      const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;
      const time = p1.time + (p2.time - p1.time) * t;
      const audioTimeOffset = p1.audioTimeOffset;

      smoothed.push({ x, y, pressure, time, audioTimeOffset });
    }
  }

  return smoothed;
}

/**
 * Generates ribbon polygon mesh from smoothed points
 */
export function generateRibbonPolygon(
  points: Point[],
  tool: ToolType,
  baseWidth: number
): { leftOutline: Point[]; rightOutline: Point[] } {
  const leftOutline: Point[] = [];
  const rightOutline: Point[] = [];

  const count = points.length;
  if (count === 0) return { leftOutline, rightOutline };

  const radii: number[] = new Array(count);
  for (let i = 0; i < count; i++) {
    radii[i] = computeRadius(points[i], i > 0 ? points[i - 1] : null, tool, baseWidth, i, count);
  }

  for (let i = 0; i < count; i++) {
    const curr = points[i];
    let dx = 0;
    let dy = 0;

    if (i === 0 && count > 1) {
      dx = points[1].x - curr.x;
      dy = points[1].y - curr.y;
    } else if (i === count - 1 && count > 1) {
      dx = curr.x - points[i - 1].x;
      dy = curr.y - points[i - 1].y;
    } else if (count > 2) {
      dx = points[i + 1].x - points[i - 1].x;
      dy = points[i + 1].y - points[i - 1].y;
    }

    const len = Math.hypot(dx, dy);
    let nx = 0;
    let ny = 1;

    if (len > 0.0001) {
      nx = -dy / len;
      ny = dx / len;
    }

    const r = radii[i];
    leftOutline.push({
      x: curr.x + nx * r,
      y: curr.y + ny * r,
      pressure: curr.pressure,
      time: curr.time,
    });

    rightOutline.push({
      x: curr.x - nx * r,
      y: curr.y - ny * r,
      pressure: curr.pressure,
      time: curr.time,
    });
  }

  return { leftOutline, rightOutline };
}

export function calculateStrokeBounds(points: Point[], baseWidth: number): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const pad = baseWidth * 2;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/**
 * Master vector stroke renderer supporting Fountain, Calligraphy, Pencil, Ballpoint, and Highlighter
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number = 1.0
): void {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = stroke.opacity || 0.35;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';
  } else if (stroke.tool === 'pencil') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = stroke.opacity || 0.82;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = stroke.opacity || 1.0;
  }

  ctx.fillStyle = stroke.color;
  ctx.strokeStyle = stroke.color;

  if (points.length === 1) {
    const p = points[0];
    const r = Math.max(1, (stroke.baseWidth / 2) * (p.pressure || 0.5));
    ctx.beginPath();
    ctx.arc(p.x * scale, p.y * scale, r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const smoothed = points.length > 3 ? smoothPoints(points) : points;
  const { leftOutline, rightOutline } = generateRibbonPolygon(smoothed, stroke.tool, stroke.baseWidth);

  if (leftOutline.length === 0) {
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(leftOutline[0].x * scale, leftOutline[0].y * scale);

  for (let i = 1; i < leftOutline.length; i++) {
    ctx.lineTo(leftOutline[i].x * scale, leftOutline[i].y * scale);
  }

  const lastPoint = smoothed[smoothed.length - 1];
  const endRadius = computeRadius(lastPoint, null, stroke.tool, stroke.baseWidth, smoothed.length - 1, smoothed.length);
  ctx.arc(lastPoint.x * scale, lastPoint.y * scale, endRadius * scale, 0, Math.PI * 2, false);

  ctx.moveTo(rightOutline[rightOutline.length - 1].x * scale, rightOutline[rightOutline.length - 1].y * scale);
  for (let i = rightOutline.length - 2; i >= 0; i--) {
    ctx.lineTo(rightOutline[i].x * scale, rightOutline[i].y * scale);
  }

  const firstPoint = smoothed[0];
  const startRadius = computeRadius(firstPoint, null, stroke.tool, stroke.baseWidth, 0, smoothed.length);
  ctx.arc(firstPoint.x * scale, firstPoint.y * scale, startRadius * scale, 0, Math.PI * 2, false);

  ctx.fill();
  ctx.restore();
}
