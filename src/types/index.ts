export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  time: number;
}

export type ToolType = 'pen' | 'fountain' | 'brush' | 'highlighter' | 'eraser' | 'lasso' | 'pan';

export type PageTemplate = 'blank' | 'ruled' | 'grid' | 'dotted' | 'cornell';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  baseWidth: number;
  opacity: number;
  points: Point[];
  bounds: BoundingBox;
}

export interface Page {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  template: PageTemplate;
  templateColor: string;
  strokes: Stroke[];
}

export interface NotebookDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pages: Page[];
}

export interface ViewportState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface PenPreset {
  color: string;
  width: number;
}
