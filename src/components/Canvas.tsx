import React, { useRef, useEffect, useCallback } from 'react';
import type { Page, ToolType, Stroke, Point, ViewportState } from '../types';
import { drawPageTemplate } from '../engine/templates';
import { renderStroke, calculateStrokeBounds } from '../engine/inking';
import { strokeIntersectsEraser } from '../engine/spatial';

interface CanvasProps {
  page: Page;
  currentTool: ToolType;
  currentColor: string;
  currentWidth: number;
  viewport: ViewportState;
  onPageUpdate: (updatedPage: Page) => void;
  onViewportChange: (viewport: ViewportState) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  page,
  currentTool,
  currentColor,
  currentWidth,
  viewport,
  onPageUpdate,
  onViewportChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<Point[]>([]);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Render Background Template
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = page.width * dpr;
    canvas.height = page.height * dpr;
    ctx.scale(dpr, dpr);

    drawPageTemplate(ctx, page.width, page.height, page.template);
  }, [page.width, page.height, page.template, dpr]);

  // Render Static Strokes
  const redrawStaticStrokes = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = page.width * dpr;
    canvas.height = page.height * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // First render highlighters (multiply blend mode behind ink)
    const highlighters = page.strokes.filter((s) => s.tool === 'highlighter');
    const normalStrokes = page.strokes.filter((s) => s.tool !== 'highlighter');

    for (const stroke of highlighters) {
      renderStroke(ctx, stroke, 1.0);
    }
    for (const stroke of normalStrokes) {
      renderStroke(ctx, stroke, 1.0);
    }
  }, [page.strokes, page.width, page.height, dpr]);

  useEffect(() => {
    redrawStaticStrokes();
  }, [redrawStaticStrokes]);

  // Transform screen coordinate to canvas coordinate
  const screenToCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left) / viewport.zoom;
    const y = (clientY - rect.top) / viewport.zoom;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Left click or pen tip only
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    if (currentTool === 'pan' || e.buttons === 4 || e.altKey) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: viewport.offsetX,
        oy: viewport.offsetY,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    isDrawingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    if (currentTool === 'eraser') {
      handleEraser(x, y);
      drawEraserIndicator(x, y);
      return;
    }

    activePointsRef.current = [{
      x,
      y,
      pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      time: Date.now(),
    }];

    // Clear active canvas
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      onViewportChange({
        ...viewport,
        offsetX: panStartRef.current.ox + dx,
        offsetY: panStartRef.current.oy + dy,
      });
      return;
    }

    if (!isDrawingRef.current) {
      if (currentTool === 'eraser') {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        drawEraserIndicator(x, y);
      }
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    if (currentTool === 'eraser') {
      handleEraser(x, y);
      drawEraserIndicator(x, y);
      return;
    }

    // Extract coalesced points for 240Hz stylus fidelity
    const coalescedEvents = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
      : [e.nativeEvent];

    for (const ev of coalescedEvents) {
      const p = screenToCanvas(ev.clientX, ev.clientY);
      const pressure = ev.pressure > 0 ? ev.pressure : 0.5;
      activePointsRef.current.push({
        x: p.x,
        y: p.y,
        pressure,
        tiltX: ev.tiltX,
        tiltY: ev.tiltY,
        time: Date.now(),
      });
    }

    // Draw active stroke on active layer
    const activeCanvas = activeCanvasRef.current;
    if (!activeCanvas) return;
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return;

    activeCanvas.width = page.width * dpr;
    activeCanvas.height = page.height * dpr;
    ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    ctx.scale(dpr, dpr);

    const tempStroke: Stroke = {
      id: 'active',
      tool: currentTool,
      color: currentColor,
      baseWidth: currentWidth,
      opacity: currentTool === 'highlighter' ? 0.35 : 1.0,
      points: activePointsRef.current,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };

    renderStroke(ctx, tempStroke, 1.0);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (currentTool === 'eraser') {
      clearOverlay();
      return;
    }

    const points = activePointsRef.current;
    if (points.length === 0) return;

    const bounds = calculateStrokeBounds(points, currentWidth);
    const newStroke: Stroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tool: currentTool,
      color: currentColor,
      baseWidth: currentWidth,
      opacity: currentTool === 'highlighter' ? 0.35 : 1.0,
      points: [...points],
      bounds,
    };

    activePointsRef.current = [];

    // Clear active canvas
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    }

    // Commit to page strokes
    onPageUpdate({
      ...page,
      strokes: [...page.strokes, newStroke],
    });
  };

  const handleEraser = (x: number, y: number) => {
    const eraserRadius = currentWidth * 1.5;
    const remaining = page.strokes.filter((s) => !strokeIntersectsEraser(s, x, y, eraserRadius));
    if (remaining.length !== page.strokes.length) {
      onPageUpdate({
        ...page,
        strokes: remaining,
      });
    }
  };

  const drawEraserIndicator = (x: number, y: number) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    overlay.width = page.width * dpr;
    overlay.height = page.height * dpr;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);

    const eraserRadius = currentWidth * 1.5;
    ctx.strokeStyle = '#475569';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, eraserRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
  };

  // Wheel zoom with Ctrl or trackpad pinch
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(3.0, Math.max(0.3, viewport.zoom * zoomFactor));
      onViewportChange({
        ...viewport,
        zoom: newZoom,
      });
    } else {
      // Normal scroll pans the viewport
      onViewportChange({
        ...viewport,
        offsetX: viewport.offsetX - e.deltaX,
        offsetY: viewport.offsetY - e.deltaY,
      });
    }
  };

  return (
    <div
      className="relative flex-1 w-full h-full overflow-hidden bg-slate-200 select-none flex items-center justify-center cursor-crosshair"
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={containerRef}
        className="relative shadow-2xl rounded-sm transition-transform duration-75 origin-center"
        style={{
          width: `${page.width}px`,
          height: `${page.height}px`,
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
          cursor: currentTool === 'pan' ? 'grab' : currentTool === 'eraser' ? 'none' : 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={clearOverlay}
      >
        {/* Layer 1: Background Template */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 2: Static Committed Strokes */}
        <canvas
          ref={staticCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 3: Active In-Flight Stroke */}
        <canvas
          ref={activeCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 4: UI Overlay (Eraser cursor, selection marquee) */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />
      </div>
    </div>
  );
};
