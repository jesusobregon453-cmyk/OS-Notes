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
} from './types';
import {
  createDefaultNotebook,
  createNewPage,
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToOsNotesFile,
  importFromOsNotesFile,
} from './engine/document';
import { drawPageTemplate } from './engine/templates';
import { renderStroke } from './engine/inking';
import { AudioSyncEngine } from './engine/audio';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';

export const App: React.FC = () => {
  const [doc, setDoc] = useState<NotebookDocument>(() => {
    return loadFromLocalStorage() || createDefaultNotebook('Mi Cuaderno OS Notes');
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [currentTool, setCurrentTool] = useState<ToolType>('fountain');
  const [currentColor, setCurrentColor] = useState<string>('#0f172a');
  const [currentWidth, setCurrentWidth] = useState<number>(2.5);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1.0, offsetX: 0, offsetY: 0 });

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

  // Undo / Redo history per page
  const undoStackRef = useRef<Stroke[][]>([]);
  const redoStackRef = useRef<Stroke[][]>([]);
  const [, setHistoryVersion] = useState(0);

  const currentPage = doc.pages[currentPageIndex] || doc.pages[0];

  // Auto-save to localStorage
  useEffect(() => {
    saveToLocalStorage(doc);
  }, [doc]);

  // Adjust ink color default when switching to dark themes
  useEffect(() => {
    if ((currentPage.theme === 'dark' || currentPage.theme === 'chalkboard') && currentColor === '#0f172a') {
      setCurrentColor('#f8fafc'); // Invert to crisp white
    } else if (currentPage.theme === 'white' && currentColor === '#f8fafc') {
      setCurrentColor('#0f172a'); // Invert back to black
    }
  }, [currentPage.theme, currentColor]);

  // Handle Page Stroke Updates
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

  // Undo
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

  // Redo
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
      } else if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('pen');
      } else if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('highlighter');
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
  }, [handleUndo, handleRedo]);

  // Page Controls
  const handleAddPage = () => {
    const newPage = createNewPage(doc.pages.length + 1, currentPage.template, currentPage.theme);
    setDoc((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));
    setCurrentPageIndex(doc.pages.length);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
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

  // Add Sticky Note
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
    setCurrentTool('fountain'); // Revert to pen after dropping note
  };

  // Audio Sync Actions
  const handleStartAudio = async () => {
    if (audioEngineRef.current) {
      await audioEngineRef.current.startRecording();
    }
  };

  const handleStopAudio = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stopRecording();
    }
  };

  const handlePlayAudio = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.playAudio();
    }
  };

  const handlePauseAudio = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.pauseAudio();
    }
  };

  // Export to .osnotes file
  const handleExport = async () => {
    const blob = await exportToOsNotesFile(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_') || 'cuaderno'}.osnotes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export current page to crisp PNG
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

  // Import from .osnotes file
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedDoc = await importFromOsNotesFile(file);
      setDoc(importedDoc);
      setCurrentPageIndex(0);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    } catch (err) {
      alert(`Error al abrir archivo: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <Toolbar
        title={doc.title}
        onTitleChange={(title) => setDoc((prev) => ({ ...prev, title }))}
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
        onAddPage={handleAddPage}
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
        onImport={handleImport}
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
          onPageUpdate={handlePageUpdate}
          onViewportChange={setViewport}
          onAddStickyNoteAt={handleAddStickyNoteAt}
        />
      </main>
    </div>
  );
};

export default App;
