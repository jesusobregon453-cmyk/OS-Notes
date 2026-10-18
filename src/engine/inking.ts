import type { Point, Stroke, ToolType, BoundingBox } from '../types';

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function colorToRgba(color: string, alpha: number = 0.25): string {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return color;
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

  const vFactor = Math.max(0.4, 1.0 - Math.min(velocity / 3000, 0.6));

  if (tool === 'pen') {
    // Ballpoint: stable, consistent width with minor pressure response
    return (baseWidth / 2) * (0.85 + 0.3 * p);
  }

  if (tool === 'fountain') {
    // Fountain Pen: fluid tapering and velocity/pressure dynamics
    let radius = (baseWidth / 2) * (0.35 + 1.1 * p) * vFactor;
    if (index < 4 && totalPoints > 8) {
      radius *= (index + 1) / 5;
    } else if (index >= totalPoints - 4 && totalPoints > 8) {
      radius *= (totalPoints - index) / 5;
    }
    return Math.max(radius, baseWidth * 0.15);
  }

  if (tool === 'calligraphy') {
    // Calligraphy Chisel: 40 degree blade angle
    const nibAngle = (40 * Math.PI) / 180;
    const diffAngle = angle - nibAngle;
    const chiselFactor = Math.abs(Math.sin(diffAngle));
    const width = (baseWidth / 2) * (0.25 + 1.2 * chiselFactor) * (0.8 + 0.4 * p);
    return Math.max(width, baseWidth * 0.2);
  }

  if (tool === 'pencil') {
    // Graphite Pencil: tilt sensitivity and pressure
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
 * Smooths raw points using Catmull-Rom splines
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
    const steps = Math.min(6, Math.max(1, Math.floor(segDist / 4)));

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
 * Master vector stroke renderer:
 * Renders smooth handwriting using continuous midpoint quadratic Bezier splines and round joins.
 * Completely avoids polygon fill self-intersections or accidental lasso-like fills!
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
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = stroke.opacity || 1.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;

  // Pure Geometric Shape Rendering (Rectangles, Triangles, Circles, Lines, Arrows, Diamonds, Capsules)
  if (stroke.tool === 'shape' || stroke.shapeType) {
    ctx.lineWidth = Math.max(1, stroke.baseWidth * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x * scale, points[0].y * scale);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale, points[i].y * scale);
    }

    const isNonClosed = stroke.shapeType === 'line' || stroke.shapeType === 'arrow';
    if (!isNonClosed && points.length >= 3) {
      ctx.closePath();
    }

    if (stroke.fillColor && !isNonClosed && points.length >= 3) {
      ctx.save();
      ctx.fillStyle = stroke.fillColor;
      ctx.fill();
      ctx.restore();
    }

    ctx.stroke();

    // Render arrowhead for arrow shapes
    if (stroke.shapeType === 'arrow' && points.length >= 2) {
      const pStart = points[0];
      const pEnd = points[points.length - 1];
      const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
      const arrowHeadLength = Math.max(14, stroke.baseWidth * 3.5) * scale;
      const arrowAngle = Math.PI / 6;

      ctx.beginPath();
      ctx.moveTo(pEnd.x * scale, pEnd.y * scale);
      ctx.lineTo(
        (pEnd.x * scale) - arrowHeadLength * Math.cos(angle - arrowAngle),
        (pEnd.y * scale) - arrowHeadLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(pEnd.x * scale, pEnd.y * scale);
      ctx.lineTo(
        (pEnd.x * scale) - arrowHeadLength * Math.cos(angle + arrowAngle),
        (pEnd.y * scale) - arrowHeadLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // Single dot
  if (points.length === 1) {
    const p = points[0];
    const r = Math.max(1, (stroke.baseWidth / 2) * (p.pressure || 0.5));
    ctx.beginPath();
    ctx.arc(p.x * scale, p.y * scale, r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 2 points line
  if (points.length === 2) {
    const p1 = points[0];
    const p2 = points[1];
    const r = computeRadius(p2, p1, stroke.tool, stroke.baseWidth, 1, 2);
    ctx.lineWidth = Math.max(0.8, r * 2 * scale);
    ctx.beginPath();
    ctx.moveTo(p1.x * scale, p1.y * scale);
    ctx.lineTo(p2.x * scale, p2.y * scale);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const smoothed = points.length > 4 ? smoothPoints(points) : points;
  const count = smoothed.length;

  // Midpoint quadratic curve rendering
  for (let i = 0; i < count - 1; i++) {
    const curr = smoothed[i];
    const next = smoothed[i + 1];
    const prev = i > 0 ? smoothed[i - 1] : null;

    const r = computeRadius(next, curr, stroke.tool, stroke.baseWidth, i, count);
    ctx.lineWidth = Math.max(0.8, r * 2 * scale);

    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(curr.x * scale, curr.y * scale);
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      ctx.lineTo(midX * scale, midY * scale);
    } else {
      const prevMidX = (prev!.x + curr.x) / 2;
      const prevMidY = (prev!.y + curr.y) / 2;
      const nextMidX = (curr.x + next.x) / 2;
      const nextMidY = (curr.y + next.y) / 2;
      ctx.moveTo(prevMidX * scale, prevMidY * scale);
      ctx.quadraticCurveTo(
        curr.x * scale,
        curr.y * scale,
        nextMidX * scale,
        nextMidY * scale
      );
    }
    ctx.stroke();
  }

  // Final segment to end point
  if (count > 2) {
    const secondLast = smoothed[count - 2];
    const last = smoothed[count - 1];
    const midX = (secondLast.x + last.x) / 2;
    const midY = (secondLast.y + last.y) / 2;
    const r = computeRadius(last, secondLast, stroke.tool, stroke.baseWidth, count - 1, count);
    ctx.lineWidth = Math.max(0.8, r * 2 * scale);
    ctx.beginPath();
    ctx.moveTo(midX * scale, midY * scale);
    ctx.lineTo(last.x * scale, last.y * scale);
    ctx.stroke();
  }

  ctx.restore();
}
