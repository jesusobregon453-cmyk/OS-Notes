import JSZip from 'jszip';
import type { NotebookDocument, Page, PageTemplate, PaperTheme, CanvasMode } from '../types';

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

export function createNewPage(
  pageNumber: number,
  template: PageTemplate = 'ruled',
  theme: PaperTheme = 'white'
): Page {
  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pageNumber,
    width: A4_WIDTH,
    height: A4_HEIGHT,
    template,
    theme,
    strokes: [],
    stickyNotes: [],
  };
}

export function createDefaultNotebook(title: string = 'Mi Cuaderno OS Notes'): NotebookDocument {
  const firstPage = createNewPage(1, 'ruled', 'white');
  return {
    id: `osnotes-${Date.now()}`,
    title,
    canvasMode: 'paged',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: [firstPage],
  };
}

const STORAGE_KEY = 'os_notes_current_document';

export function saveToLocalStorage(doc: NotebookDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch (e) {
    console.error('Error saving document to localStorage:', e);
  }
}

export function loadFromLocalStorage(): NotebookDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NotebookDocument;
  } catch (e) {
    console.error('Error reading document from localStorage:', e);
    return null;
  }
}

/**
 * Packages the document into an .osnotes / .gnote ZIP container
 */
export async function exportToOsNotesFile(doc: NotebookDocument): Promise<Blob> {
  const zip = new JSZip();

  const manifest = {
    application: 'OS Notes Pro',
    formatVersion: '2.0',
    id: doc.id,
    title: doc.title,
    canvasMode: doc.canvasMode || 'paged',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    pageCount: doc.pages.length,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const pagesFolder = zip.folder('pages');
  if (pagesFolder) {
    doc.pages.forEach((page, idx) => {
      pagesFolder.file(`page_${idx + 1}.json`, JSON.stringify(page, null, 2));
    });
  }

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Loads an .osnotes or .gnote ZIP file back into a NotebookDocument
 */
export async function importFromOsNotesFile(file: File): Promise<NotebookDocument> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Archivo inválido: falta manifest.json');
  }

  const manifest = JSON.parse(await manifestFile.async('string'));
  const pages: Page[] = [];

  for (let i = 1; i <= manifest.pageCount; i++) {
    const pageFile = zip.file(`pages/page_${i}.json`);
    if (pageFile) {
      const pageData = JSON.parse(await pageFile.async('string')) as Page;
      pages.push({
        ...pageData,
        theme: pageData.theme || 'white',
        stickyNotes: pageData.stickyNotes || [],
      });
    }
  }

  return {
    id: manifest.id,
    title: manifest.title,
    canvasMode: (manifest.canvasMode as CanvasMode) || 'paged',
    createdAt: manifest.createdAt,
    updatedAt: Date.now(),
    pages: pages.length > 0 ? pages : [createNewPage(1, 'ruled', 'white')],
  };
}
