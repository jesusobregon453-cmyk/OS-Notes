import type { NotebookDocument, Page, NotebookSummary } from '../types';

const DB_NAME = 'OSNotesDB';
const DB_VERSION = 1;
const STORE_NOTEBOOKS = 'notebooks';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NOTEBOOKS)) {
        const store = db.createObjectStore(STORE_NOTEBOOKS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns summaries of all notebooks for fast library display
 */
export async function getAllNotebookSummaries(): Promise<NotebookSummary[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readonly');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    const request = store.getAll();

    request.onsuccess = () => {
      const list = (request.result as NotebookDocument[]) || [];
      const summaries: NotebookSummary[] = list.map((doc) => ({
        id: doc.id,
        title: doc.title,
        coverColor: doc.cover?.color || '#3b82f6',
        coverStyle: doc.cover?.style || 'minimal',
        pageCount: doc.pages.length,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        isFavorite: !!doc.isFavorite,
      }));
      // Sort newest first
      summaries.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(summaries);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Toggles the favorite status of a notebook
 */
export async function toggleNotebookFavoriteInDB(id: string): Promise<boolean> {
  const doc = await loadNotebookById(id);
  if (!doc) return false;
  doc.isFavorite = !doc.isFavorite;
  await saveNotebookToDB(doc);
  return doc.isFavorite;
}

/**
 * Loads a full notebook by ID
 */
export async function loadNotebookById(id: string): Promise<NotebookDocument | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readonly');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    const request = store.get(id);

    request.onsuccess = () => resolve((request.result as NotebookDocument) || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates a notebook in IndexedDB
 */
export async function saveNotebookToDB(doc: NotebookDocument): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    const request = store.put({
      ...doc,
      updatedAt: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a notebook by ID
 */
export async function deleteNotebookFromDB(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Duplicates a notebook with a new ID and title
 */
export async function duplicateNotebookInDB(id: string): Promise<NotebookDocument> {
  const original = await loadNotebookById(id);
  if (!original) throw new Error('Cuaderno original no encontrado');

  const cloned: NotebookDocument = {
    ...original,
    id: `osnotes-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `${original.title} (Copia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: original.pages.map((p: Page, idx: number) => ({
      ...p,
      id: `page-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      strokes: JSON.parse(JSON.stringify(p.strokes)),
    })),
  };

  await saveNotebookToDB(cloned);
  return cloned;
}
