import React from 'react';
import {
  PenTool,
  Pencil,
  Highlighter,
  Eraser,
  Hand,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Shapes,
  StickyNote as StickyIcon,
  Crosshair,
  Mic,
  Square,
  Play,
  Pause,
  Palette,
  Image,
} from 'lucide-react';
import type { ToolType, PageTemplate, PaperTheme, ViewportState, CanvasMode, AudioRecordingState } from '../types';

interface ToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  currentWidth: number;
  onSelectWidth: (width: number) => void;
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  currentTemplate: PageTemplate;
  onSelectTemplate: (template: PageTemplate) => void;
  currentTheme: PaperTheme;
  onSelectTheme: (theme: PaperTheme) => void;
  canvasMode: CanvasMode;
  onToggleCanvasMode: () => void;
  audioState: AudioRecordingState;
  onStartAudioRecording: () => void;
  onStopAudioRecording: () => void;
  onPlayAudio: () => void;
  onPauseAudio: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewport: ViewportState;
  onViewportChange: (viewport: ViewportState) => void;
  onExport: () => void;
  onExportImage: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PEN_COLORS = [
  '#0f172a', // Jet Black
  '#1d4ed8', // Royal Blue
  '#b91c1c', // Ruby Red
  '#15803d', // Emerald Green
  '#7e22ce', // Violet Purple
  '#c2410c', // Burnt Orange
  '#f8fafc', // Crisp White (for dark/chalkboard modes)
];

const HIGHLIGHTER_COLORS = [
  '#fef08a', // Lemon Pastel
  '#bbf7d0', // Mint Green
  '#bae6fd', // Sky Blue
  '#fbcfe8', // Bubblegum Pink
  '#fed7aa', // Peach
  '#e9d5ff', // Lavender
];

const PEN_WIDTHS = [1.5, 2.5, 4.0, 7.0];
const HIGHLIGHTER_WIDTHS = [14, 20, 28, 38];

