import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Pencil,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Shapes,
  StickyNote as StickyIcon,
  Sparkles,
  Type,
  Image as ImageIcon,
  LayoutGrid,
  Star,
  Share2,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Mic,
  Camera,
  X,
  Trash2,
  Copy,
  Ruler,
  Clock,
  CircleDot,
  Search,
  CheckCircle2,
} from 'lucide-react';
import type {
  ToolType,
  PageTemplate,
  PaperTheme,
  ViewportState,
  AudioRecordingState,
  EraserMode,
  LaserMode,
  ShapeKind,
  TextOptions,
} from '../types';

interface ToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onBackToLibrary: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
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
  audioState: AudioRecordingState;
  onStartAudioRecording: () => void;
  onStopAudioRecording: () => void;
  onPlayAudio?: () => void;
  onPauseAudio?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewport: ViewportState;
  onViewportChange: (viewport: ViewportState) => void;
  onExport: () => void;
  onExportImage: () => void;
  onClearPage: () => void;
  onDuplicatePage: () => void;
  onImageInsert?: (dataUrl: string) => void;
  saveStatus: 'saved' | 'saving';
  // Subcontrols
  eraserMode: EraserMode;
  onEraserModeChange: (mode: EraserMode) => void;
  eraseHighlighterOnly: boolean;
  onEraseHighlighterOnlyChange: (val: boolean) => void;
  shapeFill: boolean;
  onShapeFillChange: (val: boolean) => void;
  selectedShape: ShapeKind;
  onSelectedShapeChange: (shape: ShapeKind) => void;
  laserMode: LaserMode;
  onLaserModeChange: (mode: LaserMode) => void;
  textOptions: TextOptions;
  onTextOptionsChange: (opts: TextOptions) => void;
}

const PASTEL_STICKY_COLORS = [
  '#fca5a5', // Red
  '#fdba74', // Peach / Orange
  '#fef08a', // Yellow
  '#bef264', // Lime
  '#6ee7b7', // Mint
  '#93c5fd', // Baby Blue
  '#c4b5fd', // Lavender
  '#f472b6', // Pink
  '#e2e8f0', // Soft Gray
  '#ffffff', // White
];

