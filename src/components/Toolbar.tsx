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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Shapes,
  StickyNote as StickyIcon,
  Crosshair,
  Mic,
  Square,
  Play,
  Pause,
  Palette,
  Image,
  LayoutGrid,
  ChevronLeft as BackIcon,
  Feather,
  CheckCircle2,
  Bookmark,
  Sparkles,
  Type,
  Eye,
  Pen,
  Spline,
} from 'lucide-react';
import type { ToolType, PageTemplate, PaperTheme, ViewportState, CanvasMode, AudioRecordingState } from '../types';

interface ToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onBackToLibrary: () => void;
  onOpenPageManager: () => void;
  onOpenElementsModal: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isReadOnly: boolean;
  onToggleReadOnly: () => void;
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
  saveStatus: 'saved' | 'saving';
}

const PEN_COLORS = [
  '#0f172a', // Jet Black
  '#1d4ed8', // Royal Blue
  '#b91c1c', // Ruby Red
  '#15803d', // Emerald Green
  '#7e22ce', // Violet Purple
  '#c2410c', // Burnt Orange
  '#f8fafc', // Crisp White
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
  onBackToLibrary,
  onOpenPageManager,
  onOpenElementsModal,
  isBookmarked,
  onToggleBookmark,
  isReadOnly,
  onToggleReadOnly,
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
  saveStatus,
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
          {/* Back to Library Button */}
          <button
            onClick={onBackToLibrary}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
            title="Volver a la Biblioteca de Cuadernos"
          >
            <BackIcon className="w-4 h-4" />
            <span>Biblioteca</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Title and Auto-save indicator */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="font-medium text-sm text-slate-100 bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-800 border border-transparent focus:border-indigo-500/50 rounded px-2.5 py-0.5 outline-none transition max-w-[190px]"
            />
            <div className="flex items-center space-x-1 text-[11px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{saveStatus === 'saved' ? 'Guardado' : 'Guardando...'}</span>
            </div>
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
              <option value="white">Blanco</option>
              <option value="dark">OLED Dark</option>
              <option value="blueprint">Blueprint</option>
              <option value="parchment">Pergamino</option>
              <option value="chalkboard">Pizarra</option>
            </select>
          </div>

          {/* Template Selector */}
          <select
            value={currentTemplate}
            onChange={(e) => onSelectTemplate(e.target.value as PageTemplate)}
            className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none hover:bg-slate-700/80 cursor-pointer"
          >
            <option value="ruled">Rayado</option>
            <option value="grid">Cuadrícula</option>
            <option value="dotted">Puntos</option>
            <option value="cornell">Cornell</option>
            <option value="hexagonal">Hexagonal</option>
            <option value="music_stave">Pentagrama</option>
            <option value="blank">En Blanco</option>
          </select>
        </div>

        {/* Center: Audio Sync Recorder & Page Controls with Bookmark */}
        <div className="flex items-center space-x-3">
          {/* Audio Recorder */}
          <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700/60 text-xs">
            {!audioState.isRecording ? (
              <button
                onClick={onStartAudioRecording}
                className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 transition"
                title="Grabar audio sincronizado"
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
                  <button onClick={onPlayAudio} className="p-1 text-emerald-400 hover:text-emerald-300">
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button onClick={onPauseAudio} className="p-1 text-amber-400 hover:text-amber-300">
                    <Pause className="w-3 h-3 fill-current" />
                  </button>
                )}
                <span className="text-[11px] font-mono text-slate-400">
                  {formatDuration(audioState.currentTime || audioState.duration)}
                </span>
              </div>
            )}
          </div>

          {/* Page Navigator with Bookmark Ribbon & Thumbnail Grid */}
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-full text-xs font-medium text-slate-300 border border-slate-700/60">
            <button
              onClick={onOpenPageManager}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Ver todas las páginas (Miniaturas)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            {/* Bookmark ribbon button */}
            <button
              onClick={onToggleBookmark}
              className={`p-1 rounded transition ${
                isBookmarked
                  ? 'text-rose-500 hover:text-rose-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={isBookmarked ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <div className="h-3 w-px bg-slate-700" />

            <button
              onClick={onPrevPage}
              disabled={currentPageIndex === 0}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
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
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onAddPage}
              className="p-1 ml-1 rounded hover:bg-indigo-900/60 text-indigo-400 hover:text-indigo-200"
              title="Añadir página"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Actions: Read-Only Toggle, Undo/Redo, Zoom, Export */}
        <div className="flex items-center space-x-2">
          {/* Read-Only Mode vs Edit Mode Toggle (Classic Goodnotes feature) */}
          <button
            onClick={onToggleReadOnly}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              isReadOnly
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30'
            }`}
            title={isReadOnly ? 'Cambiar a Modo Edición' : 'Cambiar a Modo Lectura (Bloquea trazos y activa hipervínculos/cinta)'}
          >
            {isReadOnly ? <Eye className="w-3.5 h-3.5" /> : <Pen className="w-3.5 h-3.5" />}
            <span>{isReadOnly ? 'Modo Lectura' : 'Modo Edición'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={onUndo}
            disabled={!canUndo || isReadOnly}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            title="Deshacer (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || isReadOnly}
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

      {/* Main Inking & Study Ribbon (Disabled in Read-Only Mode) */}
      {!isReadOnly && (
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
              title="Pluma estilográfica con flujo dinámico"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Estilográfica</span>
            </button>

            {/* Calligraphy Pen */}
            <button
              onClick={() => onSelectTool('calligraphy')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'calligraphy'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Pluma caligráfica (plumilla biselada a 40°)"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Caligráfica</span>
            </button>

            {/* Graphite Pencil */}
            <button
              onClick={() => onSelectTool('pencil')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'pencil'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Lápiz grafito (sombreado e inclinación)"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Lápiz</span>
            </button>

            {/* Ballpoint Pen */}
            <button
              onClick={() => onSelectTool('pen')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'pen'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Bolígrafo de trazo uniforme"
            >
              <span className="font-bold text-xs">●</span>
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

            {/* Tape Tool (Goodnotes 6 Study Tape) */}
            <button
              onClick={() => onSelectTool('tape')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'tape'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Cinta de estudio: Tapa respuestas y pulsa para revelarlas"
            >
              <Spline className="w-3.5 h-3.5" />
              <span>Cinta (Tape)</span>
            </button>

            {/* Text Tool */}
            <button
              onClick={() => onSelectTool('text')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'text'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Caja de texto para escribir a máquina"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Texto</span>
            </button>

            {/* Elements / Stickers Button */}
            <button
              onClick={onOpenElementsModal}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-700/60 hover:bg-indigo-900 transition"
              title="Abrir colección de Elementos, Stickers y Sellos"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Elementos</span>
            </button>

            {/* Smart Shape Snapper */}
            <button
              onClick={() => onSelectTool('shape')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'shape'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Reconocimiento geométrico inteligente"
            >
              <Shapes className="w-3.5 h-3.5" />
              <span>Formas</span>
            </button>

            {/* Laser Pointer */}
            <button
              onClick={() => onSelectTool('laser')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'laser'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Puntero láser con estela"
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
              title="Nota adhesiva"
            >
              <StickyIcon className="w-3.5 h-3.5" />
              <span>Nota</span>
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

            {/* Lasso */}
            <button
              onClick={() => onSelectTool('lasso')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTool === 'lasso'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Lazo de selección"
            >
              <span className="font-mono text-sm leading-none font-bold">☌</span>
              <span>Lazo</span>
            </button>

            {/* Pan */}
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
          {currentTool !== 'pan' && currentTool !== 'eraser' && currentTool !== 'laser' && currentTool !== 'sticky' && currentTool !== 'text' && (
            <div className="flex items-center space-x-4">
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
      )}
    </header>
  );
};
