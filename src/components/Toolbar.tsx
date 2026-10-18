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
  BookOpen,
} from 'lucide-react';
import type { ToolType, PageTemplate, ViewportState } from '../types';

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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewport: ViewportState;
  onViewportChange: (viewport: ViewportState) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PEN_COLORS = [
  '#0f172a', // Midnight / Black
  '#1e40af', // Navy Blue
  '#991b1b', // Deep Red
  '#166534', // Forest Green
  '#6b21a8', // Royal Purple
  '#d97706', // Warm Amber
];

const HIGHLIGHTER_COLORS = [
  '#fde047', // Yellow
  '#86efac', // Soft Green
  '#93c5fd', // Pastel Blue
  '#f472b6', // Pastel Pink
  '#fdba74', // Soft Peach
  '#c084fc', // Lavender
];

const PEN_WIDTHS = [1.5, 2.5, 4.0, 6.0];
const HIGHLIGHTER_WIDTHS = [14, 20, 28, 36];

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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewport,
  onViewportChange,
  onExport,
  onImport,
}) => {
  const activeColors = currentTool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const activeWidths = currentTool === 'highlighter' ? HIGHLIGHTER_WIDTHS : PEN_WIDTHS;

  return (
    <header className="flex flex-col bg-white border-b border-slate-200 shadow-sm z-30 select-none">
      {/* Top Bar: Title, Page Navigator, Undo/Redo, Export/Import */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg tracking-tight">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="font-semibold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-2 py-0.5 outline-none transition"
            />
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Page template selector */}
          <select
            value={currentTemplate}
            onChange={(e) => onSelectTemplate(e.target.value as PageTemplate)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
          >
            <option value="ruled">Rayado (Ruled)</option>
            <option value="grid">Cuadrícula (Grid)</option>
            <option value="dotted">Puntos (Dotted)</option>
            <option value="blank">En blanco (Blank)</option>
            <option value="cornell">Cornell Notes</option>
          </select>
        </div>

        {/* Center: Page Controls */}
        <div className="flex items-center space-x-1 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-700">
          <button
            onClick={onPrevPage}
            disabled={currentPageIndex === 0}
            className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2">
            Página {currentPageIndex + 1} de {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onAddPage}
            className="p-1 ml-1 rounded hover:bg-indigo-100 text-indigo-600"
            title="Añadir página"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right Actions: Undo/Redo, Zoom, Export */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            title="Deshacer (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            title="Rehacer (Cmd+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 text-slate-600 text-xs">
            <button
              onClick={() => onViewportChange({ ...viewport, zoom: Math.max(0.3, viewport.zoom - 0.1) })}
              className="p-1.5 rounded hover:bg-slate-100"
              title="Alejar zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-mono">
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              onClick={() => onViewportChange({ ...viewport, zoom: Math.min(3.0, viewport.zoom + 0.1) })}
              className="p-1.5 rounded hover:bg-slate-100"
              title="Acercar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewportChange({ zoom: 1.0, offsetX: 0, offsetY: 0 })}
              className="p-1.5 rounded hover:bg-slate-100"
              title="Reiniciar vista al 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Export / Import .gnote container */}
          <label className="flex items-center space-x-1 cursor-pointer px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Abrir .gnote</span>
            <input type="file" accept=".gnote,.zip" onChange={onImport} className="hidden" />
          </label>

          <button
            onClick={onExport}
            className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Guardar .gnote</span>
          </button>
        </div>
      </div>

      {/* Main Tools Ribbon (Fountain Pen, Ballpoint, Highlighter, Eraser, Pan) */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-slate-50">
        <div className="flex items-center space-x-2">
          {/* Fountain Pen */}
          <button
            onClick={() => onSelectTool('fountain')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'fountain'
                ? 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Pluma estilográfica</span>
          </button>

          {/* Ballpoint Pen */}
          <button
            onClick={() => onSelectTool('pen')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'pen'
                ? 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span>Bolígrafo</span>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => onSelectTool('highlighter')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'highlighter'
                ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Highlighter className="w-4 h-4" />
            <span>Resaltador</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => onSelectTool('eraser')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'eraser'
                ? 'bg-rose-100 text-rose-700 shadow-sm border border-rose-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span>Borrador</span>
          </button>

          {/* Pan / Hand Tool */}
          <button
            onClick={() => onSelectTool('pan')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTool === 'pan'
                ? 'bg-slate-300 text-slate-800 shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>Mano (Mover)</span>
          </button>
        </div>

        {/* Color Palette & Stroke Width selector (only for drawing tools) */}
        {currentTool !== 'pan' && currentTool !== 'eraser' && (
          <div className="flex items-center space-x-4">
            {/* Color Swatches */}
            <div className="flex items-center space-x-1.5">
              {activeColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onSelectColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition transform ${
                    currentColor === color ? 'scale-110 border-indigo-600 shadow-md' : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-300" />

            {/* Stroke Width Selector */}
            <div className="flex items-center space-x-1.5">
              {activeWidths.map((w) => (
                <button
                  key={w}
                  onClick={() => onSelectWidth(w)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition ${
                    currentWidth === w
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{
                      width: `${Math.min(16, Math.max(3, w * 0.8))}px`,
                      height: `${Math.min(16, Math.max(3, w * 0.8))}px`,
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
