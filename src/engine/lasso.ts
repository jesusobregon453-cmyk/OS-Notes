import type { Point, Stroke, BoundingBox } from '../types';
import { isPointInPolygon } from './spatial';

export interface LassoSelection {
  selectedStrokeIds: string[];
  bounds: BoundingBox | null;
}

/**
 * Finds all strokes contained within or intersected by the lasso polygon
 */
export function selectStrokesWithLasso(strokes: Stroke[], lassoPolygon: Point[]): LassoSelection {
  if (lassoPolygon.length < 3) {
    return { selectedStrokeIds: [], bounds: null };
  }

  const selectedIds: string[] = [];

  for (const stroke of strokes) {
    // Check if any point of stroke is inside the lasso polygon
    let insideCount = 0;
    const sampleRate = Math.max(1, Math.floor(stroke.points.length / 10));

    for (let i = 0; i < stroke.points.length; i += sampleRate) {
      if (isPointInPolygon(stroke.points[i], lassoPolygon)) {
        insideCount++;
      }
    }

    if (insideCount > 0) {
      selectedIds.push(stroke.id);
    }
  }

  if (selectedIds.length === 0) {
    return { selectedStrokeIds: [], bounds: null };
  }

  // Calculate combined bounding box of selected strokes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    if (selectedIds.includes(s.id)) {
      if (s.bounds.minX < minX) minX = s.bounds.minX;
      if (s.bounds.minY < minY) minY = s.bounds.minY;
      if (s.bounds.maxX > maxX) maxX = s.bounds.maxX;
      if (s.bounds.maxY > maxY) maxY = s.bounds.maxY;
    }
  }

  return {
    selectedStrokeIds: selectedIds,
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * Renders dashed lasso loop and selection bounding box
 */
export function renderLassoOverlay(
  ctx: CanvasRenderingContext2D,
  polygon: Point[],
  selection: LassoSelection | null,
  scale: number = 1.0
): void {
  ctx.save();

  // Draw active freehand lasso trail
  if (polygon.length > 1) {
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x * scale, polygon[0].y * scale);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x * scale, polygon[i].y * scale);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.fill();
  }

  // Draw bounding box around selected strokes
  if (selection && selection.bounds) {
    const b = selection.bounds;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1.5 * scale;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.05)';

    const w = (b.maxX - b.minX) * scale;
    const h = (b.maxY - b.minY) * scale;
    ctx.strokeRect(b.minX * scale, b.minY * scale, w, h);
    ctx.fillRect(b.minX * scale, b.minY * scale, w, h);

    // Render corner resize handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2 * scale;

    const corners = [
      { x: b.minX, y: b.minY },
      { x: b.maxX, y: b.minY },
      { x: b.minX, y: b.maxY },
      { x: b.maxX, y: b.maxY },
    ];

    for (const c of corners) {
      ctx.beginPath();
      ctx.arc(c.x * scale, c.y * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}
