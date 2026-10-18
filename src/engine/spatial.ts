import type { Stroke, BoundingBox, Point } from '../types';

export function boxIntersectsBox(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

export function pointInBox(x: number, y: number, box: BoundingBox): boolean {
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
}

/**
 * Checks if an eraser point/circle intersects a stroke
 */
export function strokeIntersectsEraser(
  stroke: Stroke,
  eraserX: number,
  eraserY: number,
  eraserRadius: number
): boolean {
  const eraserBox: BoundingBox = {
    minX: eraserX - eraserRadius,
    minY: eraserY - eraserRadius,
    maxX: eraserX + eraserRadius,
    maxY: eraserY + eraserRadius,
  };

  // Early exit if bounding boxes do not overlap
  if (!boxIntersectsBox(stroke.bounds, eraserBox)) {
    return false;
  }

  const thresholdSq = Math.pow(eraserRadius + stroke.baseWidth / 2, 2);

  // Check segment distance
  const points = stroke.points;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const distSq = Math.pow(p.x - eraserX, 2) + Math.pow(p.y - eraserY, 2);
    if (distSq <= thresholdSq) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a point is inside a polygon using ray-casting algorithm (for Lasso)
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
