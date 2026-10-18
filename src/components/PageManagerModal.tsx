import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Copy, Trash2, Check, Bookmark, BookOpen, Layers } from 'lucide-react';
import type { Page, PageTemplate, PaperTheme } from '../types';
import { drawPageTemplate } from '../engine/templates';
import { renderStroke } from '../engine/inking';

interface PageManagerModalProps {
  pages: Page[];
  currentPageIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (index: number) => void;
  onAddPage: (template: PageTemplate, theme: PaperTheme) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onToggleBookmark: (index: number) => void;
  onUpdateOutlineTitle: (index: number, title: string) => void;
}

const PageThumbnail: React.FC<{
  page: Page;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleBookmark: () => void;
  canDelete: boolean;
}> = ({ page, index, isActive, onSelect, onDuplicate, onDelete, onToggleBookmark, canDelete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 0.18;
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

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col items-center p-2 rounded-xl border-2 transition cursor-pointer select-none ${
        isActive
          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      {/* Thumbnail Canvas */}
      <div className="relative overflow-hidden rounded-md shadow-md border border-slate-700/50">
        <canvas ref={canvasRef} />
        {/* Active badge */}
        {isActive && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        )}
        {/* Bookmark ribbon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          className={`absolute top-1.5 left-1.5 p-1 rounded-full backdrop-blur-md transition ${
            page.isBookmarked
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-black/40 text-white/50 hover:text-white'
          }`}
          title={page.isBookmarked ? 'Página en Favoritos' : 'Añadir a Favoritos'}
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>

      {/* Footer Info & Actions */}
      <div className="flex items-center justify-between w-full mt-2 px-1 text-xs">
        <div className="truncate flex-1">
          <span className="font-semibold text-slate-300">Pág. {index + 1}</span>
          {page.outlineTitle && (
            <span className="block text-[10px] text-indigo-400 truncate">
              {page.outlineTitle}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Duplicar página"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-rose-950 text-rose-400 hover:text-rose-200"
              title="Eliminar página"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const PageManagerModal: React.FC<PageManagerModalProps> = ({
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
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarks' | 'outline'>('all');

  if (!isOpen) return null;

  const bookmarkedPages = pages
    .map((p, index) => ({ page: p, index }))
    .filter(({ page }) => page.isBookmarked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 select-none animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with 3 Tabs (Todas, Marcadores, Esquema) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-bold text-white tracking-wide">
              Páginas del Cuaderno
            </h2>

            {/* Tabs */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl text-xs font-medium border border-slate-800">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todas ({pages.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition ${
                  activeTab === 'bookmarks'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Favoritos ({bookmarkedPages.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('outline')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition ${
                  activeTab === 'outline'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Esquema / Outline</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'all' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pages.map((page, index) => (
                <PageThumbnail
                  key={page.id}
                  page={page}
                  index={index}
                  isActive={index === currentPageIndex}
                  onSelect={() => {
                    onSelectPage(index);
                    onClose();
                  }}
                  onDuplicate={() => onDuplicatePage(index)}
                  onDelete={() => onDeletePage(index)}
                  onToggleBookmark={() => onToggleBookmark(index)}
                  canDelete={pages.length > 1}
                />
              ))}

              {/* Add Page Card */}
              <button
                onClick={() => onAddPage('ruled', 'white')}
                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 transition min-h-[200px]"
              >
                <Plus className="w-8 h-8 mb-2 stroke-[1.5]" />
                <span className="text-xs font-semibold">Nueva Página</span>
              </button>
            </div>
          )}

          {activeTab === 'bookmarks' && (
            bookmarkedPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                <Bookmark className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-300">No hay páginas marcadas</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Pulsa el icono de cinta en la esquina superior de cualquier página para añadirla a tus favoritos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {bookmarkedPages.map(({ page, index }) => (
                  <PageThumbnail
                    key={page.id}
                    page={page}
                    index={index}
                    isActive={index === currentPageIndex}
                    onSelect={() => {
                      onSelectPage(index);
                      onClose();
                    }}
                    onDuplicate={() => onDuplicatePage(index)}
                    onDelete={() => onDeletePage(index)}
                    onToggleBookmark={() => onToggleBookmark(index)}
                    canDelete={pages.length > 1}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'outline' && (
            <div className="space-y-2 max-w-2xl mx-auto">
              <p className="text-xs text-slate-400 mb-4">
                Define títulos y capítulos para estructurar las secciones de tu libreta:
              </p>
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center space-x-3 p-3 bg-slate-800/40 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                >
                  <span className="w-16 font-mono text-xs text-slate-400">Pág. {idx + 1}</span>
                  <input
                    type="text"
                    value={p.outlineTitle || ''}
                    onChange={(e) => onUpdateOutlineTitle(idx, e.target.value)}
                    placeholder="Añadir título a esta página (ej: Tema 1: Derivadas)..."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      onSelectPage(idx);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition"
                  >
                    Ir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Total: <strong className="text-indigo-400">{pages.length} páginas</strong>
          </span>
          <button
            onClick={() => onAddPage('ruled', 'white')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Página</span>
          </button>
        </div>
      </div>
    </div>
  );
};
