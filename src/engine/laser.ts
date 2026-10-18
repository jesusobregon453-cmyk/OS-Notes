import type { Point, LaserMode } from '../types';

export interface LaserPoint extends Point {
  alpha: number;
}

export class LaserPointerEngine {
  private points: LaserPoint[] = [];
  private readonly maxLifetime = 1200; // ms
  private readonly color = '#ef4444'; // Bright Red
  public mode: LaserMode = 'trail';

  public addPoint(x: number, y: number): void {
    if (this.mode === 'dot') {
      // In dot mode, keep only the latest point with rapid decay
      this.points = [{
        x,
        y,
        pressure: 1.0,
        time: performance.now(),
        alpha: 1.0,
      }];
      return;
    }

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
    const lifetime = this.mode === 'dot' ? 300 : this.maxLifetime;
    this.points = this.points.filter((p) => {
      const elapsed = now - p.time;
      if (elapsed > lifetime) return false;
      p.alpha = Math.max(0, 1 - elapsed / lifetime);
      return true;
    });
    return this.points.length > 0;
  }

  public render(ctx: CanvasRenderingContext2D, scale: number = 1.0): void {
    if (this.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Render trail only if in trail mode
    if (this.mode === 'trail') {
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
