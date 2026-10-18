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
} from './engine/storage';
import { drawPageTemplate } from './engine/templates';
import { renderStroke } from './engine/inking';
import { AudioSyncEngine } from './engine/audio';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { LibraryView } from './components/LibraryView';
import { PageManagerModal } from './components/PageManagerModal';
import { ElementsModal } from './components/ElementsModal';

const USER_ELEMENTS_STORAGE_KEY = 'osnotes_user_saved_elements';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'library' | 'editor'>('library');
  const [notebookSummaries, setNotebookSummaries] = useState<NotebookSummary[]>([]);
  const [doc, setDoc] = useState<NotebookDocument>(() => createDefaultNotebook('Mi Cuaderno OS Notes'));
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [currentTool, setCurrentTool] = useState<ToolType>('fountain');
  const [currentColor, setCurrentColor] = useState<string>('#0f172a');
  const [currentWidth, setCurrentWidth] = useState<number>(2.5);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1.0, offsetX: 0, offsetY: 0 });
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isPageManagerOpen, setIsPageManagerOpen] = useState<boolean>(false);
  const [isElementsModalOpen, setIsElementsModalOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

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
      if (summaries.length === 0) {
        const defaultDoc = createDefaultNotebook('Primer Cuaderno');
        await saveNotebookToDB(defaultDoc);
        const updated = await getAllNotebookSummaries();
        setNotebookSummaries(updated);
        setDoc(defaultDoc);
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

  const currentPage = doc.pages[currentPageIndex] || doc.pages[0];

  // Auto-save notebook changes to IndexedDB
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!doc.id) return;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveNotebookToDB(doc);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save notebook to IndexedDB:', err);
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [doc]);

  // Handle ink color default on theme change
  useEffect(() => {
    if ((currentPage.theme === 'dark' || currentPage.theme === 'chalkboard') && currentColor === '#0f172a') {
      setCurrentColor('#f8fafc');
    } else if (currentPage.theme === 'white' && currentColor === '#f8fafc') {
      setCurrentColor('#0f172a');
    }
  }, [currentPage.theme, currentColor]);

  // Page Stroke Updates
  const handlePageUpdate = useCallback(
    (updatedPage: Page) => {
      undoStackRef.current.push([...currentPage.strokes]);
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);

      setDoc((prevDoc) => {
        const nextPages = [...prevDoc.pages];
        nextPages[currentPageIndex] = updatedPage;
        return {
          ...prevDoc,
          updatedAt: Date.now(),
          pages: nextPages,
        };
      });
    },
    [currentPage.strokes, currentPageIndex]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previousStrokes = undoStackRef.current.pop()!;
    redoStackRef.current.push([...currentPage.strokes]);
    setHistoryVersion((v) => v + 1);

    setDoc((prevDoc) => {
      const nextPages = [...prevDoc.pages];
      nextPages[currentPageIndex] = {
        ...currentPage,
        strokes: previousStrokes,
      };
      return { ...prevDoc, pages: nextPages };
    });
  }, [currentPage, currentPageIndex]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const nextStrokes = redoStackRef.current.pop()!;
    undoStackRef.current.push([...currentPage.strokes]);
    setHistoryVersion((v) => v + 1);

    setDoc((prevDoc) => {
      const nextPages = [...prevDoc.pages];
      nextPages[currentPageIndex] = {
        ...currentPage,
        strokes: nextStrokes,
      };
      return { ...prevDoc, pages: nextPages };
    });
  }, [currentPage, currentPageIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (viewMode !== 'editor') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'p' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('fountain');
      } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('calligraphy');
      } else if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('pen');
      } else if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('pencil');
      } else if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('highlighter');
      } else if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('tape');
      } else if (e.key === 'x' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('text');
      } else if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('shape');
      } else if (e.key === 'l' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('lasso');
      } else if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('eraser');
      } else if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('pan');
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
    await saveNotebookToDB(doc);
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

  // Bookmark & Outline
  const handleToggleBookmark = () => {
    const isNowBookmarked = !currentPage.isBookmarked;
    handlePageUpdate({ ...currentPage, isBookmarked: isNowBookmarked });
  };

  const handleToggleBookmarkAtIndex = (index: number) => {
    const target = doc.pages[index];
    const updated = { ...target, isBookmarked: !target.isBookmarked };
    const nextPages = [...doc.pages];
    nextPages[index] = updated;
    setDoc((prev) => ({ ...prev, pages: nextPages }));
  };

  const handleUpdateOutlineTitle = (index: number, title: string) => {
    const target = doc.pages[index];
    const updated = { ...target, outlineTitle: title };
    const nextPages = [...doc.pages];
    nextPages[index] = updated;
    setDoc((prev) => ({ ...prev, pages: nextPages }));
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
    // Stamp the element in the center of the page with unique IDs
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
    template: PageTemplate = currentPage.template,
    theme: PaperTheme = currentPage.theme
  ) => {
    const newPage = createNewPage(doc.pages.length + 1, template, theme);
    setDoc((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));
    setCurrentPageIndex(doc.pages.length);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  };

  const handleDuplicatePage = (index: number) => {
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
    setDoc((prev) => ({ ...prev, pages: nextPages }));
    setCurrentPageIndex(index + 1);
  };

  const handleDeletePage = (index: number) => {
    if (doc.pages.length <= 1) return;
    const nextPages = doc.pages.filter((_, idx) => idx !== index);
    setDoc((prev) => ({ ...prev, pages: nextPages }));
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
    if (currentPageIndex < doc.pages.length - 1) {
      setCurrentPageIndex((idx) => idx + 1);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }
  };

  const handleSelectTemplate = (template: PageTemplate) => {
    setDoc((prev) => {
      const nextPages = [...prev.pages];
      nextPages[currentPageIndex] = {
        ...nextPages[currentPageIndex],
        template,
      };
      return { ...prev, pages: nextPages };
    });
  };

  const handleSelectTheme = (theme: PaperTheme) => {
    setDoc((prev) => {
      const nextPages = [...prev.pages];
      nextPages[currentPageIndex] = {
        ...nextPages[currentPageIndex],
        theme,
      };
      return { ...prev, pages: nextPages };
    });
  };

  const handleAddStickyNoteAt = (x: number, y: number) => {
    const newNote = {
      id: `sticky-${Date.now()}`,
      x: Math.max(10, x - 100),
      y: Math.max(10, y - 50),
      width: 200,
      height: 120,
      text: '',
      color: '#fef08a',
    };
    const notes = [...(currentPage.stickyNotes || []), newNote];
    handlePageUpdate({ ...currentPage, stickyNotes: notes });
    setCurrentTool('fountain');
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
    const blob = await exportToOsNotesFile(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_') || 'cuaderno'}.osnotes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportImage = () => {
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
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {viewMode === 'library' ? (
        <LibraryView
          notebooks={notebookSummaries}
          onOpenNotebook={handleOpenNotebook}
          onCreateNotebook={handleCreateNotebook}
          onDuplicateNotebook={handleDuplicateNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          onExportNotebook={handleExportNotebookById}
          onImportNotebook={handleImport}
        />
      ) : (
        <>
          <Toolbar
            title={doc.title}
            onTitleChange={(title) => setDoc((prev) => ({ ...prev, title }))}
            onBackToLibrary={handleBackToLibrary}
            onOpenPageManager={() => setIsPageManagerOpen(true)}
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
            canvasMode={doc.canvasMode || 'paged'}
            onToggleCanvasMode={() =>
              setDoc((prev) => ({
                ...prev,
                canvasMode: prev.canvasMode === 'paged' ? 'infinite' : 'paged',
              }))
            }
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
            saveStatus={saveStatus}
          />

          <main className="flex-1 relative flex overflow-hidden">
            <Canvas
              page={currentPage}
              currentTool={currentTool}
              currentColor={currentColor}
              currentWidth={currentWidth}
              viewport={viewport}
              isAudioRecording={audioState.isRecording}
              audioElapsed={audioState.duration}
              isReadOnly={isReadOnly}
              onPageUpdate={handlePageUpdate}
              onViewportChange={setViewport}
              onAddStickyNoteAt={handleAddStickyNoteAt}
              onSaveSelectionAsElement={handleSaveSelectionAsElement}
            />
          </main>

          {/* Page Manager Modal with Bookmarks & Outline */}
          <PageManagerModal
            pages={doc.pages}
            currentPageIndex={currentPageIndex}
            isOpen={isPageManagerOpen}
            onClose={() => setIsPageManagerOpen(false)}
            onSelectPage={(idx) => setCurrentPageIndex(idx)}
            onAddPage={(template, theme) => handleAddPage(template, theme)}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={handleDeletePage}
            onToggleBookmark={handleToggleBookmarkAtIndex}
            onUpdateOutlineTitle={handleUpdateOutlineTitle}
          />

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
