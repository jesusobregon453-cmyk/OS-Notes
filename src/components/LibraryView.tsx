import React, { useState } from 'react';
import {
  Plus,
  Book,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Download,
  Upload,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import type { NotebookSummary, NotebookCover, PageTemplate, PaperTheme } from '../types';

interface LibraryViewProps {
  notebooks: NotebookSummary[];
  onOpenNotebook: (id: string) => void;
  onCreateNotebook: (
    title: string,
    cover: NotebookCover,
    template: PageTemplate,
    theme: PaperTheme
  ) => void;
  onDuplicateNotebook: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
  onExportNotebook: (id: string) => void;
  onImportNotebook: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const COVER_COLORS = [
  '#1e293b', // Slate Dark
  '#1e3a8a', // Deep Blue
  '#065f46', // Emerald
  '#831843', // Crimson
  '#581c87', // Royal Purple
  '#78350f', // Leather Brown
  '#0f766e', // Teal
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  notebooks,
  onOpenNotebook,
  onCreateNotebook,
  onDuplicateNotebook,
  onDeleteNotebook,
  onExportNotebook,
  onImportNotebook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New Notebook Form State
  const [newTitle, setNewTitle] = useState('Nuevo Cuaderno');
  const [newColor, setNewColor] = useState('#1e3a8a');
  const [newStyle, setNewStyle] = useState<'leather' | 'minimal' | 'spiral' | 'gradient'>('leather');
  const [newTemplate, setNewTemplate] = useState<PageTemplate>('ruled');
  const [newTheme, setNewTheme] = useState<PaperTheme>('white');

  const filteredNotebooks = notebooks.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateNotebook(
      newTitle.trim() || 'Cuaderno sin título',
      { color: newColor, style: newStyle },
      newTemplate,
      newTheme
    );
    setIsCreateModalOpen(false);
    setNewTitle('Nuevo Cuaderno');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
              <span>OS Notes Pro</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Biblioteca
              </span>
            </h1>
            <p className="text-xs text-slate-400">Todos tus cuadernos y documentos locales</p>
          </div>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cuadernos..."
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-64 transition"
            />
          </div>

          <label className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium cursor-pointer transition">
            <Upload className="w-4 h-4 text-slate-300" />
            <span>Importar</span>
            <input type="file" accept=".osnotes,.gnote,.zip" onChange={onImportNotebook} className="hidden" />
          </label>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cuaderno</span>
          </button>
        </div>
      </header>

      {/* Notebooks Grid Shelf */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {filteredNotebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center">
            <Book className="w-16 h-16 text-slate-700 mb-4 stroke-[1]" />
            <h3 className="text-base font-semibold text-slate-300">No se encontraron cuadernos</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
              Crea tu primer cuaderno digital con portadas realistas y plantillas para comenzar.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Cuaderno</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredNotebooks.map((nb) => (
              <div
                key={nb.id}
                onClick={() => onOpenNotebook(nb.id)}
                className="group relative flex flex-col cursor-pointer select-none"
              >
                {/* 3D Realistic Notebook Cover */}
                <div
                  className="relative aspect-[3/4] rounded-r-xl rounded-l-sm shadow-xl transition-all duration-200 transform group-hover:-translate-y-1 group-hover:shadow-2xl overflow-hidden border-r-2 border-b-2 border-black/30"
                  style={{ backgroundColor: nb.coverColor }}
                >
                  {/* Leather Spine Effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/25 border-r border-white/10" />

                  {/* Golden / Silver Stamped Title Plate */}
                  <div className="absolute inset-x-5 top-12 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-center shadow-inner">
                    <span className="font-serif font-bold text-xs text-white tracking-wide line-clamp-2">
                      {nb.title}
                    </span>
                  </div>

                  {/* Page count pill */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono text-white/80">
                    {nb.pageCount} {nb.pageCount === 1 ? 'pág' : 'págs'}
                  </div>
                </div>

                {/* Notebook Info & Menu */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="truncate flex-1">
                    <h3 className="font-semibold text-xs text-slate-200 truncate group-hover:text-indigo-400 transition">
                      {nb.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(nb.updatedAt)}</p>
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === nb.id ? null : nb.id);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Context Menu Dropdown */}
                    {activeMenuId === nb.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-full mb-1 z-30 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-300 animate-in fade-in zoom-in-95"
                      >
                        <button
                          onClick={() => {
                            onOpenNotebook(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 hover:bg-slate-800 text-left"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Abrir</span>
                        </button>
                        <button
                          onClick={() => {
                            onDuplicateNotebook(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 hover:bg-slate-800 text-left"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Duplicar</span>
                        </button>
                        <button
                          onClick={() => {
                            onExportNotebook(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 hover:bg-slate-800 text-left"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                          <span>Exportar (.osnotes)</span>
                        </button>
                        <div className="h-px bg-slate-800 my-1" />
                        <button
                          onClick={() => {
                            onDeleteNotebook(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 hover:bg-rose-950 text-rose-400 text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Notebook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <form
            onSubmit={handleCreateSubmit}
            className="flex flex-col w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Crear Nuevo Cuaderno</h2>
              <p className="text-xs text-slate-400">Personaliza la portada y la plantilla inicial</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Título del Cuaderno
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Matemáticas, Diario de Ideas..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {/* Cover Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Color de Portada
                </label>
                <div className="flex items-center space-x-2">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        newColor === c ? 'scale-125 border-indigo-400 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Cover Style */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Estilo de Portada
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewStyle('leather')}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                      newStyle === 'leather'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Clásico Cuero
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStyle('minimal')}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                      newStyle === 'minimal'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Moderno Minimal
                  </button>
                </div>
              </div>

              {/* Initial Template */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Plantilla de Hoja
                  </label>
                  <select
                    value={newTemplate}
                    onChange={(e) => setNewTemplate(e.target.value as PageTemplate)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="ruled">Rayado</option>
                    <option value="grid">Cuadrícula 5mm</option>
                    <option value="dotted">Puntos (Bullet)</option>
                    <option value="cornell">Cornell Notes</option>
                    <option value="hexagonal">Hexagonal</option>
                    <option value="blank">En Blanco</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tema del Papel
                  </label>
                  <select
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value as PaperTheme)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="white">Blanco Clásico</option>
                    <option value="dark">Modo Oscuro OLED</option>
                    <option value="blueprint">Blueprint</option>
                    <option value="parchment">Pergamino</option>
                    <option value="chalkboard">Pizarra Verde</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 px-6 py-3 bg-slate-950 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
              >
                Crear Cuaderno
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
