import type { PageTemplate } from '../types';

/**
 * Draws paper template on background canvas
 */
export function drawPageTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PageTemplate
): void {
  // Paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.fillStyle = '#94a3b8';
  ctx.lineWidth = 1;

  if (template === 'ruled') {
    const startY = 80;
    const lineSpacing = 30;
    const leftMargin = 70;

    // Red vertical margin line
    ctx.strokeStyle = '#fecaca';
    ctx.beginPath();
    ctx.moveTo(leftMargin, 0);
    ctx.lineTo(leftMargin, height);
    ctx.stroke();

    // Ruled horizontal lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    for (let y = startY; y < height - 40; y += lineSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (template === 'grid') {
    const gridSpacing = 24;
    ctx.beginPath();
    for (let x = gridSpacing; x < width; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = gridSpacing; y < height; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (template === 'dotted') {
    const dotSpacing = 24;
    const dotRadius = 1.2;
    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === 'cornell') {
    const headerHeight = 70;
    const cueColumnWidth = 200;
    const summaryHeight = 160;

    // Header divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(width, headerHeight);

    // Cue column divider
    ctx.moveTo(cueColumnWidth, headerHeight);
    ctx.lineTo(cueColumnWidth, height - summaryHeight);

    // Summary divider
    ctx.moveTo(0, height - summaryHeight);
    ctx.lineTo(width, height - summaryHeight);
    ctx.stroke();

    // Lined body in notes area
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    for (let y = headerHeight + 28; y < height - summaryHeight - 10; y += 28) {
      ctx.moveTo(cueColumnWidth, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}
