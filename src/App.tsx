import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NotebookDocument, Page, ToolType, PageTemplate, ViewportState, Stroke } from './types';
import {
  createDefaultNotebook,
  createNewPage,
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToGnoteFile,
  importFromGnoteFile,
} from './engine/document';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';

export const App: React.FC = () => {
  const [doc, setDoc] = useState<NotebookDocument>(() => {
    return loadFromLocalStorage() || createDefaultNotebook('Mi Primer Cuaderno');
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [currentTool, setCurrentTool] = useState<ToolType>('fountain');
  const [currentColor, setCurrentColor] = useState<string>('#0f172a');
  const [currentWidth, setCurrentWidth] = useState<number>(2.5);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1.0, offsetX: 0, offsetY: 0 });

  // Undo / Redo history per page
  const undoStackRef = useRef<Stroke[][]>([]);
  const redoStackRef = useRef<Stroke[][]>([]);
  const [, setHistoryVersion] = useState(0);

  const currentPage = doc.pages[currentPageIndex] || doc.pages[0];

  // Save to localStorage automatically
  useEffect(() => {
    saveToLocalStorage(doc);
  }, [doc]);

  // Handle Page Stroke Updates (Drawing, Erasing)
  const handlePageUpdate = useCallback(
    (updatedPage: Page) => {
      // Push current strokes to undo stack
      undoStackRef.current.push([...currentPage.strokes]);
      redoStackRef.current = []; // Clear redo on new action
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

  // Keyboard Shortcuts (Cmd+Z, Cmd+Shift+Z, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'p' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('fountain');
      } else if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('pen');
      } else if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('highlighter');
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
    const newPage = createNewPage(doc.pages.length + 1, currentPage.template);
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

  // Export to .gnote file
  const handleExport = async () => {
    const blob = await exportToGnoteFile(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_') || 'cuaderno'}.gnote`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from .gnote file
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedDoc = await importFromGnoteFile(file);
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
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-900">
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
        canUndo={undoStackRef.current.length > 0}
        canRedo={redoStackRef.current.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        viewport={viewport}
        onViewportChange={setViewport}
        onExport={handleExport}
        onImport={handleImport}
      />

      <main className="flex-1 relative flex overflow-hidden">
        <Canvas
          page={currentPage}
          currentTool={currentTool}
          currentColor={currentColor}
          currentWidth={currentWidth}
          viewport={viewport}
          onPageUpdate={handlePageUpdate}
          onViewportChange={setViewport}
        />
      </main>
    </div>
  );
};

export default App;
