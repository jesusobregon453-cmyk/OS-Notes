import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  NotebookDocument,
  Page,
  ToolType,
  PageTemplate,
  PaperTheme,
  ViewportState,
  Stroke,
  AudioRecordingState,
  NotebookCover,
  NotebookSummary,
  SavedElement,
  EraserMode,
  LaserMode,
  ShapeKind,
  TextOptions,
} from './types';
import {
  createDefaultNotebook,
  createNewPage,
  exportToOsNotesFile,
  importFromOsNotesFile,
} from './engine/document';
import {
  getAllNotebookSummaries,
  loadNotebookById,
  saveNotebookToDB,
  deleteNotebookFromDB,
  duplicateNotebookInDB,
  toggleNotebookFavoriteInDB,
} from './engine/storage';
import { drawPageTemplate } from './engine/templates';
import { renderStroke } from './engine/inking';
import { AudioSyncEngine } from './engine/audio';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { LibraryView } from './components/LibraryView';
import { PagesSidebar } from './components/PagesSidebar';
import { ElementsModal } from './components/ElementsModal';

const USER_ELEMENTS_STORAGE_KEY = 'osnotes_user_saved_elements';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'library' | 'editor'>('library');
  const [notebookSummaries, setNotebookSummaries] = useState<NotebookSummary[]>([]);
  // doc is NULL initially so no automatic notebook is created on open/reload
  const [doc, setDoc] = useState<NotebookDocument | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [currentTool, setCurrentTool] = useState<ToolType>('fountain');
  const [currentColor, setCurrentColor] = useState<string>('#0f172a');
  const [currentWidth, setCurrentWidth] = useState<number>(2.5);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1.0, offsetX: 0, offsetY: 0 });
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isPagesSidebarOpen, setIsPagesSidebarOpen] = useState<boolean>(false);
  const [isElementsModalOpen, setIsElementsModalOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Subcontrols States
  const [eraserMode, setEraserMode] = useState<EraserMode>('standard');
  const [eraseHighlighterOnly, setEraseHighlighterOnly] = useState<boolean>(false);
  const [shapeFill, setShapeFill] = useState<boolean>(false);
  const [selectedShape, setSelectedShape] = useState<ShapeKind>('auto');
  const [laserMode, setLaserMode] = useState<LaserMode>('trail');
  const [textOptions, setTextOptions] = useState<TextOptions>({
    fontSize: 24,
    fontFamily: 'Moderna',
    isBold: false,
    isItalic: false,
  });

  // User Saved Elements / Stickers
  const [savedElements, setSavedElements] = useState<SavedElement[]>(() => {
    try {
      const raw = localStorage.getItem(USER_ELEMENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveElementsToStorage = (elements: SavedElement[]) => {
    setSavedElements(elements);
    try {
      localStorage.setItem(USER_ELEMENTS_STORAGE_KEY, JSON.stringify(elements));
    } catch (e) {
      console.error('Error saving elements:', e);
    }
  };

  // Audio Sync State
  const [audioState, setAudioState] = useState<AudioRecordingState>({
    isRecording: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
  });

  const audioEngineRef = useRef<AudioSyncEngine | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioSyncEngine((state) => {
      setAudioState(state);
    });
  }, []);

  // Undo / Redo history
  const undoStackRef = useRef<Stroke[][]>([]);
  const redoStackRef = useRef<Stroke[][]>([]);
  const [, setHistoryVersion] = useState(0);

  // Initialize Library from IndexedDB
  const refreshLibrary = useCallback(async () => {
    try {
      const summaries = await getAllNotebookSummaries();
      // Only create an initial notebook if the database has 0 items ever
      if (summaries.length === 0) {
        const defaultDoc = createDefaultNotebook('Sin título (borrador)');
        await saveNotebookToDB(defaultDoc);
        const updated = await getAllNotebookSummaries();
        setNotebookSummaries(updated);
      } else {
        setNotebookSummaries(summaries);
      }
    } catch (err) {
      console.error('Error accessing IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const currentPage = doc && doc.pages ? doc.pages[currentPageIndex] || doc.pages[0] : null;

  // Auto-save notebook changes ONLY when editing an active document
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!doc || !doc.id || viewMode !== 'editor') return;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveNotebookToDB(doc);
        setSaveStatus('saved');
        const summaries = await getAllNotebookSummaries();
        setNotebookSummaries(summaries);
      } catch (err) {
        console.error('Failed to auto-save notebook to IndexedDB:', err);
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [doc, viewMode]);

  // Handle ink color default on theme change
  useEffect(() => {
    if (!currentPage) return;
    if ((currentPage.theme === 'dark' || currentPage.theme === 'chalkboard') && currentColor === '#0f172a') {
      setCurrentColor('#f8fafc');
    } else if (currentPage.theme === 'white' && currentColor === '#f8fafc') {
      setCurrentColor('#0f172a');
    }
  }, [currentPage?.theme, currentColor]);

  // Page Stroke Updates
  const handlePageUpdate = useCallback(
    (updatedPage: Page) => {
      if (!currentPage || !doc) return;
      undoStackRef.current.push([...currentPage.strokes]);
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);

      setDoc((prevDoc) => {
        if (!prevDoc) return null;
        const nextPages = [...prevDoc.pages];
        nextPages[currentPageIndex] = updatedPage;
        return {
          ...prevDoc,
          updatedAt: Date.now(),
          pages: nextPages,
        };
      });
    },
    [currentPage, currentPageIndex, doc]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (!currentPage || !doc || undoStackRef.current.length === 0) return;
    const previousStrokes = undoStackRef.current.pop()!;
    redoStackRef.current.push([...currentPage.strokes]);
    setHistoryVersion((v) => v + 1);

    setDoc((prevDoc) => {
      if (!prevDoc) return null;
      const nextPages = [...prevDoc.pages];
      nextPages[currentPageIndex] = {
        ...currentPage,
        strokes: previousStrokes,
      };
      return { ...prevDoc, pages: nextPages };
    });
  }, [currentPage, currentPageIndex, doc]);

  const handleRedo = useCallback(() => {
    if (!currentPage || !doc || redoStackRef.current.length === 0) return;
    const nextStrokes = redoStackRef.current.pop()!;
    undoStackRef.current.push([...currentPage.strokes]);
    setHistoryVersion((v) => v + 1);

    setDoc((prevDoc) => {
      if (!prevDoc) return null;
      const nextPages = [...prevDoc.pages];
      nextPages[currentPageIndex] = {
        ...currentPage,
        strokes: nextStrokes,
      };
      return { ...prevDoc, pages: nextPages };
    });
  }, [currentPage, currentPageIndex, doc]);

  // Keyboard Shortcuts (matching Goodnotes: W=Pen, E=Eraser, V=Lasso, S=Shapes, T=Text, M=Elements, N=Note)
  useEffect(() => {
    if (viewMode !== 'editor') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'w' || e.key === 'p') {
        setCurrentTool('fountain');
      } else if (e.key === 'e') {
        setCurrentTool('eraser');
      } else if (e.key === 'v' || e.key === 'l') {
        setCurrentTool('lasso');
      } else if (e.key === 's') {
        setCurrentTool('shape');
      } else if (e.key === 't') {
        setCurrentTool('text');
      } else if (e.key === 'n') {
        setCurrentTool('sticky');
      } else if (e.key === 'm') {
        setIsElementsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleUndo, handleRedo]);

  // Library Actions
  const handleOpenNotebook = async (id: string) => {
    const loaded = await loadNotebookById(id);
    if (loaded) {
      setDoc(loaded);
      setCurrentPageIndex(0);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setViewMode('editor');
    }
  };

  const handleBackToLibrary = async () => {
    if (doc) {
      await saveNotebookToDB(doc);
    }
    await refreshLibrary();
    setViewMode('library');
  };

  const handleCreateNotebook = async (
    title: string,
    cover: NotebookCover,
    template: PageTemplate,
    theme: PaperTheme
  ) => {
    const newDoc: NotebookDocument = {
      id: `osnotes-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      cover,
      canvasMode: 'paged',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pages: [createNewPage(1, template, theme)],
    };

    await saveNotebookToDB(newDoc);
    setDoc(newDoc);
    setCurrentPageIndex(0);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setViewMode('editor');
    await refreshLibrary();
  };

  const handleDuplicateNotebook = async (id: string) => {
    await duplicateNotebookInDB(id);
    await refreshLibrary();
  };

  const handleDeleteNotebook = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cuaderno?')) {
      await deleteNotebookFromDB(id);
      await refreshLibrary();
    }
  };

  const handleToggleFavoriteNotebook = async (id: string) => {
    await toggleNotebookFavoriteInDB(id);
    await refreshLibrary();
  };

  // Bookmark & Outline
  const handleToggleBookmark = () => {
    if (!currentPage) return;
    const isNowBookmarked = !currentPage.isBookmarked;
    handlePageUpdate({ ...currentPage, isBookmarked: isNowBookmarked });
  };

  const handleToggleBookmarkAtIndex = (index: number) => {
    if (!doc) return;
    const target = doc.pages[index];
    const updated = { ...target, isBookmarked: !target.isBookmarked };
    const nextPages = [...doc.pages];
    nextPages[index] = updated;
    setDoc((prev) => (prev ? { ...prev, pages: nextPages } : null));
  };

  const handleUpdateOutlineTitle = (index: number, title: string) => {
    if (!doc) return;
    const target = doc.pages[index];
    const updated = { ...target, outlineTitle: title };
    const nextPages = [...doc.pages];
    nextPages[index] = updated;
    setDoc((prev) => (prev ? { ...prev, pages: nextPages } : null));
  };

  // Elements: Save selection as reusable element
  const handleSaveSelectionAsElement = (selectedStrokes: Stroke[]) => {
    const name = prompt('Nombre para este nuevo Elemento / Sello:') || 'Mi Elemento';
    const newElement: SavedElement = {
      id: `elem-${Date.now()}`,
      title: name,
      category: 'Mis Elementos Guardados',
      strokes: JSON.parse(JSON.stringify(selectedStrokes)),
    };
    saveElementsToStorage([...savedElements, newElement]);
    alert(`¡"${name}" guardado en tu colección de Elementos!`);
  };

  // Elements: Insert element onto current page
  const handleInsertElement = (element: SavedElement) => {
    if (!currentPage) return;
    const clonedStrokes: Stroke[] = element.strokes.map((s, idx) => ({
      ...s,
      id: `element-stroke-${Date.now()}-${idx}`,
      points: s.points.map((p) => ({ ...p, x: p.x + 200, y: p.y + 200 })),
    }));
    handlePageUpdate({
      ...currentPage,
      strokes: [...currentPage.strokes, ...clonedStrokes],
    });
  };

  // Page Controls
  const handleAddPage = (
    template: PageTemplate = currentPage?.template || 'grid',
    theme: PaperTheme = currentPage?.theme || 'white'
  ) => {
    if (!doc) return;
    const newPage = createNewPage(doc.pages.length + 1, template, theme);
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            pages: [...prev.pages, newPage],
          }
        : null
    );
    setCurrentPageIndex(doc.pages.length);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  };

  const handleDuplicatePage = (index: number) => {
    if (!doc) return;
    const target = doc.pages[index];
    const clone: Page = {
      ...target,
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pageNumber: doc.pages.length + 1,
      strokes: JSON.parse(JSON.stringify(target.strokes)),
      tapes: JSON.parse(JSON.stringify(target.tapes || [])),
      textBoxes: JSON.parse(JSON.stringify(target.textBoxes || [])),
      stickyNotes: JSON.parse(JSON.stringify(target.stickyNotes || [])),
    };
    const nextPages = [...doc.pages];
    nextPages.splice(index + 1, 0, clone);
    setDoc((prev) => (prev ? { ...prev, pages: nextPages } : null));
    setCurrentPageIndex(index + 1);
  };

  const handleDeletePage = (index: number) => {
    if (!doc || doc.pages.length <= 1) return;
    const nextPages = doc.pages.filter((_, idx) => idx !== index);
    setDoc((prev) => (prev ? { ...prev, pages: nextPages } : null));
    setCurrentPageIndex(Math.max(0, index - 1));
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((idx) => idx - 1);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }
  };

  const handleNextPage = () => {
    if (doc && currentPageIndex < doc.pages.length - 1) {
      setCurrentPageIndex((idx) => idx + 1);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }
  };

  const handleSelectTemplate = (template: PageTemplate) => {
    if (!doc) return;
    setDoc((prev) => {
      if (!prev) return null;
      const nextPages = [...prev.pages];
      nextPages[currentPageIndex] = {
        ...nextPages[currentPageIndex],
        template,
      };
      return { ...prev, pages: nextPages };
    });
  };

  const handleSelectTheme = (theme: PaperTheme) => {
    if (!doc) return;
    setDoc((prev) => {
      if (!prev) return null;
      const nextPages = [...prev.pages];
      nextPages[currentPageIndex] = {
        ...nextPages[currentPageIndex],
        theme,
      };
      return { ...prev, pages: nextPages };
    });
  };

  const handleClearPage = () => {
    if (!currentPage) return;
    handlePageUpdate({
      ...currentPage,
      strokes: [],
      tapes: [],
      stickyNotes: [],
      textBoxes: [],
    });
  };

  const handleAddStickyNoteAt = (x: number, y: number, color?: string) => {
    if (!currentPage) return;
    const newNote = {
      id: `sticky-${Date.now()}`,
      x: Math.max(10, x - 100),
      y: Math.max(10, y - 50),
      width: 200,
      height: 120,
      text: '',
      color: color || currentColor || '#fef08a',
    };
    const notes = [...(currentPage.stickyNotes || []), newNote];
    handlePageUpdate({ ...currentPage, stickyNotes: notes });
    setCurrentTool('fountain');
  };

  const handleImageInsert = (dataUrl: string) => {
    if (!currentPage) return;
    const newNote = {
      id: `img-${Date.now()}`,
      x: 100,
      y: 100,
      width: 280,
      height: 200,
      text: dataUrl,
      color: '#ffffff',
    };
    handlePageUpdate({
      ...currentPage,
      stickyNotes: [...(currentPage.stickyNotes || []), newNote],
    });
  };

  // Audio Sync Actions
  const handleStartAudio = async () => {
    if (audioEngineRef.current) await audioEngineRef.current.startRecording();
  };

  const handleStopAudio = () => {
    if (audioEngineRef.current) audioEngineRef.current.stopRecording();
  };

  const handlePlayAudio = () => {
    if (audioEngineRef.current) audioEngineRef.current.playAudio();
  };

  const handlePauseAudio = () => {
    if (audioEngineRef.current) audioEngineRef.current.pauseAudio();
  };

  // Export & Import
  const handleExport = async () => {
    if (!doc) return;
    const blob = await exportToOsNotesFile(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_') || 'cuaderno'}.osnotes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportImage = () => {
    if (!currentPage || !doc) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentPage.width * 2;
    tempCanvas.height = currentPage.height * 2;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    drawPageTemplate(ctx, currentPage.width, currentPage.height, currentPage.template, currentPage.theme);
    for (const stroke of currentPage.strokes) {
      renderStroke(ctx, stroke, 1.0);
    }
    const url = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}_Pagina_${currentPageIndex + 1}.png`;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedDoc = await importFromOsNotesFile(file);
      await saveNotebookToDB(importedDoc);
      setDoc(importedDoc);
      setCurrentPageIndex(0);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setViewMode('editor');
      await refreshLibrary();
    } catch (err) {
      alert(`Error al abrir archivo: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

  const handleExportNotebookById = async (id: string) => {
    const targetDoc = await loadNotebookById(id);
    if (!targetDoc) return;
    const blob = await exportToOsNotesFile(targetDoc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetDoc.title.replace(/\s+/g, '_') || 'cuaderno'}.osnotes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-white font-sans text-slate-800">
      {viewMode === 'library' || !doc || !currentPage ? (
        <LibraryView
          notebooks={notebookSummaries}
          onOpenNotebook={handleOpenNotebook}
          onCreateNotebook={handleCreateNotebook}
          onDuplicateNotebook={handleDuplicateNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          onExportNotebook={handleExportNotebookById}
          onImportNotebook={handleImport}
          onToggleFavorite={handleToggleFavoriteNotebook}
        />
      ) : (
        <>
          {/* Top Royal Blue Header Bar & Floating Sub-toolbar */}
          <Toolbar
            title={doc.title}
            onTitleChange={(title) => setDoc((prev) => (prev ? { ...prev, title } : null))}
            onBackToLibrary={handleBackToLibrary}
            onToggleSidebar={() => setIsPagesSidebarOpen((prev) => !prev)}
            isSidebarOpen={isPagesSidebarOpen}
            onOpenElementsModal={() => setIsElementsModalOpen(true)}
            isBookmarked={!!currentPage.isBookmarked}
            onToggleBookmark={handleToggleBookmark}
            isReadOnly={isReadOnly}
            onToggleReadOnly={() => setIsReadOnly((prev) => !prev)}
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
            currentColor={currentColor}
            onSelectColor={setCurrentColor}
            currentWidth={currentWidth}
            onSelectWidth={setCurrentWidth}
            currentPageIndex={currentPageIndex}
            totalPages={doc.pages.length}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onAddPage={() => handleAddPage(currentPage.template, currentPage.theme)}
            currentTemplate={currentPage.template}
            onSelectTemplate={handleSelectTemplate}
            currentTheme={currentPage.theme || 'white'}
            onSelectTheme={handleSelectTheme}
            audioState={audioState}
            onStartAudioRecording={handleStartAudio}
            onStopAudioRecording={handleStopAudio}
            onPlayAudio={handlePlayAudio}
            onPauseAudio={handlePauseAudio}
            canUndo={undoStackRef.current.length > 0}
            canRedo={redoStackRef.current.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            viewport={viewport}
            onViewportChange={setViewport}
            onExport={handleExport}
            onExportImage={handleExportImage}
            onClearPage={handleClearPage}
            onDuplicatePage={() => handleDuplicatePage(currentPageIndex)}
            onImageInsert={handleImageInsert}
            saveStatus={saveStatus}
            eraserMode={eraserMode}
            onEraserModeChange={setEraserMode}
            eraseHighlighterOnly={eraseHighlighterOnly}
            onEraseHighlighterOnlyChange={setEraseHighlighterOnly}
            shapeFill={shapeFill}
            onShapeFillChange={setShapeFill}
            selectedShape={selectedShape}
            onSelectedShapeChange={setSelectedShape}
            laserMode={laserMode}
            onLaserModeChange={setLaserMode}
            textOptions={textOptions}
            onTextOptionsChange={setTextOptions}
          />

          {/* Main Area: Optional Left Pages Sidebar + Canvas */}
          <main className="flex-1 relative flex overflow-hidden bg-[#e2e8f0]/40">
            {/* Goodnotes Left Pages Sidebar Drawer */}
            <PagesSidebar
              pages={doc.pages}
              currentPageIndex={currentPageIndex}
              isOpen={isPagesSidebarOpen}
              onClose={() => setIsPagesSidebarOpen(false)}
              onSelectPage={(idx) => setCurrentPageIndex(idx)}
              onAddPage={() => handleAddPage(currentPage.template, currentPage.theme)}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              onToggleBookmark={handleToggleBookmarkAtIndex}
              onUpdateOutlineTitle={handleUpdateOutlineTitle}
            />

            {/* Inking Canvas Workspace */}
            <div className="flex-1 relative overflow-hidden flex">
              <Canvas
                page={currentPage}
                currentTool={currentTool}
                currentColor={currentColor}
                currentWidth={currentWidth}
                viewport={viewport}
                isAudioRecording={audioState.isRecording}
                audioElapsed={audioState.duration}
                isReadOnly={isReadOnly}
                eraserMode={eraserMode}
                eraseHighlighterOnly={eraseHighlighterOnly}
                shapeFill={shapeFill}
                selectedShape={selectedShape}
                laserMode={laserMode}
                textOptions={textOptions}
                onPageUpdate={handlePageUpdate}
                onViewportChange={setViewport}
                onAddStickyNoteAt={handleAddStickyNoteAt}
                onSaveSelectionAsElement={handleSaveSelectionAsElement}
              />
            </div>
          </main>

          {/* Elements & Stickers Collection Modal */}
          <ElementsModal
            isOpen={isElementsModalOpen}
            onClose={() => setIsElementsModalOpen(false)}
            savedElements={savedElements}
            onInsertElement={handleInsertElement}
          />
        </>
      )}
    </div>
  );
};

export default App;
