import React, { useRef, useEffect, useCallback, useState } from 'react';
import type {
  Page,
  ToolType,
  Stroke,
  Point,
  ViewportState,
  BoundingBox,
  TapeItem,
  TextBoxItem,
  EraserMode,
  LaserMode,
  ShapeKind,
  TextOptions,
} from '../types';
import { drawPageTemplate } from '../engine/templates';
import { renderStroke, calculateStrokeBounds, colorToRgba } from '../engine/inking';
import { strokeIntersectsEraser, pointInBox } from '../engine/spatial';
import { detectGeometricShape, generateExplicitShape } from '../engine/shapes';
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
  eraserMode?: EraserMode;
  eraseHighlighterOnly?: boolean;
  shapeFill?: boolean;
  selectedShape?: ShapeKind;
  laserMode?: LaserMode;
  textOptions?: TextOptions;
  onPageUpdate: (updatedPage: Page) => void;
  onViewportChange: (viewport: ViewportState) => void;
  onAddStickyNoteAt?: (x: number, y: number, color?: string) => void;
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
  eraserMode = 'standard',
  eraseHighlighterOnly = false,
  shapeFill = false,
  selectedShape = 'rect',
  laserMode = 'trail',
  textOptions,
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

  // Live Eraser Ref State (for 60fps canvas redraw and single-step undo)
  const erasedStrokesRef = useRef<Stroke[] | null>(null);
  const erasedTapesRef = useRef<TapeItem[] | null>(null);

  // Live Lasso Drag Ref State (for interactive moving of selected strokes)
  const isDraggingLassoRef = useRef(false);
  const lassoDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lassoDragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Laser Pointer Engine
  const laserEngineRef = useRef<LaserPointerEngine>(new LaserPointerEngine());
  const laserAnimRef = useRef<number | null>(null);

  useEffect(() => {
    laserEngineRef.current.mode = laserMode;
  }, [laserMode]);

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

  // Render Static Strokes and Tapes (with optional override for live drag/erase previews)
  const redrawStaticStrokes = useCallback(
    (customStrokes?: Stroke[], customTapes?: TapeItem[]) => {
      const canvas = staticCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = page.width * dpr;
      canvas.height = page.height * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const strokesToRender = customStrokes || page.strokes;
      const tapesToRender = customTapes || page.tapes;

      // 1. Render Highlighters
      const highlighters = strokesToRender.filter((s) => s.tool === 'highlighter');
      const normalStrokes = strokesToRender.filter((s) => s.tool !== 'highlighter');

      for (const stroke of highlighters) {
        renderStroke(ctx, stroke, 1.0);
      }

      // 2. Render Normal Handwriting & Drawing Strokes
      for (const stroke of normalStrokes) {
        renderStroke(ctx, stroke, 1.0);
      }

      // 3. Render Study Tapes (above handwriting to conceal answers)
      if (tapesToRender) {
        for (const tape of tapesToRender) {
          renderTape(ctx, tape, 1.0);
        }
      }
    },
    [page.strokes, page.tapes, page.width, page.height, dpr]
  );

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
      onAddStickyNoteAt?.(x, y, currentColor);
      return;
    }

    // Text Box tool: spawn a new text box at click position with current typography
    if (currentTool === 'text') {
      const newBox: TextBoxItem = {
        id: `textbox-${Date.now()}`,
        x: Math.max(10, x - 100),
        y: Math.max(10, y - 20),
        width: 240,
        height: 60,
        text: '',
        fontSize: textOptions?.fontSize || 24,
        fontFamily: textOptions?.fontFamily || 'Moderna',
        isBold: textOptions?.isBold ?? false,
        isItalic: textOptions?.isItalic ?? false,
        color: currentColor === '#f8fafc' ? '#0f172a' : currentColor,
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
      erasedStrokesRef.current = [...page.strokes];
      erasedTapesRef.current = page.tapes ? [...page.tapes] : [];
      handleEraser(x, y);
      drawEraserIndicator(x, y);
      return;
    }

    if (currentTool === 'lasso') {
      if (selectionBounds && pointInBox(x, y, selectionBounds) && selectedStrokeIds.length > 0) {
        isDraggingLassoRef.current = true;
        lassoDragStartRef.current = { x, y };
        lassoDragOffsetRef.current = { dx: 0, dy: 0 };
        return;
      }
      setSelectedStrokeIds([]);
      setSelectionBounds(null);
      clearOverlay();
      lassoPolygonRef.current = [{ x, y, pressure, time: Date.now() }];
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
      if (isDraggingLassoRef.current && lassoDragStartRef.current && selectionBounds) {
        const dx = x - lassoDragStartRef.current.x;
        const dy = y - lassoDragStartRef.current.y;
        lassoDragOffsetRef.current = { dx, dy };

        // Temporarily hide selected strokes on static canvas
        const unselected = page.strokes.filter((s) => !selectedStrokeIds.includes(s.id));
        redrawStaticStrokes(unselected, page.tapes);

        // Render selected strokes offset on active canvas
        const activeCanvas = activeCanvasRef.current;
        if (activeCanvas) {
          const ctx = activeCanvas.getContext('2d');
          if (ctx) {
            activeCanvas.width = page.width * dpr;
            activeCanvas.height = page.height * dpr;
            ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
            ctx.scale(dpr, dpr);
            for (const s of page.strokes) {
              if (selectedStrokeIds.includes(s.id)) {
                const movedStroke: Stroke = {
                  ...s,
                  points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
                };
                renderStroke(ctx, movedStroke, 1.0);
              }
            }
          }
        }

        // Draw moved lasso bounds
        const offsetBounds: BoundingBox = {
          minX: selectionBounds.minX + dx,
          minY: selectionBounds.minY + dy,
          maxX: selectionBounds.maxX + dx,
          maxY: selectionBounds.maxY + dy,
        };
        drawLasso({ selectedStrokeIds, bounds: offsetBounds });
        return;
      }

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
    } else if (currentTool === 'shape' && selectedShape !== 'auto' && activePointsRef.current.length > 0) {
      // Live rendering of selected geometric shape during drag
      const pStart = activePointsRef.current[0];
      const pCurr = activePointsRef.current[activePointsRef.current.length - 1];
      const shapePoints = generateExplicitShape(selectedShape, pStart, pCurr);
      const tempStroke: Stroke = {
        id: 'active-shape',
        tool: 'shape',
        color: currentColor,
        baseWidth: currentWidth,
        opacity: 1.0,
        points: shapePoints,
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        shapeType: selectedShape as any,
        fillColor: shapeFill ? colorToRgba(currentColor, 0.22) : undefined,
      };
      renderStroke(ctx, tempStroke, 1.0);
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

    if (isDraggingLassoRef.current) {
      isDraggingLassoRef.current = false;
      const { dx, dy } = lassoDragOffsetRef.current;
      if ((dx !== 0 || dy !== 0) && selectionBounds) {
        const updatedStrokes = page.strokes.map((s) => {
          if (selectedStrokeIds.includes(s.id)) {
            const newPoints = s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
            return {
              ...s,
              points: newPoints,
              bounds: calculateStrokeBounds(newPoints, s.baseWidth),
            };
          }
          return s;
        });

        const newBounds: BoundingBox = {
          minX: selectionBounds.minX + dx,
          minY: selectionBounds.minY + dy,
          maxX: selectionBounds.maxX + dx,
          maxY: selectionBounds.maxY + dy,
        };
        setSelectionBounds(newBounds);
        onPageUpdate({ ...page, strokes: updatedStrokes });
        drawLasso({ selectedStrokeIds, bounds: newBounds });
      } else {
        redrawStaticStrokes();
      }

      const activeCanvas = activeCanvasRef.current;
      if (activeCanvas) {
        const ctx = activeCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      }
      return;
    }

    if (currentTool === 'eraser') {
      clearOverlay();
      if (erasedStrokesRef.current) {
        const finalStrokes = erasedStrokesRef.current;
        const finalTapes = erasedTapesRef.current || page.tapes || [];
        erasedStrokesRef.current = null;
        erasedTapesRef.current = null;
        onPageUpdate({ ...page, strokes: finalStrokes, tapes: finalTapes });
      }
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

    // Geometric Shape Recognition & Generation
    let finalPoints = points;
    let shapeType = undefined;
    if (currentTool === 'shape') {
      if (selectedShape !== 'auto' && points.length > 1) {
        const pStart = points[0];
        const pEnd = points[points.length - 1];
        finalPoints = generateExplicitShape(selectedShape, pStart, pEnd);
        shapeType = selectedShape as any;
      } else {
        const detected = detectGeometricShape(points);
        if (detected.type !== 'none') {
          finalPoints = detected.perfectPoints;
          shapeType = detected.type;
        }
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
      fillColor: shapeFill && shapeType && shapeType !== 'line' && shapeType !== 'none'
        ? colorToRgba(currentColor, 0.22)
        : undefined,
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
    const strokes = erasedStrokesRef.current || page.strokes;
    const tapes = erasedTapesRef.current || page.tapes || [];

    const eraserRadius =
      eraserMode === 'precision'
        ? Math.max(4, currentWidth * 0.6)
        : eraserMode === 'stroke'
        ? Math.max(12, currentWidth * 1.5)
        : Math.max(8, currentWidth * 1.2);

    let changed = false;
    const nextStrokes: Stroke[] = [];

    for (const s of strokes) {
      // Solo resaltar: Si está activo, solo borramos resaltador; preservamos todo lo demás
      if (eraseHighlighterOnly && s.tool !== 'highlighter') {
        nextStrokes.push(s);
        continue;
      }

      if (!strokeIntersectsEraser(s, x, y, eraserRadius)) {
        nextStrokes.push(s);
        continue;
      }

      changed = true;

      // In 'stroke' mode or if it's a closed geometric shape, remove the whole stroke
      if (eraserMode === 'stroke' || s.shapeType) {
        continue;
      }

      // In 'precision' or 'standard' mode: split the stroke by removing points in radius!
      const radiusSq = Math.pow(eraserRadius + s.baseWidth * 0.4, 2);
      const segments: Point[][] = [];
      let currentSegment: Point[] = [];

      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i];
        const distSq = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (distSq > radiusSq) {
          currentSegment.push(p);
        } else {
          if (currentSegment.length > 1) {
            segments.push(currentSegment);
          }
          currentSegment = [];
        }
      }
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }

      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segPoints = segments[segIdx];
        nextStrokes.push({
          ...s,
          id: `${s.id}-part-${segIdx}-${Date.now()}`,
          points: segPoints,
          bounds: calculateStrokeBounds(segPoints, s.baseWidth),
        });
      }
    }

    const remainingTapes = eraseHighlighterOnly
      ? tapes
      : tapes.filter((t) => !isPointInTape(x, y, t));

    if (remainingTapes.length !== tapes.length) {
      changed = true;
    }

    if (changed) {
      erasedStrokesRef.current = nextStrokes;
      erasedTapesRef.current = remainingTapes;
      redrawStaticStrokes(nextStrokes, remainingTapes);
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

    const eraserRadius =
      eraserMode === 'precision'
        ? Math.max(5, currentWidth * 0.7)
        : eraserMode === 'stroke'
        ? Math.max(12, currentWidth * 1.5)
        : Math.max(8, currentWidth * 1.2);

    ctx.strokeStyle = eraseHighlighterOnly ? '#f59e0b' : '#475569';
    ctx.fillStyle = eraseHighlighterOnly ? 'rgba(254, 240, 138, 0.4)' : 'rgba(226, 232, 240, 0.4)';
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
