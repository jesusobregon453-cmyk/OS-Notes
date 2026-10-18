import type { TapeItem, Point, BoundingBox } from '../types';

export function calculateTapeBounds(points: Point[], width: number): BoundingBox {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const pad = width;

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

export function isPointInTape(x: number, y: number, tape: TapeItem): boolean {
  // Bounding box test first
  if (
    x < tape.bounds.minX ||
    x > tape.bounds.maxX ||
    y < tape.bounds.minY ||
    y > tape.bounds.maxY
  ) {
    return false;
  }

  const radiusSq = Math.pow(tape.width / 2, 2);
  for (const p of tape.points) {
    const distSq = Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2);
    if (distSq <= radiusSq) return true;
  }
  return false;
}

/**
 * Renders masking study tape onto canvas
 */
export function renderTape(
  ctx: CanvasRenderingContext2D,
  tape: TapeItem,
  scale: number = 1.0
): void {
  const points = tape.points;
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.lineWidth = tape.width * scale;

  if (tape.isRevealed) {
    // Revealed: Translucent peek with dashed outline
    ctx.strokeStyle = tape.color;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(points[0].x * scale, points[0].y * scale);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale, points[i].y * scale);
    }
    ctx.stroke();

    // Dotted border
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  } else {
    // Concealed: Solid decorative washi tape
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = tape.color;
    ctx.beginPath();
    ctx.moveTo(points[0].x * scale, points[0].y * scale);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale, points[i].y * scale);
    }
    ctx.stroke();

    // Subtle washi tape decorative border line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  }

  ctx.restore();
}
