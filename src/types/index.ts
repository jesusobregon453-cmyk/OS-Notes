export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  time: number;
  audioTimeOffset?: number; // Time in seconds from audio recording start
}

export type ToolType =
  | 'fountain'
  | 'pen'
  | 'brush'
  | 'highlighter'
  | 'eraser'
  | 'lasso'
  | 'laser'
  | 'ruler'
  | 'shape'
  | 'sticky'
  | 'pan';

export type PageTemplate =
  | 'blank'
  | 'ruled'
  | 'grid'
  | 'dotted'
  | 'cornell'
  | 'hexagonal'
  | 'music_stave';

export type PaperTheme =
  | 'white'
  | 'dark'
  | 'blueprint'
  | 'parchment'
  | 'chalkboard';

export type CanvasMode = 'paged' | 'infinite';

export type DetectedShapeType =
  | 'none'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle';

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
  shapeType?: DetectedShapeType;
  audioTimestamp?: number;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface Page {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  template: PageTemplate;
  theme: PaperTheme;
  strokes: Stroke[];
  stickyNotes?: StickyNote[];
}

export interface NotebookDocument {
  id: string;
  title: string;
  canvasMode: CanvasMode;
  createdAt: number;
  updatedAt: number;
  pages: Page[];
}

export interface ViewportState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  audioBlob?: Blob;
  audioUrl?: string;
  recordingStartTime?: number;
}
