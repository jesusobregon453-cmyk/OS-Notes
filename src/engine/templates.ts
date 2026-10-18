import type { PageTemplate, PaperTheme } from '../types';

export interface ThemeColors {
  background: string;
  lines: string;
  margin: string;
  dots: string;
}

export const THEME_PALETTES: Record<PaperTheme, ThemeColors> = {
  white: {
    background: '#ffffff',
    lines: '#e2e8f0',
    margin: '#fca5a5',
    dots: '#94a3b8',
  },
  dark: {
    background: '#0f172a',
    lines: '#1e293b',
    margin: '#dc2626',
    dots: '#334155',
  },
  blueprint: {
    background: '#0284c7',
    lines: 'rgba(255, 255, 255, 0.22)',
    margin: 'rgba(255, 255, 255, 0.5)',
    dots: 'rgba(255, 255, 255, 0.35)',
  },
  parchment: {
    background: '#fef3c7',
    lines: '#e5d5b5',
    margin: '#d97706',
    dots: '#b45309',
  },
  chalkboard: {
    background: '#14532d',
    lines: 'rgba(255, 255, 255, 0.15)',
    margin: 'rgba(255, 255, 255, 0.35)',
    dots: 'rgba(255, 255, 255, 0.25)',
  },
};

/**
 * Renders paper template with chosen theme
 */
export function drawPageTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PageTemplate,
  theme: PaperTheme = 'white'
): void {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.white;

  // 1. Draw paper background
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.lineWidth = 1;

  if (template === 'ruled') {
    const startY = 80;
    const lineSpacing = 30;
    const leftMargin = 70;

    // Vertical margin line
    ctx.strokeStyle = palette.margin;
    ctx.beginPath();
    ctx.moveTo(leftMargin, 0);
    ctx.lineTo(leftMargin, height);
    ctx.stroke();

    // Horizontal ruled lines
    ctx.strokeStyle = palette.lines;
    ctx.beginPath();
    for (let y = startY; y < height - 40; y += lineSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (template === 'grid') {
    const gridSpacing = 24;
    ctx.strokeStyle = palette.lines;
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
    ctx.fillStyle = palette.dots;
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

    ctx.strokeStyle = palette.margin;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(width, headerHeight);

    ctx.moveTo(cueColumnWidth, headerHeight);
    ctx.lineTo(cueColumnWidth, height - summaryHeight);

    ctx.moveTo(0, height - summaryHeight);
    ctx.lineTo(width, height - summaryHeight);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.lines;
    ctx.beginPath();
    for (let y = headerHeight + 28; y < height - summaryHeight - 10; y += 28) {
      ctx.moveTo(cueColumnWidth, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (template === 'hexagonal') {
    // Hexagonal grid for organic chemistry and geometry
    const r = 18;
    const h = r * Math.sin(Math.PI / 3);
    ctx.strokeStyle = palette.lines;
    ctx.beginPath();

    for (let y = r; y < height + r; y += h * 2) {
      for (let x = r; x < width + r; x += r * 3) {
        drawHexagon(ctx, x, y, r);
        drawHexagon(ctx, x + 1.5 * r, y + h, r);
      }
    }
    ctx.stroke();
  } else if (template === 'music_stave') {
    // 5-line music staves
    const staveSpacing = 80;
    const lineGap = 9;
    ctx.strokeStyle = palette.lines;
    ctx.lineWidth = 1;

    for (let startY = 100; startY < height - 100; startY += staveSpacing) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const y = startY + i * lineGap;
        ctx.moveTo(50, y);
        ctx.lineTo(width - 50, y);
      }
      ctx.stroke();

      // Bar lines at ends
      ctx.beginPath();
      ctx.moveTo(50, startY);
      ctx.lineTo(50, startY + 4 * lineGap);
      ctx.moveTo(width - 50, startY);
      ctx.lineTo(width - 50, startY + 4 * lineGap);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const hx = x + r * Math.cos(angle);
    const hy = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
}