export const Toolbar: React.FC<ToolbarProps> = ({
  title,
  onTitleChange,
  onBackToLibrary,
  onToggleSidebar,
  isSidebarOpen,
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onExportImage,
  onClearPage,
  onDuplicatePage,
  onImageInsert,
  saveStatus,
  eraserMode,
  onEraserModeChange,
  eraseHighlighterOnly,
  onEraseHighlighterOnlyChange,
  shapeFill,
  onShapeFillChange,
  selectedShape,
  onSelectedShapeChange,
  laserMode,
  onLaserModeChange,
  textOptions,
  onTextOptionsChange,
}) => {
  // Popover States
  const [activePopover, setActivePopover] = useState<
    'penType' | 'colorPicker' | 'laser' | 'images' | 'accessories' | 'moreMenu' | null
  >(null);

  // Custom Colors Palette State
  const [colorPresets, setColorPresets] = useState<string[]>([
    '#ef4444', // Red
    '#2563eb', // Royal Blue
    '#0f172a', // Black / Navy
  ]);

  // Sub-instrument for pen
  const [penSubtype, setPenSubtype] = useState<'fountain' | 'pen' | 'calligraphy' | 'pencil' | 'highlighter'>('fountain');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.popover-container') && !target.closest('.toolbar-button')) {
        setActivePopover(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePenTypeSelect = (type: 'fountain' | 'pen' | 'calligraphy' | 'pencil' | 'highlighter') => {
    setPenSubtype(type);
    onSelectTool(type);
    setActivePopover(null);
  };

  const handleAddCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    if (!colorPresets.includes(newColor)) {
      setColorPresets([newColor, colorPresets[0], colorPresets[1]]);
    }
    onSelectColor(newColor);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageInsert) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onImageInsert(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    setActivePopover(null);
    e.target.value = '';
  };

  const isPenActive = ['fountain', 'pen', 'calligraphy', 'pencil', 'highlighter'].includes(currentTool);

  return (
    <div className="relative z-30 select-none font-sans">
      {/* 1. Goodnotes Solid Royal Blue Top Bar */}
      <header className="h-12 bg-[#2563eb] text-white flex items-center justify-between px-3 shadow-md border-b border-blue-700/50">
        {/* Left Section: macOS Traffic Lights + Document Tab + Search + Sidebar + Undo/Redo */}
        <div className="flex items-center space-x-2">
          {/* Traffic light window dots */}
          <div className="flex items-center space-x-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-xs" />
          </div>

          {/* Document Tab (Click ✕ to close tab and return to Library!) */}
          <div className="flex items-center bg-blue-700/80 hover:bg-blue-700 text-white rounded-t-lg px-3 py-1.5 space-x-2 text-xs font-medium border-t border-x border-blue-500/50 shadow-inner">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="bg-transparent border-none text-white font-medium text-xs focus:outline-none max-w-[140px] truncate"
              title="Haz clic para renombrar"
            />
            <span title={saveStatus === 'saved' ? 'Guardado en IndexedDB' : 'Guardando cambios...'}>
              <CheckCircle2 className={`w-3 h-3 ${saveStatus === 'saved' ? 'text-emerald-300' : 'text-amber-300 animate-pulse'}`} />
            </span>
            <button
              onClick={onBackToLibrary}
              className="p-0.5 rounded-full hover:bg-blue-600 text-blue-200 hover:text-white transition"
              title="Cerrar cuaderno y volver a Documentos"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-blue-400/40 mx-1" />

          {/* Page Navigator */}
          <div className="flex items-center space-x-0.5 text-xs text-white/90">
            <button
              onClick={onPrevPage}
              disabled={currentPageIndex === 0}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-20"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-0.5">{currentPageIndex + 1}/{totalPages}</span>
            <button
              onClick={onNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-20"
              title="Página siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-blue-400/40 mx-1" />

          {/* Search Button */}
          <button
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Buscar en documento"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Sidebar Drawer Toggle (4-square grid icon) */}
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg transition ${
              isSidebarOpen ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Mostrar / Ocultar miniaturas de páginas"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Undo & Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo || isReadOnly}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
            title="Deshacer (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || isReadOnly}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
            title="Rehacer (Cmd+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Center Section: Main Tool Selector (Goodnotes Icons) */}
        <div className="flex items-center space-x-1">
          {/* 1. Lasso Tool */}
          <button
            onClick={() => onSelectTool('lasso')}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              currentTool === 'lasso'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Selección con lazo (V)"
          >
            <span className="font-mono text-sm leading-none font-bold">☌</span>
          </button>

          {/* 2. Pen Tool (W) */}
          <button
            onClick={() => onSelectTool(penSubtype)}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              isPenActive
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Escribir (W)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* 3. Eraser Tool (E) */}
          <button
            onClick={() => onSelectTool('eraser')}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              currentTool === 'eraser'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Borrador (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* 4. Text Tool (T) */}
          <button
            onClick={() => onSelectTool('text')}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              currentTool === 'text'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Texto (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* 5. Elements / Stickers (M) */}
          <button
            onClick={onOpenElementsModal}
            className="toolbar-button p-1.5 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition"
            title="Elemento (M) - Stickers y Sellos"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* 6. Images */}
          <button
            onClick={() => setActivePopover(activePopover === 'images' ? null : 'images')}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              activePopover === 'images'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Insertar Imágenes"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* 7. Shapes Tool (S) */}
          <button
            onClick={() => onSelectTool('shape')}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              currentTool === 'shape'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Formas (S)"
          >
            <Shapes className="w-4 h-4" />
          </button>

          {/* 8. Sticky Note (N) & Study Tape */}
          <button
            onClick={() => onSelectTool(currentTool === 'sticky' ? 'tape' : 'sticky')}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              currentTool === 'sticky' || currentTool === 'tape'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Nota adhesiva (N) / Cinta de estudio"
          >
            <StickyIcon className="w-4 h-4" />
          </button>

          {/* 9. Laser Pointer */}
          <button
            onClick={() => {
              onSelectTool('laser');
              setActivePopover(activePopover === 'laser' ? null : 'laser');
            }}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              currentTool === 'laser'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title="Puntero láser"
          >
            <CircleDot className="w-4 h-4 text-red-300" />
          </button>

          {/* 10. Audio Recording Sync */}
          <button
            onClick={audioState.isRecording ? onStopAudioRecording : onStartAudioRecording}
            className={`toolbar-button p-1.5 rounded-xl transition ${
              audioState.isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
            title={audioState.isRecording ? 'Detener grabación de audio' : 'Grabar audio sincronizado'}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* 11. Accessories Dropdown */}
          <button
            onClick={() => setActivePopover(activePopover === 'accessories' ? null : 'accessories')}
            className="toolbar-button p-1.5 rounded-xl text-white/85 hover:text-white hover:bg-white/10 flex items-center space-x-0.5 transition"
            title="Accesorios"
          >
            <Ruler className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
        </div>

        {/* Right Section: Favorite Star + Share/Export + More Menu */}
        <div className="flex items-center space-x-1.5">
          {/* Bookmark / Star Page */}
          <button
            onClick={onToggleBookmark}
            className={`p-1.5 rounded-lg transition ${
              isBookmarked ? 'text-amber-300 hover:text-amber-200' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title={isBookmarked ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
          >
            <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Share / Export */}
          <button
            onClick={onExport}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Exportar archivo (.osnotes)"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* More Menu (...) */}
          <button
            onClick={() => setActivePopover(activePopover === 'moreMenu' ? null : 'moreMenu')}
            className="toolbar-button p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Más opciones"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Floating Sub-Toolbar (Goodnotes White Rounded Pill) */}
      {!isReadOnly && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
          <div className="bg-white text-slate-800 shadow-md border border-slate-200/90 rounded-full px-3 py-1 flex items-center space-x-3 transition-all animate-in fade-in zoom-in-95">
            {/* SUB-TOOLBAR CONTENT WHEN PEN IS ACTIVE */}
            {isPenActive && (
              <>
                {/* Pen Subtype Selector Dropdown Pill */}
                <div className="relative popover-container">
                  <button
                    onClick={() => setActivePopover(activePopover === 'penType' ? null : 'penType')}
                    className="flex items-center space-x-1.5 bg-[#dbeafe] text-[#1d4ed8] font-semibold text-xs px-2.5 py-1 rounded-full hover:bg-blue-100 transition"
                  >
                    {penSubtype === 'fountain' && <PenTool className="w-3.5 h-3.5" />}
                    {penSubtype === 'pen' && <span className="font-bold text-xs">●</span>}
                    {penSubtype === 'calligraphy' && <PenTool className="w-3.5 h-3.5" />}
                    {penSubtype === 'pencil' && <Pencil className="w-3.5 h-3.5" />}
                    {penSubtype === 'highlighter' && <Highlighter className="w-3.5 h-3.5" />}
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>

                  {/* Pen Dropdown Menu */}
                  {activePopover === 'penType' && (
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs text-slate-700 z-50">
                      <button
                        onClick={() => handlePenTypeSelect('fountain')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-slate-50 ${penSubtype === 'fountain' ? 'text-blue-600 font-semibold' : ''}`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Pluma estilográfica</span>
                      </button>
                      <button
                        onClick={() => handlePenTypeSelect('pen')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-slate-50 ${penSubtype === 'pen' ? 'text-blue-600 font-semibold' : ''}`}
                      >
                        <span className="font-bold text-xs">●</span>
                        <span>Bolígrafo</span>
                      </button>
                      <button
                        onClick={() => handlePenTypeSelect('calligraphy')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-slate-50 ${penSubtype === 'calligraphy' ? 'text-blue-600 font-semibold' : ''}`}
                      >
                        <PenTool className="w-3.5 h-3.5 rotate-45" />
                        <span>Pluma caligráfica</span>
                      </button>
                      <button
                        onClick={() => handlePenTypeSelect('pencil')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-slate-50 ${penSubtype === 'pencil' ? 'text-blue-600 font-semibold' : ''}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Lápiz grafito</span>
                      </button>
                      <button
                        onClick={() => handlePenTypeSelect('highlighter')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-slate-50 ${penSubtype === 'highlighter' ? 'text-blue-600 font-semibold' : ''}`}
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                        <span>Resaltador</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* 3 Stroke Width Presets (Thin, Medium, Thick) */}
                <div className="flex items-center space-x-1">
                  {[1.5, 3.0, 6.0].map((w) => (
                    <button
                      key={w}
                      onClick={() => onSelectWidth(w)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        currentWidth === w ? 'bg-slate-100 ring-2 ring-blue-500' : 'hover:bg-slate-50'
                      }`}
                      title={`${w} mm`}
                    >
                      <span
                        className="bg-slate-800 rounded-full"
                        style={{
                          width: `${Math.min(18, Math.max(3, w * 1.8))}px`,
                          height: `${Math.min(18, Math.max(3, w * 1.8))}px`,
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* 3 Color Preset Dots + Color Picker */}
                <div className="flex items-center space-x-1.5">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => onSelectColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition relative ${
                        currentColor === color ? 'ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {currentColor === color && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">▼</span>
                      )}
                    </button>
                  ))}

                  {/* Add Color Button (+) */}
                  <label className="w-6 h-6 rounded-full border border-dashed border-slate-400 flex items-center justify-center cursor-pointer hover:border-slate-600 text-slate-500 transition">
                    <Plus className="w-3.5 h-3.5" />
                    <input type="color" onChange={handleAddCustomColor} className="hidden" />
                  </label>
                </div>
              </>
            )}

            {/* SUB-TOOLBAR CONTENT WHEN ERASER IS ACTIVE */}
            {currentTool === 'eraser' && (
              <>
                <button
                  onClick={() =>
                    onEraserModeChange(eraserMode === 'standard' ? 'stroke' : eraserMode === 'stroke' ? 'precision' : 'standard')
                  }
                  className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full text-xs font-semibold text-slate-700 transition"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>
                    {eraserMode === 'standard' && 'Estándar'}
                    {eraserMode === 'stroke' && 'Trazo completo'}
                    {eraserMode === 'precision' && 'De precisión'}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {/* Switch: Erase highlighter only */}
                <button
                  onClick={() => onEraseHighlighterOnlyChange(!eraseHighlighterOnly)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                    eraseHighlighterOnly ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Solo resaltar
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {/* 3 Eraser Sizes */}
                <div className="flex items-center space-x-1.5">
                  {[15, 30, 50].map((size) => (
                    <button
                      key={size}
                      onClick={() => onSelectWidth(size)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center border transition ${
                        currentWidth === size ? 'border-blue-600 ring-2 ring-blue-500' : 'border-slate-300'
                      }`}
                    >
                      <span
                        className="rounded-full bg-slate-200"
                        style={{ width: `${size / 3}px`, height: `${size / 3}px` }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* SUB-TOOLBAR CONTENT WHEN SHAPES IS ACTIVE */}
            {currentTool === 'shape' && (
              <>
                {/* Auto Detection Mode vs Explicit Shape Buttons */}
                <button
                  onClick={() => onSelectedShapeChange('auto')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                    selectedShape === 'auto'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Dibuja a mano alzada y Goodnotes lo convertirá automáticamente en figura perfecta"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto</span>
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {/* Fill Toggle */}
                <button
                  onClick={() => onShapeFillChange(!shapeFill)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold transition ${
                    shapeFill ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Relleno automático translúcido"
                >
                  <span>⧉ Relleno</span>
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {/* Shape Presets */}
                <div className="flex items-center space-x-1">
                  {(
                    [
                      { id: 'rect', label: '▭', title: 'Rectángulo' },
                      { id: 'circle', label: '○', title: 'Círculo / Óvalo' },
                      { id: 'triangle', label: '△', title: 'Triángulo' },
                      { id: 'diamond', label: '◇', title: 'Rombo' },
                      { id: 'line', label: '──', title: 'Línea recta' },
                      { id: 'arrow', label: '➔', title: 'Flecha' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSelectedShapeChange(s.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                        selectedShape === s.id
                          ? 'bg-blue-50 text-blue-600 border border-blue-400 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title={s.title}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Width Presets */}
                <div className="flex items-center space-x-1">
                  {[2.0, 4.0, 8.0].map((w) => (
                    <button
                      key={w}
                      onClick={() => onSelectWidth(w)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                        currentWidth === w ? 'bg-slate-100 ring-2 ring-blue-500' : 'hover:bg-slate-50'
                      }`}
                      title={`${w} mm`}
                    >
                      <span
                        className="bg-slate-800 rounded-full"
                        style={{
                          width: `${Math.min(14, Math.max(3, w * 1.5))}px`,
                          height: `${Math.min(14, Math.max(3, w * 1.5))}px`,
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Color Dot */}
                <label
                  className="w-6 h-6 rounded-full border border-slate-300 cursor-pointer block hover:scale-110 transition shadow-xs"
                  style={{ backgroundColor: currentColor }}
                  title="Cambiar color del trazo"
                >
                  <input type="color" onChange={(e) => onSelectColor(e.target.value)} className="hidden" />
                </label>
              </>
            )}

            {/* SUB-TOOLBAR CONTENT WHEN TEXT IS ACTIVE */}
            {currentTool === 'text' && (
              <>
                <label className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer" style={{ backgroundColor: currentColor }}>
                  <input type="color" onChange={(e) => onSelectColor(e.target.value)} className="hidden" />
                </label>

                <select
                  value={textOptions.fontSize}
                  onChange={(e) => onTextOptionsChange({ ...textOptions, fontSize: Number(e.target.value) })}
                  className="text-xs bg-slate-100 rounded px-2 py-0.5 border-none outline-none font-medium cursor-pointer"
                >
                  <option value={16}>16</option>
                  <option value={20}>20</option>
                  <option value={24}>24</option>
                  <option value={32}>32</option>
                  <option value={48}>48</option>
                </select>

                <select
                  value={textOptions.fontFamily}
                  onChange={(e) => onTextOptionsChange({ ...textOptions, fontFamily: e.target.value })}
                  className="text-xs bg-slate-100 rounded px-2 py-0.5 border-none outline-none font-medium cursor-pointer"
                >
                  <option value="Moderna">Moderna</option>
                  <option value="Manuscrita">Manuscrita</option>
                  <option value="Sans">Sans-Serif</option>
                  <option value="Serif">Serif</option>
                  <option value="Mono">Monospace</option>
                </select>

                <button
                  onClick={() => onTextOptionsChange({ ...textOptions, isBold: !textOptions.isBold })}
                  className={`w-6 h-6 rounded text-xs font-bold ${textOptions.isBold ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  B
                </button>
                <button
                  onClick={() => onTextOptionsChange({ ...textOptions, isItalic: !textOptions.isItalic })}
                  className={`w-6 h-6 rounded text-xs italic font-serif ${textOptions.isItalic ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  I
                </button>
              </>
            )}

            {/* SUB-TOOLBAR CONTENT WHEN STICKY NOTE IS ACTIVE */}
            {(currentTool === 'sticky' || currentTool === 'tape') && (
              <div className="flex items-center space-x-1.5">
                {PASTEL_STICKY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onSelectColor(c)}
                    className={`w-5 h-5 rounded-md border transition ${
                      currentColor === c ? 'ring-2 ring-blue-500 scale-110' : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. POPOVER: IMAGES (Goodnotes Screenshot 8) */}
      {activePopover === 'images' && (
        <div className="popover-container absolute top-14 left-1/2 transform -translate-x-1/2 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 w-72 animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm text-slate-800">Imágenes</h4>
            <Camera className="w-4 h-4 text-slate-500" />
          </div>

          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl mb-4 bg-slate-50">
            <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 text-center">Inserta fotos o diagramas en tu cuaderno</p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg text-center transition"
          >
            Insertar de...
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* 4. POPOVER: LASER POINTER (Goodnotes Screenshot 11) */}
      {activePopover === 'laser' && (
        <div className="popover-container absolute top-14 left-1/2 transform -translate-x-1/2 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-64 animate-in zoom-in-95">
          <h4 className="font-bold text-xs text-slate-800 mb-3 text-center">Puntero láser</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onLaserModeChange('dot');
                setActivePopover(null);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                laserMode === 'dot' ? 'border-blue-500 bg-blue-50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 mb-2" />
              <span className="text-xs font-semibold text-slate-700">Punto</span>
            </button>
            <button
              onClick={() => {
                onLaserModeChange('trail');
                setActivePopover(null);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                laserMode === 'trail' ? 'border-blue-500 bg-blue-50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-6 h-1 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 mb-3" />
              <span className="text-xs font-semibold text-slate-700">Línea</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. POPOVER: ACCESSORIES (Goodnotes Screenshot 12) */}
      {activePopover === 'accessories' && (
        <div className="popover-container absolute top-14 left-1/2 transform -translate-x-1/2 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 w-64 text-xs text-slate-700 animate-in zoom-in-95">
          <div className="px-4 py-1.5 font-bold text-slate-900 border-b border-slate-100">Accesorios</div>
          <button
            onClick={() => setActivePopover(null)}
            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
          >
            <Mic className="w-4 h-4 text-blue-600" />
            <span>Mostrar grabaciones</span>
          </button>
          <button
            onClick={() => setActivePopover(null)}
            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
          >
            <Ruler className="w-4 h-4 text-slate-500" />
            <span>Regla</span>
          </button>
          <button
            onClick={() => setActivePopover(null)}
            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Time Keeper</span>
          </button>
          <div className="h-px bg-slate-100 my-1" />
          <div className="px-4 py-2 text-[11px] text-slate-400">Personalización de la barra de herramientas</div>
        </div>
      )}

      {/* 6. POPOVER: MORE MENU (...) (Goodnotes Screenshot 13) */}
      {activePopover === 'moreMenu' && (
        <div className="popover-container absolute top-14 right-4 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 w-72 text-xs text-slate-700 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
          {/* Header with thumbnail */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-900 text-sm">Más</span>
              <p className="text-[11px] text-slate-400">Página {currentPageIndex + 1} de {totalPages}</p>
            </div>
            <div className="w-8 h-10 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
              {currentPageIndex + 1}
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                onToggleBookmark();
                setActivePopover(null);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
            >
              <Star className={`w-4 h-4 ${isBookmarked ? 'text-amber-500 fill-current' : 'text-slate-400'}`} />
              <span>{isBookmarked ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}</span>
            </button>

            <button
              onClick={() => {
                onDuplicatePage();
                setActivePopover(null);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
            >
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Copiar página</span>
            </button>

            <button
              onClick={() => {
                onAddPage();
                setActivePopover(null);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span>Añadir página después</span>
            </button>

            <button
              onClick={() => {
                onToggleReadOnly();
                setActivePopover(null);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center font-bold text-slate-500">👁</span>
              <span>{isReadOnly ? 'Desactivar Modo Lectura' : 'Modo Lectura (Bloquear trazos)'}</span>
            </button>
          </div>

          {/* Paper Template Changer */}
          <div className="px-4 py-2 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Plantilla de Papel</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['grid', 'ruled', 'dotted', 'cornell', 'blank'] as PageTemplate[]).map((tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => onSelectTemplate(tmpl)}
                  className={`py-1 px-2 rounded text-left capitalize transition ${
                    currentTemplate === tmpl ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {tmpl === 'grid' && 'Cuadrícula'}
                  {tmpl === 'ruled' && 'Rayado'}
                  {tmpl === 'dotted' && 'Puntos'}
                  {tmpl === 'cornell' && 'Cornell'}
                  {tmpl === 'blank' && 'En Blanco'}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Theme / Color Changer */}
          <div className="px-4 py-2 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Color del Papel</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['white', 'dark', 'blueprint', 'parchment', 'chalkboard'] as PaperTheme[]).map((thm) => (
                <button
                  key={thm}
                  onClick={() => onSelectTheme(thm)}
                  className={`py-1 px-2 rounded text-left capitalize transition ${
                    currentTheme === thm ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {thm === 'white' && 'Blanco'}
                  {thm === 'dark' && 'Dark'}
                  {thm === 'blueprint' && 'Blueprint'}
                  {thm === 'parchment' && 'Pergamino'}
                  {thm === 'chalkboard' && 'Pizarra'}
                </button>
              ))}
            </div>
          </div>

          {/* Delete / Clear Section */}
          <div className="px-4 py-2 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Borrar o Eliminar</div>
            <button
              onClick={() => {
                if (confirm('¿Limpiar todos los trazos de esta página?')) {
                  onClearPage();
                  setActivePopover(null);
                }
              }}
              className="w-full flex items-center space-x-2 py-1.5 text-rose-600 hover:text-rose-700 text-left font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar página</span>
            </button>
          </div>

          {/* Export PNG */}
          <div className="px-4 py-2 border-t border-slate-100">
            <button
              onClick={() => {
                onExportImage();
                setActivePopover(null);
              }}
              className="w-full py-1.5 text-blue-600 hover:text-blue-700 text-left font-semibold"
            >
              Exportar página como imagen PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
