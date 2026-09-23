import React, { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LoadedPDF, AppMode } from '../types';
import { StudySubject, TauriFolderScanResult } from '../modes/study';

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export interface UseDocumentLoaderOptions {
  currentMode: AppMode;
  activeSubjectId: string | 'all';
  studySubjects: StudySubject[];
  setStudySubjects: React.Dispatch<React.SetStateAction<StudySubject[]>>;
  setActiveSubjectId: (id: string | 'all') => void;
  onDocumentsLoaded: (newDocs: LoadedPDF[]) => void;
  onOpenDocDirectly?: (doc: LoadedPDF) => void;
}

export function useDocumentLoader({
  currentMode,
  activeSubjectId,
  studySubjects,
  setStudySubjects,
  setActiveSubjectId,
  onDocumentsLoaded,
  onOpenDocDirectly,
}: UseDocumentLoaderOptions) {
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const processFilesRef = useRef<((files: FileList | File[], assignedSubjectId?: string, assignedSubjectName?: string, assignedFolderPath?: string) => Promise<void>) | null>(null);

  // Process chosen File(s) (PDF, EPUB, CBZ, CBR, CBN)
  const processFiles = useCallback(async (
    files: FileList | File[],
    assignedSubjectId?: string,
    assignedSubjectName?: string,
    assignedFolderPath?: string
  ) => {
    const isReaderMode = currentMode === 'reader';
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isComic = lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn');
      const isEpub = file.type === 'application/epub+zip' || lower.endsWith('.epub');

      if (isPdf || (isReaderMode && (isComic || isEpub))) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      alert('Please select valid documents (.pdf' + (isReaderMode ? ', .cbz, .cbr, .epub' : '') + ').');
      return;
    }

    const newDocs: LoadedPDF[] = [];

    for (let idx = 0; idx < validFiles.length; idx++) {
      const file = validFiles[idx];
      const lower = file.name.toLowerCase();
      const isComic = lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn');
      const isEpub = lower.endsWith('.epub');

      let effectiveSubjectId = assignedSubjectId;
      let effectiveSubjectName = assignedSubjectName;

      if (!effectiveSubjectId && activeSubjectId !== 'all') {
        const sub = studySubjects.find((s) => s.id === activeSubjectId);
        if (sub) {
          effectiveSubjectId = sub.id;
          effectiveSubjectName = sub.name;
        }
      }

      try {
        if (isComic) {
          setConversionStatus(`Unpacking comic ${file.name}...`);
          const { loadComicBookArchive } = await import('../modes/reader');
          const comicResult = await loadComicBookArchive(file);
          const blob = new Blob([comicResult.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          newDocs.push({
            id: `${Date.now()}-${idx}-${file.name}`,
            name: file.name,
            size: formatFileSize(comicResult.pdfBytes.length),
            rawSize: comicResult.pdfBytes.length,
            blobUrl,
            file: new File([blob], file.name, { type: 'application/pdf' }),
            loadedAt: new Date(),
            pageCount: comicResult.pageCount,
            currentPage: 1,
            lastReadAt: new Date().toISOString(),
            coverDataUrl: comicResult.coverDataUrl,
            isComic: true,
            mode: 'reader',
            subjectId: effectiveSubjectId,
            subjectName: effectiveSubjectName,
            folderPath: assignedFolderPath,
          });
        } else if (isEpub) {
          setConversionStatus(`Rendering EPUB ${file.name}...`);
          const { loadEpubBook } = await import('../modes/reader');
          const epubResult = await loadEpubBook(file);
          const blob = new Blob([epubResult.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          newDocs.push({
            id: `${Date.now()}-${idx}-${file.name}`,
            name: file.name,
            size: formatFileSize(epubResult.pdfBytes.length),
            rawSize: epubResult.pdfBytes.length,
            blobUrl,
            file: new File([blob], file.name, { type: 'application/pdf' }),
            loadedAt: new Date(),
            pageCount: epubResult.pageCount,
            currentPage: 1,
            lastReadAt: new Date().toISOString(),
            coverDataUrl: epubResult.coverDataUrl,
            isEpub: true,
            mode: 'reader',
            subjectId: effectiveSubjectId,
            subjectName: effectiveSubjectName,
            folderPath: assignedFolderPath,
          });
        } else {
          let detectedPageCount: number | undefined = undefined;
          try {
            const { PDFDocument } = await import('pdf-lib');
            const ab = await file.arrayBuffer();
            const loaded = await PDFDocument.load(ab, { ignoreEncryption: true });
            detectedPageCount = loaded.getPageCount();
          } catch {}

          newDocs.push({
            id: `${Date.now()}-${idx}-${file.name}`,
            name: file.name,
            size: formatFileSize(file.size),
            rawSize: file.size,
            blobUrl: URL.createObjectURL(file),
            file,
            loadedAt: new Date(),
            currentPage: 1,
            pageCount: detectedPageCount,
            lastReadAt: new Date().toISOString(),
            mode: currentMode,
            subjectId: effectiveSubjectId,
            subjectName: effectiveSubjectName,
            folderPath: assignedFolderPath,
          });
        }
      } catch (err: any) {
        console.error('Error processing document:', err);
        alert(err.message || `Failed to process ${file.name}`);
      } finally {
        setConversionStatus(null);
      }
    }

    if (newDocs.length > 0) {
      onDocumentsLoaded(newDocs);
    }
  }, [currentMode, activeSubjectId, studySubjects, onDocumentsLoaded]);

  useEffect(() => {
    processFilesRef.current = processFiles;
  }, [processFiles]);

  // Native File dialog trigger
  const handleTriggerOpenFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // Import Folder handler (Tauri native dialog / File System Access API / webkitdirectory fallback)
  const handleTriggerImportFolder = useCallback(async () => {
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
    if (isTauri) {
      try {
        const result = await invoke<TauriFolderScanResult | null>('pick_study_folder');
        if (result && result.folder_name) {
          const folderName = result.folder_name;
          let subject = studySubjects.find((s) => s.name.toLowerCase() === folderName.toLowerCase());
          let targetSubjectId: string;
          let targetSubjectName = folderName;

          if (subject) {
            targetSubjectId = subject.id;
            targetSubjectName = subject.name;
            if (result.folder_path && subject.folderPath !== result.folder_path) {
              setStudySubjects((prev) =>
                prev.map((s) => (s.id === targetSubjectId ? { ...s, folderPath: result.folder_path } : s))
              );
            }
          } else {
            const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6', '#f97316'];
            const assignedColor = palette[studySubjects.length % palette.length];
            const newSubject: StudySubject = {
              id: `subj-${Date.now()}`,
              name: folderName,
              color: assignedColor,
              createdAt: new Date().toISOString(),
              folderPath: result.folder_path,
            };
            setStudySubjects((prev) => [...prev, newSubject]);
            targetSubjectId = newSubject.id;
          }

          setActiveSubjectId(targetSubjectId);

          if (result.files && result.files.length > 0) {
            const scannedDocs: LoadedPDF[] = result.files.map((f, idx) => {
              const dummyBlob = new Blob([], { type: 'application/pdf' });
              const dummyFile = new File([dummyBlob], f.name, { type: 'application/pdf' });
              return {
                id: `${Date.now()}-${idx}-${f.name}`,
                name: f.name,
                size: formatFileSize(f.size),
                rawSize: f.size,
                blobUrl: '',
                file: dummyFile,
                loadedAt: new Date(),
                filePath: f.path,
                subjectId: targetSubjectId,
                subjectName: targetSubjectName,
                folderPath: result.folder_path,
                mode: 'study',
              };
            });

            onDocumentsLoaded(scannedDocs);
            if (scannedDocs.length > 0 && onOpenDocDirectly) {
              onOpenDocDirectly(scannedDocs[0]);
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Tauri folder picker error, falling back:', err);
      }
    }

    // Web Fallback: Window showDirectoryPicker
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle) {
          const folderName = dirHandle.name || 'Study Folder';
          let subject = studySubjects.find((s) => s.name.toLowerCase() === folderName.toLowerCase());
          let targetSubjectId: string;
          let targetSubjectName = folderName;

          if (subject) {
            targetSubjectId = subject.id;
          } else {
            const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6', '#f97316'];
            const assignedColor = palette[studySubjects.length % palette.length];
            const newSubject: StudySubject = {
              id: `subj-${Date.now()}`,
              name: folderName,
              color: assignedColor,
              createdAt: new Date().toISOString(),
            };
            setStudySubjects((prev) => [...prev, newSubject]);
            targetSubjectId = newSubject.id;
          }

          setActiveSubjectId(targetSubjectId);

          const files: File[] = [];
          async function readDirectoryRecursive(handle: any, path = '') {
            for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                const lower = entry.name.toLowerCase();
                if (lower.endsWith('.pdf') || lower.endsWith('.epub') || lower.endsWith('.cbz') || lower.endsWith('.cbr')) {
                  const file = await entry.getFile();
                  const relativeName = path ? `${path}${file.name}` : file.name;
                  const namedFile = new File([file], relativeName, { type: file.type || 'application/pdf' });
                  files.push(namedFile);
                }
              } else if (entry.kind === 'directory') {
                await readDirectoryRecursive(entry, `${path}${entry.name}/`);
              }
            }
          }

          await readDirectoryRecursive(dirHandle);

          if (files.length > 0 && processFilesRef.current) {
            await processFilesRef.current(files, targetSubjectId, targetSubjectName);
          }
          return;
        }
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') return;
        console.warn('showDirectoryPicker error, falling back:', pickerErr);
      }
    }

    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  }, [studySubjects, setActiveSubjectId, setStudySubjects, onDocumentsLoaded, onOpenDocDirectly]);

  // Folder input change handler
  const handleFolderChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    let folderName = 'Study Folder';
    const firstFile = rawFiles[0];
    if (firstFile && (firstFile as any).webkitRelativePath) {
      const parts = (firstFile as any).webkitRelativePath.split('/');
      if (parts.length > 1 && parts[0]) {
        folderName = parts[0];
      }
    }

    let subject = studySubjects.find((s) => s.name.toLowerCase() === folderName.toLowerCase());
    let targetSubjectId: string;
    let targetSubjectName = folderName;

    if (subject) {
      targetSubjectId = subject.id;
    } else {
      const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6', '#f97316'];
      const assignedColor = palette[studySubjects.length % palette.length];
      const newSubject: StudySubject = {
        id: `subj-${Date.now()}`,
        name: folderName,
        color: assignedColor,
        createdAt: new Date().toISOString(),
      };
      setStudySubjects((prev) => [...prev, newSubject]);
      targetSubjectId = newSubject.id;
    }

    setActiveSubjectId(targetSubjectId);

    const files: File[] = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const relPath = (file as any).webkitRelativePath;
      if (relPath) {
        const parts = relPath.split('/');
        if (parts.length > 2) {
          const subRelName = parts.slice(1).join('/');
          files.push(new File([file], subRelName, { type: file.type || 'application/pdf' }));
          continue;
        }
      }
      files.push(file);
    }

    await processFiles(files, targetSubjectId, targetSubjectName);
  }, [studySubjects, setActiveSubjectId, setStudySubjects, processFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  return {
    fileInputRef,
    folderInputRef,
    conversionStatus,
    isDragging,
    handleTriggerOpenFile,
    handleTriggerImportFolder,
    handleFileChange,
    handleFolderChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    processFiles,
  };
}
