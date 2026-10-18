import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Page, ToolType, Stroke, Point, ViewportState, BoundingBox, TapeItem, TextBoxItem } from '../types';
import { drawPageTemplate } from '../engine/templates';
import { renderStroke, calculateStrokeBounds } from '../engine/inking';
import { strokeIntersectsEraser } from '../engine/spatial';
import { detectGeometricShape } from '../engine/shapes';
import { LaserPointerEngine } from '../engine/laser';
import { selectStrokesWithLasso, renderLassoOverlay } from '../engine/lasso';
import { renderTape, isPointInTape, calculateTapeBounds } from '../engine/tape';
import { StickyNotesLayer } from './StickyNotesLayer';
import { TextBoxLayer } from './TextBoxLayer';
import { LassoActionBar } from './LassoActionBar';

interface CanvasProps {
  page: Page;
  currentTool: ToolType;
  currentColor: string;
  currentWidth: number;
  viewport: ViewportState;
  isAudioRecording: boolean;
  audioElapsed: number;
  isReadOnly?: boolean;
  onPageUpdate: (updatedPage: Page) => void;
  onViewportChange: (viewport: ViewportState) => void;
  onAddStickyNoteAt?: (x: number, y: number) => void;
  onSaveSelectionAsElement?: (strokes: Stroke[]) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  page,
  currentTool,
  currentColor,
  currentWidth,
  viewport,
  isAudioRecording,
  audioElapsed,
  isReadOnly = false,
  onPageUpdate,
  onViewportChange,
  onAddStickyNoteAt,
  onSaveSelectionAsElement,
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

  // Laser Pointer Engine
  const laserEngineRef = useRef<LaserPointerEngine>(new LaserPointerEngine());
  const laserAnimRef = useRef<number | null>(null);

