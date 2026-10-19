import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Plus,
  Copy,
  Trash2,
  Star,
  LayoutGrid,
  List,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import type { Page } from '../types';
import { drawPageTemplate } from '../engine/templates';
import { renderStroke } from '../engine/inking';

interface PagesSidebarProps {
  pages: Page[];
  currentPageIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onToggleBookmark: (index: number) => void;
  onUpdateOutlineTitle: (index: number, title: string) => void;
}

const PageThumbnailCanvas: React.FC<{ page: Page }> = ({ page }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 0.14;
    canvas.width = page.width * scale;
    canvas.height = page.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);

    drawPageTemplate(ctx, page.width, page.height, page.template, page.theme || 'white');

    const highlighters = page.strokes.filter((s) => s.tool === 'highlighter');
    const normalStrokes = page.strokes.filter((s) => s.tool !== 'highlighter');

    for (const s of highlighters) renderStroke(ctx, s, 1.0);
    for (const s of normalStrokes) renderStroke(ctx, s, 1.0);
  }, [page]);

  return <canvas ref={canvasRef} className="w-full h-auto rounded block pointer-events-none" />;
};

export const PagesSidebar: React.FC<PagesSidebarProps> = ({
  pages,
  currentPageIndex,
  isOpen,
  onClose,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onToggleBookmark,
  onUpdateOutlineTitle,
}) => {
  const [tab, setTab] = useState<'thumbnails' | 'outline' | 'bookmarks'>('thumbnails');
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const bookmarkedPages = pages
    .map((p, idx) => ({ page: p, index: idx }))
    .filter(({ page }) => !!page.isBookmarked);

  return (
    <aside className="w-64 h-full bg-[#f8fafc] border-r border-slate-200 shadow-md flex flex-col z-20 select-none animate-in slide-in-from-left-4 duration-200">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-white">
        <button className="p-1 rounded hover:bg-slate-100 text-slate-500">
          <MoreHorizontal className="w-4 h-4" />
        </button>
        <span className="font-bold text-xs text-slate-800">Páginas</span>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          title="Cerrar barra lateral"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Control Tabs (Miniatures, Outline, Bookmarks) */}
      <div className="px-3 pt-3 pb-2 bg-white border-b border-slate-100">
        <div className="grid grid-cols-3 bg-slate-100 p-0.5 rounded-lg text-slate-600">
          <button
            onClick={() => setTab('thumbnails')}
            className={`py-1 rounded-md text-xs font-semibold flex items-center justify-center transition ${
              tab === 'thumbnails' ? 'bg-white shadow-xs text-blue-600' : 'hover:text-slate-900'
            }`}
            title="Miniaturas"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTab('outline')}
            className={`py-1 rounded-md text-xs font-semibold flex items-center justify-center transition ${
              tab === 'outline' ? 'bg-white shadow-xs text-blue-600' : 'hover:text-slate-900'
            }`}
            title="Esquema / Índice"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTab('bookmarks')}
            className={`py-1 rounded-md text-xs font-semibold flex items-center justify-center transition ${
              tab === 'bookmarks' ? 'bg-white shadow-xs text-blue-600' : 'hover:text-slate-900'
            }`}
            title="Favoritos"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter Dropdown */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="text-[11px] font-medium text-blue-600 flex items-center space-x-1 cursor-pointer">
            <span>Todas las páginas</span>
            <ChevronDown className="w-3 h-3" />
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{pages.length} págs</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* TAB 1: THUMBNAILS GRID */}
        {tab === 'thumbnails' && (
          <div className="grid grid-cols-2 gap-3">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPage(idx)}
                className="group relative flex flex-col items-center cursor-pointer"
              >
                {/* Thumbnail Card */}
                <div
                  className={`relative w-full aspect-[3/4] bg-white rounded-lg border shadow-xs overflow-hidden transition ${
                    currentPageIndex === idx
                      ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <PageThumbnailCanvas page={p} />

                  {/* Bookmark Star Ribbon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(idx);
                    }}
                    className={`absolute top-1.5 right-1.5 p-0.5 rounded transition ${
                      p.isBookmarked ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                    title={p.isBookmarked ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
                  >
                    <Star className={`w-3.5 h-3.5 ${p.isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Page Number & Options */}
                <div className="flex items-center justify-between w-full mt-1 px-1">
                  <span className="text-[11px] font-medium text-slate-600">{idx + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuIndex(activeMenuIndex === idx ? null : idx);
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Page Context Menu */}
                {activeMenuIndex === idx && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-8 right-0 z-30 w-36 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs text-slate-700 animate-in fade-in"
                  >
                    <button
                      onClick={() => {
                        onDuplicatePage(idx);
                        setActiveMenuIndex(null);
                      }}
                      className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-slate-50 text-left"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duplicar</span>
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={() => {
                          onDeletePage(idx);
                          setActiveMenuIndex(null);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Big Dashed Card with (+) to Add Next Page */}
            <div
              onClick={onAddPage}
              className="w-full aspect-[3/4] border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50/70 rounded-lg flex flex-col items-center justify-center cursor-pointer transition text-blue-600"
              title="Añadir nueva página"
            >
              <Plus className="w-6 h-6 stroke-[2.5] mb-1" />
              <span className="text-[10px] font-bold">Añadir</span>
            </div>
          </div>
        )}

        {/* TAB 2: OUTLINE / ESQUEMA */}
        {tab === 'outline' && (
          <div className="space-y-2">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Esquema del Documento</h5>
            {pages.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPage(idx)}
                className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between text-xs ${
                  currentPageIndex === idx
                    ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="truncate flex-1 mr-2">
                  <span className="font-mono text-slate-400 mr-1.5">{idx + 1}.</span>
                  <span>{p.outlineTitle || `Página ${idx + 1}`}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Título para el esquema:', p.outlineTitle || `Página ${idx + 1}`);
                    if (newTitle !== null) onUpdateOutlineTitle(idx, newTitle);
                  }}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: BOOKMARKS / FAVORITOS */}
        {tab === 'bookmarks' && (
          <div>
            {bookmarkedPages.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No hay páginas en favoritos.</p>
                <p className="text-[11px] mt-1 text-slate-400">Pulsa la estrella en cualquier página para guardarla aquí.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {bookmarkedPages.map(({ page: p, index: idx }) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectPage(idx)}
                    className="group relative flex flex-col items-center cursor-pointer"
                  >
                    <div className="relative w-full aspect-[3/4] bg-white rounded-lg border border-amber-300 shadow-xs overflow-hidden">
                      <PageThumbnailCanvas page={p} />
                      <div className="absolute top-1.5 right-1.5 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 mt-1">Pág. {idx + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
