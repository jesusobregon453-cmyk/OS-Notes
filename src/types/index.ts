export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  time: number;
  audioTimeOffset?: number;
}

export type ToolType =
  | 'fountain'
  | 'pen'
  | 'brush'
  | 'calligraphy'
  | 'pencil'
  | 'highlighter'
  | 'tape'
  | 'text'
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
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'capsule';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type EraserMode = 'standard' | 'stroke' | 'precision';
export type LaserMode = 'dot' | 'trail';
export type ShapeKind =
  | 'auto'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'capsule';

export interface TextOptions {
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
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
  fillColor?: string;
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

export interface TapeItem {
  id: string;
  points: Point[];
  width: number;
  color: string;
  isRevealed: boolean;
  bounds: BoundingBox;
}

export interface TextBoxItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  color: string;
  backgroundColor?: string;
}

export interface Page {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  template: PageTemplate;
  theme: PaperTheme;
  isBookmarked?: boolean;
  outlineTitle?: string;
  strokes: Stroke[];
  stickyNotes?: StickyNote[];
  tapes?: TapeItem[];
  textBoxes?: TextBoxItem[];
}

export interface SavedElement {
  id: string;
  title: string;
  category: string;
  strokes: Stroke[];
}

export interface NotebookCover {
  color: string;
  style: 'leather' | 'minimal' | 'spiral' | 'gradient';
  label?: string;
}

export interface NotebookSummary {
  id: string;
  title: string;
  coverColor: string;
  coverStyle: 'leather' | 'minimal' | 'spiral' | 'gradient';
  pageCount: number;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface NotebookDocument {
  id: string;
  title: string;
  cover?: NotebookCover;
  canvasMode: CanvasMode;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
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