  // Lasso Selection State
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectionBounds, setSelectionBounds] = useState<BoundingBox | null>(null);
  const lassoPolygonRef = useRef<Point[]>([]);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Render Background Template with Theme
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = page.width * dpr;
    canvas.height = page.height * dpr;
    ctx.scale(dpr, dpr);

    drawPageTemplate(ctx, page.width, page.height, page.template, page.theme || 'white');
  }, [page.width, page.height, page.template, page.theme, dpr]);

  // Render Static Strokes and Tapes
  const redrawStaticStrokes = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = page.width * dpr;
    canvas.height = page.height * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // 1. Render Highlighters
    const highlighters = page.strokes.filter((s) => s.tool === 'highlighter');
    const normalStrokes = page.strokes.filter((s) => s.tool !== 'highlighter');

    for (const stroke of highlighters) {
      renderStroke(ctx, stroke, 1.0);
    }

    // 2. Render Normal Handwriting & Drawing Strokes
    for (const stroke of normalStrokes) {
      renderStroke(ctx, stroke, 1.0);
    }

    // 3. Render Study Tapes (above handwriting to conceal answers)
    if (page.tapes) {
      for (const tape of page.tapes) {
        renderTape(ctx, tape, 1.0);
      }
    }
  }, [page.strokes, page.tapes, page.width, page.height, dpr]);

  useEffect(() => {
    redrawStaticStrokes();
  }, [redrawStaticStrokes]);

  // Laser Animation Loop
  const startLaserLoop = useCallback(() => {
    if (laserAnimRef.current) return;

    const loop = () => {
      const overlay = overlayCanvasRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        if (ctx) {
          overlay.width = page.width * dpr;
          overlay.height = page.height * dpr;
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          ctx.scale(dpr, dpr);
          laserEngineRef.current.render(ctx, 1.0);
        }
      }

      const hasPoints = laserEngineRef.current.update();
      if (hasPoints) {
        laserAnimRef.current = requestAnimationFrame(loop);
      } else {
        laserAnimRef.current = null;
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
        }
      }
    };

    laserAnimRef.current = requestAnimationFrame(loop);
  }, [page.width, page.height, dpr]);

  const screenToCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left) / viewport.zoom;
    const y = (clientY - rect.top) / viewport.zoom;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Read-Only Mode interactions: Tap on Tape to reveal/conceal
    if (isReadOnly) {
      if (page.tapes && page.tapes.length > 0) {
        const hitTape = page.tapes.find((t) => isPointInTape(x, y, t));
        if (hitTape) {
          const updatedTapes = page.tapes.map((t) =>
            t.id === hitTape.id ? { ...t, isRevealed: !t.isRevealed } : t
          );
          onPageUpdate({ ...page, tapes: updatedTapes });
          return;
        }
      }
      // Otherwise in Read-Only mode, default to panning
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

    // Tap on Tape tool mode to toggle reveal
    if (currentTool === 'tape' && page.tapes) {
      const hitTape = page.tapes.find((t) => isPointInTape(x, y, t));
      if (hitTape) {
        const updatedTapes = page.tapes.map((t) =>
          t.id === hitTape.id ? { ...t, isRevealed: !t.isRevealed } : t
        );
        onPageUpdate({ ...page, tapes: updatedTapes });
        return;
      }
    }

    // Sticky Note tool
    if (currentTool === 'sticky') {
      onAddStickyNoteAt?.(x, y);
      return;
    }

    // Text Box tool: spawn a new text box at click position
    if (currentTool === 'text') {
      const newBox: TextBoxItem = {
        id: `textbox-${Date.now()}`,
        x: Math.max(10, x - 100),
        y: Math.max(10, y - 20),
        width: 240,
        height: 60,
        text: '',
        fontSize: 16,
        color: currentColor === '#f8fafc' ? '#f8fafc' : '#0f172a',
      };
      const boxes = [...(page.textBoxes || []), newBox];
      onPageUpdate({ ...page, textBoxes: boxes });
      return;
    }

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

    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    if (currentTool === 'laser') {
      laserEngineRef.current.addPoint(x, y);
      startLaserLoop();
      return;
    }

    if (currentTool === 'eraser') {
      handleEraser(x, y);
      drawEraserIndicator(x, y);
      return;
    }

    if (currentTool === 'lasso') {
      lassoPolygonRef.current = [{ x, y, pressure, time: Date.now() }];
      setSelectedStrokeIds([]);
      setSelectionBounds(null);
      drawLasso();
      return;
    }

    // Drawing stroke (Pen, Pencil, Calligraphy, Highlighter, Tape)
    activePointsRef.current = [{
      x,
      y,
      pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      time: Date.now(),
      audioTimeOffset: isAudioRecording ? audioElapsed : undefined,
    }];

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

    if (currentTool === 'laser') {
      laserEngineRef.current.addPoint(x, y);
      startLaserLoop();
      return;
    }

    if (currentTool === 'eraser') {
      handleEraser(x, y);
      drawEraserIndicator(x, y);
      return;
    }

    if (currentTool === 'lasso') {
      lassoPolygonRef.current.push({ x, y, pressure: 0.5, time: Date.now() });
      drawLasso();
      return;
    }

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
        audioTimeOffset: isAudioRecording ? audioElapsed : undefined,
      });
    }

    // Active layer rendering
    const activeCanvas = activeCanvasRef.current;
    if (!activeCanvas) return;
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return;

    activeCanvas.width = page.width * dpr;
    activeCanvas.height = page.height * dpr;
    ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    ctx.scale(dpr, dpr);

    if (currentTool === 'tape') {
      const tempTape: TapeItem = {
        id: 'active-tape',
        points: activePointsRef.current,
        width: Math.max(22, currentWidth * 5),
        color: currentColor === '#0f172a' ? '#fde047' : currentColor,
        isRevealed: false,
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      };
      renderTape(ctx, tempTape, 1.0);
    } else {
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
    }
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

    if (currentTool === 'laser') return;

    if (currentTool === 'eraser') {
      clearOverlay();
      return;
    }

    if (currentTool === 'lasso') {
      const selection = selectStrokesWithLasso(page.strokes, lassoPolygonRef.current);
      setSelectedStrokeIds(selection.selectedStrokeIds);
      setSelectionBounds(selection.bounds);
      lassoPolygonRef.current = [];
      drawLasso(selection);
      return;
    }

    const points = activePointsRef.current;
    if (points.length === 0) return;

    // Handle Tape tool completion
    if (currentTool === 'tape') {
      const tapeWidth = Math.max(22, currentWidth * 5);
      const newTape: TapeItem = {
        id: `tape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        points: [...points],
        width: tapeWidth,
        color: currentColor === '#0f172a' ? '#fde047' : currentColor,
        isRevealed: false,
        bounds: calculateTapeBounds(points, tapeWidth),
      };

      activePointsRef.current = [];
      const activeCanvas = activeCanvasRef.current;
      if (activeCanvas) {
        const ctx = activeCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      }

      onPageUpdate({
        ...page,
        tapes: [...(page.tapes || []), newTape],
      });
      return;
    }

    // Geometric Shape Recognition: only if the Shape tool is selected
    let finalPoints = points;
    let shapeType = undefined;
    if (currentTool === 'shape') {
      const detected = detectGeometricShape(points);
      if (detected.type !== 'none') {
        finalPoints = detected.perfectPoints;
        shapeType = detected.type;
      }
    }

    const bounds = calculateStrokeBounds(finalPoints, currentWidth);
    const newStroke: Stroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tool: currentTool,
      color: currentColor,
      baseWidth: currentWidth,
      opacity: currentTool === 'highlighter' ? 0.35 : 1.0,
      points: [...finalPoints],
      bounds,
      shapeType,
      audioTimestamp: isAudioRecording ? audioElapsed : undefined,
    };

    activePointsRef.current = [];

    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    }

    onPageUpdate({
      ...page,
      strokes: [...page.strokes, newStroke],
    });
  };

  const handleEraser = (x: number, y: number) => {
    const eraserRadius = currentWidth * 1.5;
    const remainingStrokes = page.strokes.filter((s) => !strokeIntersectsEraser(s, x, y, eraserRadius));
    const remainingTapes = (page.tapes || []).filter((t) => !isPointInTape(x, y, t));

    if (
      remainingStrokes.length !== page.strokes.length ||
      remainingTapes.length !== (page.tapes || []).length
    ) {
      onPageUpdate({
        ...page,
        strokes: remainingStrokes,
        tapes: remainingTapes,
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

  const drawLasso = (selection: { selectedStrokeIds: string[]; bounds: BoundingBox | null } | null = null) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    overlay.width = page.width * dpr;
    overlay.height = page.height * dpr;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.scale(dpr, dpr);

    renderLassoOverlay(ctx, lassoPolygonRef.current, selection, 1.0);
  };

  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
  };

  // Lasso batch modifications
  const handleLassoRecolor = (newColor: string) => {
    const updated = page.strokes.map((s) => {
      if (selectedStrokeIds.includes(s.id)) {
        return { ...s, color: newColor };
      }
      return s;
    });
    onPageUpdate({ ...page, strokes: updated });
  };

  const handleLassoDuplicate = () => {
    const clones: Stroke[] = [];
    for (const s of page.strokes) {
      if (selectedStrokeIds.includes(s.id)) {
        const offsetPoints = s.points.map((p) => ({ ...p, x: p.x + 20, y: p.y + 20 }));
        clones.push({
          ...s,
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          points: offsetPoints,
          bounds: calculateStrokeBounds(offsetPoints, s.baseWidth),
        });
      }
    }
    onPageUpdate({ ...page, strokes: [...page.strokes, ...clones] });
    setSelectedStrokeIds([]);
    setSelectionBounds(null);
    clearOverlay();
  };

  const handleLassoDelete = () => {
    const remaining = page.strokes.filter((s) => !selectedStrokeIds.includes(s.id));
    onPageUpdate({ ...page, strokes: remaining });
    setSelectedStrokeIds([]);
    setSelectionBounds(null);
    clearOverlay();
  };

  const handleLassoChangeWidth = (delta: number) => {
    const updated = page.strokes.map((s) => {
      if (selectedStrokeIds.includes(s.id)) {
        const newW = Math.max(1.0, s.baseWidth + delta);
        return {
          ...s,
          baseWidth: newW,
          bounds: calculateStrokeBounds(s.points, newW),
        };
      }
      return s;
    });
    onPageUpdate({ ...page, strokes: updated });
  };

  const handleLassoSaveElement = () => {
    const selected = page.strokes.filter((s) => selectedStrokeIds.includes(s.id));
    if (selected.length > 0) {
      onSaveSelectionAsElement?.(selected);
      setSelectedStrokeIds([]);
      setSelectionBounds(null);
      clearOverlay();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(3.5, Math.max(0.25, viewport.zoom * zoomFactor));
      onViewportChange({
        ...viewport,
        zoom: newZoom,
      });
    } else {
      onViewportChange({
        ...viewport,
        offsetX: viewport.offsetX - e.deltaX,
        offsetY: viewport.offsetY - e.deltaY,
      });
    }
  };

  return (
    <div
      className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 select-none flex items-center justify-center cursor-crosshair"
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
          cursor: isReadOnly
            ? 'default'
            : currentTool === 'pan'
            ? 'grab'
            : currentTool === 'eraser'
            ? 'none'
            : currentTool === 'laser'
            ? 'none'
            : currentTool === 'text'
            ? 'text'
            : 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={clearOverlay}
      >
        {/* Layer 1: Background Paper Template */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 pointer-events-none rounded-sm shadow-xl"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 2: Static Committed Strokes and Tapes */}
        <canvas
          ref={staticCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 3: Active In-Flight Stroke / Tape */}
        <canvas
          ref={activeCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 4: UI Overlay (Lasso, Laser, Eraser cursor) */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />

        {/* Layer 5: Text Boxes */}
        {page.textBoxes && page.textBoxes.length > 0 && (
          <TextBoxLayer
            textBoxes={page.textBoxes}
            scale={1.0}
            isReadOnly={isReadOnly}
            onUpdateTextBox={(updatedBox) => {
              const boxes = (page.textBoxes || []).map((b) =>
                b.id === updatedBox.id ? updatedBox : b
              );
              onPageUpdate({ ...page, textBoxes: boxes });
            }}
            onDeleteTextBox={(id) => {
              const boxes = (page.textBoxes || []).filter((b) => b.id !== id);
              onPageUpdate({ ...page, textBoxes: boxes });
            }}
          />
        )}

        {/* Layer 6: Sticky Notes Overlay */}
        {page.stickyNotes && page.stickyNotes.length > 0 && (
          <StickyNotesLayer
            notes={page.stickyNotes}
            scale={1.0}
            onUpdateNote={(updatedNote) => {
              const notes = (page.stickyNotes || []).map((n) =>
                n.id === updatedNote.id ? updatedNote : n
              );
              onPageUpdate({ ...page, stickyNotes: notes });
            }}
            onDeleteNote={(id) => {
              const notes = (page.stickyNotes || []).filter((n) => n.id !== id);
              onPageUpdate({ ...page, stickyNotes: notes });
            }}
          />
        )}
      </div>

      {/* Floating Lasso Action Bar */}
      {selectionBounds && selectedStrokeIds.length > 0 && (
        <LassoActionBar
          bounds={selectionBounds}
          viewportZoom={viewport.zoom}
          viewportOffset={{ x: viewport.offsetX, y: viewport.offsetY }}
          onRecolor={handleLassoRecolor}
          onDuplicate={handleLassoDuplicate}
          onDelete={handleLassoDelete}
          onChangeWidth={handleLassoChangeWidth}
          onSaveAsElement={handleLassoSaveElement}
          onClose={() => {
            setSelectedStrokeIds([]);
            setSelectionBounds(null);
            clearOverlay();
          }}
        />
      )}
    </div>
  );
};
