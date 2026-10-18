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
  Folder,
  Star,
  Users,
  Store,
  LayoutGrid,
  List,
  Cloud,
  X,
  Sparkles,
  Info,
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
  onToggleFavorite?: (id: string) => void;
}

const COVER_COLORS = [
  '#f8fafc', // Clean Paper White
  '#fef3c7', // Warm Cream
  '#dbeafe', // Sky Pastel
  '#e0e7ff', // Soft Indigo
  '#1e293b', // Slate Dark
  '#1e3a8a', // Deep Blue
  '#065f46', // Emerald
  '#831843', // Crimson
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  notebooks,
  onOpenNotebook,
  onCreateNotebook,
  onDuplicateNotebook,
  onDeleteNotebook,
  onExportNotebook,
  onImportNotebook,
  onToggleFavorite,
}) => {
  const [sidebarTab, setSidebarTab] = useState<'documents' | 'favorites' | 'shared' | 'store'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showBottomBanner, setShowBottomBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('osnotes_hide_recent_banner') !== 'true';
    } catch {
      return true;
    }
  });

  // New Notebook Form State
  const [newTitle, setNewTitle] = useState('Sin título (borrador)');
  const [newColor, setNewColor] = useState('#f8fafc');
  const [newTemplate, setNewTemplate] = useState<PageTemplate>('grid');
  const newStyle = 'minimal';
  const newTheme: PaperTheme = 'white';

  // Filter notebooks based on tab & search
  const filteredNotebooks = notebooks.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (sidebarTab === 'favorites') {
      return !!n.isFavorite;
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateNotebook(
      newTitle.trim() || 'Sin título (borrador)',
      { color: newColor, style: newStyle },
      newTemplate,
      newTheme
    );
    setIsCreateModalOpen(false);
    setNewTitle('Sin título (borrador)');
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'hoy, hace unos momentos';
    if (hours < 24) return `hoy, ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDismissBanner = (permanent: boolean) => {
    setShowBottomBanner(false);
    if (permanent) {
      try {
        localStorage.setItem('osnotes_hide_recent_banner', 'true');
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="flex w-full h-full bg-[#f8fafc] text-slate-800 overflow-hidden select-none font-sans">
      {/* Goodnotes Clean Left Navigation Sidebar */}
      <aside className="w-56 bg-[#f1f5f9] border-r border-slate-200/90 flex flex-col justify-between py-3 px-3">
        <div>
          {/* macOS traffic light window controls */}
          <div className="flex items-center space-x-2 px-3 py-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
          </div>

          {/* App Logo */}
          <div className="px-3 mb-6">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center space-x-1.5">
              <span>Goodnotes</span>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                OS
              </span>
            </h1>
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setSidebarTab('documents')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                sidebarTab === 'documents'
                  ? 'bg-[#dbeafe] text-[#1d4ed8] font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Folder className={`w-4 h-4 ${sidebarTab === 'documents' ? 'fill-current text-[#2563eb]' : ''}`} />
              <span>Documentos</span>
            </button>

            <button
              onClick={() => setSidebarTab('favorites')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                sidebarTab === 'favorites'
                  ? 'bg-[#dbeafe] text-[#1d4ed8] font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Star className={`w-4 h-4 ${sidebarTab === 'favorites' ? 'fill-current text-amber-500' : ''}`} />
              <span>Favoritos</span>
            </button>

            <button
              onClick={() => setSidebarTab('shared')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                sidebarTab === 'shared'
                  ? 'bg-[#dbeafe] text-[#1d4ed8] font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Compartido</span>
            </button>

            <button
              onClick={() => setSidebarTab('store')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                sidebarTab === 'store'
                  ? 'bg-[#dbeafe] text-[#1d4ed8] font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Tienda</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Plan Pill */}
        <div className="px-2 py-3 border-t border-slate-200/70">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium text-slate-700">OS Notes Pro</span>
            <span className="ml-auto text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              Activo
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {sidebarTab === 'documents' && 'Documentos'}
              {sidebarTab === 'favorites' && 'Favoritos'}
              {sidebarTab === 'shared' && 'Compartido'}
              {sidebarTab === 'store' && 'Tienda de Plantillas'}
            </h2>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md cursor-pointer flex items-center space-x-1">
              <span>Todo</span>
              <span className="text-[10px]">▼</span>
            </div>
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 pr-4 py-1.5 bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none w-48 transition"
              />
            </div>

            {/* Import Button */}
            <label
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer transition"
              title="Importar archivo .osnotes o .gnote"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".osnotes,.gnote,.zip" onChange={onImportNotebook} className="hidden" />
            </label>

            {/* Cloud Sync Status */}
            <button className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Sincronización local activa">
              <Cloud className="w-4 h-4 text-sky-600" />
            </button>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500'}`}
                title="Vista de cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500'}`}
                title="Vista de lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary "+ Nuevo" Goodnotes Blue Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo</span>
            </button>

            {/* Profile Avatar */}
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              JG
            </div>
          </div>
        </header>

        {/* Notebooks Grid / Canvas Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 relative">
          {filteredNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Book className="w-16 h-16 text-slate-300 mb-3 stroke-[1]" />
              <h3 className="text-base font-semibold text-slate-700">No hay documentos en esta sección</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                Crea un nuevo cuaderno para empezar a tomar notas, dibujar o importar tus archivos.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Cuaderno</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
              {filteredNotebooks.map((nb) => (
                <div
                  key={nb.id}
                  onClick={() => onOpenNotebook(nb.id)}
                  className="group relative flex flex-col cursor-pointer select-none"
                >
                  {/* Goodnotes Style Notebook Thumbnail Card */}
                  <div className="relative aspect-[3/4] rounded-lg shadow-sm border border-slate-200 group-hover:border-blue-400 group-hover:shadow-md transition-all duration-150 overflow-hidden bg-[#faf8f5]">
                    {/* Simulated Graph / Paper Grid lines */}
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage: `linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)`,
                        backgroundSize: '16px 16px',
                      }}
                    />

                    {/* Left Spine / Binding Tape */}
                    <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-slate-300/60 border-r border-slate-300" />

                    {/* Bookmark Star Ribbon on Top Right */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleFavorite) onToggleFavorite(nb.id);
                      }}
                      className={`absolute top-2 right-2 p-1 rounded transition ${
                        nb.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                      }`}
                      title={nb.isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
                    >
                      <Star className={`w-4 h-4 ${nb.isFavorite ? 'fill-current' : ''}`} />
                    </button>

                    {/* Subtle page illustration strokes */}
                    <div className="absolute inset-x-6 top-8 bottom-6 flex flex-col justify-center items-center pointer-events-none opacity-40">
                      <svg viewBox="0 0 100 100" className="w-16 h-16 text-slate-500 stroke-current fill-none stroke-[1.5]">
                        <rect x="25" y="20" width="40" height="40" fill="#e2e8f0" fillOpacity="0.4" />
                        <line x1="15" y1="45" x2="65" y2="25" />
                        <line x1="30" y1="75" x2="50" y2="55" />
                        <line x1="50" y1="55" x2="65" y2="70" />
                      </svg>
                    </div>

                    {/* Page count pill */}
                    <div className="absolute bottom-2 left-4 text-[10px] font-medium text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                      {nb.pageCount} {nb.pageCount === 1 ? 'pág' : 'págs'}
                    </div>
                  </div>

                  {/* Notebook Title & Timestamp */}
                  <div className="flex items-start justify-between mt-2 px-0.5">
                    <div className="truncate flex-1">
                      <h4 className="font-semibold text-xs text-slate-800 truncate group-hover:text-blue-600 transition">
                        {nb.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatRelativeTime(nb.updatedAt)}</p>
                    </div>

                    {/* 3-dots context menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === nb.id ? null : nb.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === nb.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs text-slate-700 animate-in fade-in"
                        >
                          <button
                            onClick={() => {
                              onOpenNotebook(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-slate-50 text-left"
                          >
                            <Folder className="w-3.5 h-3.5 text-blue-600" />
                            <span>Abrir</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onToggleFavorite) onToggleFavorite(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-slate-50 text-left"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>{nb.isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}</span>
                          </button>
                          <button
                            onClick={() => {
                              onDuplicateNotebook(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-slate-50 text-left"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Duplicar</span>
                          </button>
                          <button
                            onClick={() => {
                              onExportNotebook(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-slate-50 text-left"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Exportar (.osnotes)</span>
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={() => {
                              onDeleteNotebook(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 text-left"
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

          {/* Bottom Floating Toast Banner (Exact copy from Goodnotes Screenshot 1) */}
          {showBottomBanner && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-white border border-slate-200 shadow-xl rounded-2xl px-5 py-3 max-w-lg w-full flex items-center justify-between space-x-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-slate-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Accede al último documento abierto</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Después de reiniciar Goodnotes, puedes volver rápidamente al último documento desde la biblioteca o abrir cualquiera con un solo clic.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleDismissBanner(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold px-2 py-1"
                >
                  No volver a mostrar
                </button>
                <button
                  onClick={() => handleDismissBanner(false)}
                  className="text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create New Notebook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Crear Nuevo Cuaderno</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Cuaderno</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Apuntes de Física, Ideas..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Plantilla de Papel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['grid', 'ruled', 'dotted', 'cornell', 'blank'] as PageTemplate[]).map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setNewTemplate(tmpl)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center capitalize transition ${
                        newTemplate === tmpl
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Color de Portada</label>
                <div className="flex items-center space-x-2">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        newColor === c ? 'border-blue-500 scale-110 shadow-sm' : 'border-slate-200 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg shadow-sm"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
