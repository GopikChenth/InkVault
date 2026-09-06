import { LoadedPDF } from '../types';

const DB_NAME = 'inkvault_storage';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const META_CACHE_KEY = 'inkvault_docs_metadata';

interface SerializedDocRecord {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  loadedAt: string;
  pageCount?: number;
  currentPage?: number;
  zoomScale?: number;
  rotation?: number;
  subjectId?: string;
  subjectName?: string;
  folderPath?: string;
  filePath?: string;
  buffer?: ArrayBuffer;
}

export interface DocMetadataRecord {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  loadedAt: string;
  pageCount?: number;
  currentPage?: number;
  zoomScale?: number;
  rotation?: number;
  subjectId?: string;
  subjectName?: string;
  folderPath?: string;
  filePath?: string;
}

/**
 * Synchronously persist lightweight document metadata in localStorage
 * so that folder trees and document lists render in 0ms on initial mount.
 */
export function saveMetadataCache(docs: LoadedPDF[]): void {
  try {
    const metaList: DocMetadataRecord[] = docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      size: doc.size,
      rawSize: doc.rawSize,
      loadedAt: doc.loadedAt instanceof Date ? doc.loadedAt.toISOString() : new Date().toISOString(),
      pageCount: doc.pageCount,
      currentPage: doc.currentPage,
      zoomScale: doc.zoomScale,
      rotation: doc.rotation,
      subjectId: doc.subjectId,
      subjectName: doc.subjectName,
      folderPath: doc.folderPath,
      filePath: doc.filePath,
    }));
    localStorage.setItem(META_CACHE_KEY, JSON.stringify(metaList));
  } catch (err) {
    console.warn('Failed to save metadata cache to localStorage:', err);
  }
}

/**
 * Synchronously load lightweight document metadata from localStorage for instant Frame-0 rendering.
 */
export function loadMetadataCache(): LoadedPDF[] {
  try {
    const json = localStorage.getItem(META_CACHE_KEY);
    if (!json) return [];
    const metaList: DocMetadataRecord[] = JSON.parse(json);
    if (!Array.isArray(metaList)) return [];

    return metaList.map((m) => {
      const dummyBlob = new Blob([], { type: 'application/pdf' });
      const dummyFile = new File([dummyBlob], m.name, { type: 'application/pdf' });
      return {
        id: m.id,
        name: m.name,
        size: m.size,
        rawSize: m.rawSize || 0,
        blobUrl: '', // Hydrated on-demand or by background worker
        file: dummyFile,
        loadedAt: new Date(m.loadedAt),
        pageCount: m.pageCount,
        currentPage: m.currentPage,
        zoomScale: m.zoomScale,
        rotation: m.rotation,
        subjectId: m.subjectId,
        subjectName: m.subjectName,
        folderPath: m.folderPath,
        filePath: m.filePath,
      };
    });
  } catch (err) {
    console.warn('Failed to load metadata cache from localStorage:', err);
    return [];
  }
}

export function removeDocumentFromMetadataCache(id: string): void {
  try {
    const cached = loadMetadataCache();
    saveMetadataCache(cached.filter((d) => d.id !== id));
  } catch {}
}

export function removeDocumentsBySubjectFromMetadataCache(subjectId: string): void {
  try {
    const cached = loadMetadataCache();
    saveMetadataCache(cached.filter((d) => d.subjectId !== subjectId));
  } catch {}
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocumentsToStorage(docs: LoadedPDF[]): Promise<void> {
  // Always update synchronous metadata cache first for instant subsequent mounts
  saveMetadataCache(docs);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const doc of docs) {
      let buffer: ArrayBuffer | undefined = undefined;
      if (doc.file && doc.file.size > 0) {
        try {
          buffer = await doc.file.arrayBuffer();
        } catch {
          // File might not be read yet
        }
      }

      const record: SerializedDocRecord = {
        id: doc.id,
        name: doc.name,
        size: doc.size,
        rawSize: doc.rawSize,
        loadedAt: doc.loadedAt instanceof Date ? doc.loadedAt.toISOString() : new Date().toISOString(),
        pageCount: doc.pageCount,
        currentPage: doc.currentPage,
        zoomScale: doc.zoomScale,
        rotation: doc.rotation,
        subjectId: doc.subjectId,
        subjectName: doc.subjectName,
        folderPath: doc.folderPath,
        filePath: doc.filePath,
        buffer,
      };

      store.put(record);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save documents to IndexedDB:', err);
  }
}

export async function loadDocumentsFromStorage(): Promise<LoadedPDF[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const records: SerializedDocRecord[] = request.result || [];
        const loadedDocs: LoadedPDF[] = records.map((record) => {
          let blobUrl = '';
          let file: File;
          if (record.buffer && record.buffer.byteLength > 0) {
            const blob = new Blob([record.buffer], { type: 'application/pdf' });
            file = new File([blob], record.name, { type: 'application/pdf' });
            blobUrl = URL.createObjectURL(blob);
          } else {
            const dummyBlob = new Blob([], { type: 'application/pdf' });
            file = new File([dummyBlob], record.name, { type: 'application/pdf' });
          }

          return {
            id: record.id,
            name: record.name,
            size: record.size,
            rawSize: record.rawSize,
            blobUrl,
            file,
            loadedAt: new Date(record.loadedAt),
            pageCount: record.pageCount,
            currentPage: record.currentPage,
            zoomScale: record.zoomScale,
            rotation: record.rotation,
            subjectId: record.subjectId,
            subjectName: record.subjectName,
            folderPath: record.folderPath,
            filePath: record.filePath,
          };
        });
        resolve(loadedDocs);
      };
      request.onerror = () => {
        console.warn('Error reading from IndexedDB:', request.error);
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Failed to load documents from IndexedDB:', err);
    return [];
  }
}

export async function removeDocumentFromStorage(id: string): Promise<void> {
  removeDocumentFromMetadataCache(id);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn(`Failed to delete document ${id} from IndexedDB:`, err);
  }
}

export async function removeDocumentsBySubject(subjectId: string): Promise<void> {
  removeDocumentsBySubjectFromMetadataCache(subjectId);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records: SerializedDocRecord[] = request.result || [];
      for (const rec of records) {
        if (rec.subjectId === subjectId) {
          store.delete(rec.id);
        }
      }
    };
  } catch (err) {
    console.warn(`Failed to remove subject documents from IndexedDB:`, err);
  }
}
