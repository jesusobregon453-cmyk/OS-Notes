import type { Point } from '../types';

export interface LaserPoint extends Point {
  alpha: number;
}

export class LaserPointerEngine {
  private points: LaserPoint[] = [];
  private readonly maxLifetime = 1200; // ms
  private readonly color = '#ef4444'; // Bright Red

  public addPoint(x: number, y: number): void {
    this.points.push({
      x,
      y,
      pressure: 1.0,
      time: performance.now(),
      alpha: 1.0,
    });
  }

  public update(): boolean {
    const now = performance.now();
    this.points = this.points.filter((p) => {
      const elapsed = now - p.time;
      if (elapsed > this.maxLifetime) return false;
      p.alpha = Math.max(0, 1 - elapsed / this.maxLifetime);
      return true;
    });
    return this.points.length > 0;
  }

  public render(ctx: CanvasRenderingContext2D, scale: number = 1.0): void {
    if (this.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      ctx.beginPath();
      ctx.moveTo(p1.x * scale, p1.y * scale);
      ctx.lineTo(p2.x * scale, p2.y * scale);

      ctx.strokeStyle = this.color;
      ctx.globalAlpha = p2.alpha * 0.7;
      ctx.lineWidth = 6 * p2.alpha * scale;
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    // Glowing tip
    const latest = this.points[this.points.length - 1];
    if (latest) {
      ctx.beginPath();
      ctx.arc(latest.x * scale, latest.y * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.fill();
    }

    ctx.restore();
  }

  public clear(): void {
    this.points = [];
  }
}