export const Toolbar: React.FC<ToolbarProps> = ({
  title,
  onTitleChange,
  currentTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  currentWidth,
  onSelectWidth,
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddPage,
  currentTemplate,
  onSelectTemplate,
  currentTheme,
  onSelectTheme,
  audioState,
  onStartAudioRecording,
  onStopAudioRecording,
  onPlayAudio,
  onPauseAudio,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewport,
  onViewportChange,
  onExport,
  onExportImage,
  onImport,
}) => {
  const activeColors = currentTool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const activeWidths = currentTool === 'highlighter' ? HIGHLIGHTER_WIDTHS : PEN_WIDTHS;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <header className="flex flex-col bg-slate-900 border-b border-slate-800 shadow-xl z-30 select-none text-slate-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase text-indigo-400">
              OS Notes
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="font-medium text-sm text-slate-100 bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-800 border border-transparent focus:border-indigo-500/50 rounded px-2.5 py-0.5 outline-none transition max-w-[220px]"
            />
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Paper Theme Picker */}
          <div className="flex items-center space-x-1.5 text-xs">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={currentTheme}
              onChange={(e) => onSelectTheme(e.target.value as PaperTheme)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none hover:bg-slate-700/80 cursor-pointer"
            >
              <option value="white">Blanco Clásico</option>
              <option value="dark">Modo Oscuro OLED</option>
              <option value="blueprint">Blueprint Azul</option>
              <option value="parchment">Pergamino Vintage</option>
              <option value="chalkboard">Pizarra Escolar</option>
            </select>
          </div>

          {/* Template Selector */}
          <select
            value={currentTemplate}
            onChange={(e) => onSelectTemplate(e.target.value as PageTemplate)}
            className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none hover:bg-slate-700/80 cursor-pointer"
          >
            <option value="ruled">Rayado</option>
            <option value="grid">Cuadrícula 5mm</option>
            <option value="dotted">Puntos (Bullet)</option>
            <option value="cornell">Cornell Notes</option>
            <option value="hexagonal">Hexagonal (Química)</option>
            <option value="music_stave">Pentagrama (Música)</option>
            <option value="blank">Lienzo en Blanco</option>
          </select>
        </div>

        {/* Center: Audio Sync Recorder & Page Controls */}
        <div className="flex items-center space-x-3">
          {/* Audio Recording / Playback Bar */}
          <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700/60 text-xs">
            {!audioState.isRecording ? (
              <button
                onClick={onStartAudioRecording}
                className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 transition"
                title="Grabar audio sincronizado con los trazos"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Grabar</span>
              </button>
            ) : (
              <button
                onClick={onStopAudioRecording}
                className="flex items-center space-x-1.5 text-rose-500 font-semibold animate-pulse"
                title="Detener grabación"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>REC {formatDuration(audioState.duration)}</span>
              </button>
            )}

            {audioState.audioUrl && !audioState.isRecording && (
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-700">
                {!audioState.isPlaying ? (
                  <button
                    onClick={onPlayAudio}
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                    title="Reproducir audio sincronizado"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={onPauseAudio}
                    className="p-1 text-amber-400 hover:text-amber-300"
                    title="Pausar audio"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                  </button>
                )}
                <span className="text-[11px] font-mono text-slate-400">
                  {formatDuration(audioState.currentTime || audioState.duration)}
                </span>
              </div>
            )}
          </div>

          {/* Page Navigator */}
          <div className="flex items-center space-x-1 bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 border border-slate-700/60">
            <button
              onClick={onPrevPage}
              disabled={currentPageIndex === 0}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              {currentPageIndex + 1} / {totalPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={currentPageIndex === totalPages - 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onAddPage}
              className="p-1 ml-1 rounded hover:bg-indigo-900/60 text-indigo-400 hover:text-indigo-200"
              title="Añadir página"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Actions: Undo/Redo, Zoom, Export */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            title="Deshacer (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            title="Rehacer (Cmd+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 text-slate-400 text-xs">
            <button
              onClick={() => onViewportChange({ ...viewport, zoom: Math.max(0.25, viewport.zoom - 0.1) })}
              className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-mono text-slate-300">
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              onClick={() => onViewportChange({ ...viewport, zoom: Math.min(3.5, viewport.zoom + 0.1) })}
              className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewportChange({ zoom: 1.0, offsetX: 0, offsetY: 0 })}
              className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200"
              title="Reset 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Export PNG */}
          <button
            onClick={onExportImage}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
            title="Exportar imagen PNG"
          >
            <Image className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          {/* Open .osnotes */}
          <label className="flex items-center space-x-1 cursor-pointer px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Abrir</span>
            <input type="file" accept=".osnotes,.gnote,.zip" onChange={onImport} className="hidden" />
          </label>

          {/* Save .osnotes */}
          <button
            onClick={onExport}
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition shadow-md"
            title="Guardar archivo .osnotes"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Tool Ribbon */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-slate-900/90 border-t border-slate-800/40">
        <div className="flex items-center space-x-1.5">
          {/* Fountain Pen */}
          <button
            onClick={() => onSelectTool('fountain')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'fountain'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Pluma estilográfica (tapering y presión)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Estilográfica</span>
          </button>

          {/* Ballpoint Pen */}
          <button
            onClick={() => onSelectTool('pen')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Bolígrafo (trazo preciso)"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Bolígrafo</span>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => onSelectTool('highlighter')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'highlighter'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Resaltador translúcido"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Resaltador</span>
          </button>

          {/* Smart Shape Snapper */}
          <button
            onClick={() => onSelectTool('shape')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'shape'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Reconocimiento automático de formas geométricas"
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>Formas Inteligentes</span>
          </button>

          {/* Laser Pointer */}
          <button
            onClick={() => onSelectTool('laser')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'laser'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Puntero láser para presentaciones"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Láser</span>
          </button>

          {/* Sticky Notes */}
          <button
            onClick={() => onSelectTool('sticky')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'sticky'
                ? 'bg-yellow-500 text-slate-950 font-semibold shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Pegar nota adhesiva en el lienzo"
          >
            <StickyIcon className="w-3.5 h-3.5" />
            <span>Nota Adhesiva</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => onSelectTool('eraser')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'eraser'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Borrador vectorial"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Borrador</span>
          </button>

          {/* Lasso Tool */}
          <button
            onClick={() => onSelectTool('lasso')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'lasso'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Lazo para seleccionar, recolorear y duplicar trazos"
          >
            <span className="font-mono text-sm leading-none font-bold">☌</span>
            <span>Lazo</span>
          </button>

          {/* Pan Tool */}
          <button
            onClick={() => onSelectTool('pan')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'pan'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Mover lienzo"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Mover</span>
          </button>
        </div>

        {/* Dynamic Color Palette & Stroke Width selector */}
        {currentTool !== 'pan' && currentTool !== 'eraser' && currentTool !== 'laser' && currentTool !== 'sticky' && (
          <div className="flex items-center space-x-4">
            {/* Color Swatches */}
            <div className="flex items-center space-x-1.5">
              {activeColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onSelectColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition transform ${
                    currentColor === color
                      ? 'scale-125 border-indigo-400 shadow-lg'
                      : 'border-slate-700 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Stroke Width Selector */}
            <div className="flex items-center space-x-1">
              {activeWidths.map((w) => (
                <button
                  key={w}
                  onClick={() => onSelectWidth(w)}
                  className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-medium transition ${
                    currentWidth === w
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{
                      width: `${Math.min(14, Math.max(3, w * 0.8))}px`,
                      height: `${Math.min(14, Math.max(3, w * 0.8))}px`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
