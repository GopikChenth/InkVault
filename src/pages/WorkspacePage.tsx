import React, { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Sun, 
  Moon, 
  Plus, 
  FolderOpen, 
  Home, 
  ChevronLeft, 
  FileText, 
  Trash2, 
  Clock, 
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  FolderUp,
  Folder,
  GraduationCap,
  FolderTree,
  LayoutGrid,
  BookMarked,
  BookOpen,
  Layers
} from 'lucide-react';
import { NAV_ITEMS, TOOL_ITEMS } from '../constants/mockData';
import { LoadedPDF, PDFAnnotation, AppMode, StudySubject } from '../types';
import PDFViewer, { globalDocProxyCache, globalTextIndexCache } from '../components/PDFViewer';
import EmptyState from '../components/EmptyState';
import { PomodoroProvider } from '../context/PomodoroContext';
import PomodoroPromptToast from '../components/viewer/PomodoroPromptToast';
import StudySubjectSetupCard from '../components/study/StudySubjectSetupCard';
import FolderTreeExplorer from '../components/study/FolderTreeExplorer';
import { 
  saveDocumentsToStorage, 
  loadDocumentsFromStorage, 
  removeDocumentFromStorage, 
  removeDocumentsBySubject,
  loadMetadataCache,
  saveMetadataCache
} from '../utils/documentStorage';
import BookComicHub from '../components/reader/BookComicHub';

// Lazy-load heavy offline manipulation tools to prevent upfront bundle weight
const MergeTool = React.lazy(() => import('../components/tools/MergeTool'));
const SplitTool = React.lazy(() => import('../components/tools/SplitTool'));
const CompressTool = React.lazy(() => import('../components/tools/CompressTool'));
const WatermarkTool = React.lazy(() => import('../components/tools/WatermarkTool'));
const ProtectTool = React.lazy(() => import('../components/tools/ProtectTool'));

function ToolLoadingFallback() {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-background gap-3 min-h-[300px]">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <span className="text-xs font-mono text-zinc-400">Loading tool module...</span>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface RecentDocCardProps {
  doc: LoadedPDF;
  isCurrentlyActive: boolean;
  onOpen: (doc: LoadedPDF) => void;
  onRemove: (docId: string, e: React.MouseEvent) => void;
  subjectColor?: string;
}

const RecentDocCard = React.memo(function RecentDocCard({
  doc,
  isCurrentlyActive,
  onOpen,
  onRemove,
  subjectColor,
}: RecentDocCardProps) {
  return (
    <div
      onClick={() => onOpen(doc)}
      className={`flex items-center justify-between p-4 rounded-xl bg-card border transition-all shadow-sm cursor-pointer group [content-visibility:auto] ${
        isCurrentlyActive 
          ? 'border-accent/60 bg-accent/[0.03]' 
          : 'border-border hover:border-accent/40'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
          isCurrentlyActive 
            ? 'bg-accent text-white' 
            : 'bg-surface text-zinc-700 dark:text-zinc-300 group-hover:bg-accent/10 group-hover:text-accent'
        }`}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors truncate">
              {doc.name}
            </h4>
            {doc.subjectName && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border flex-shrink-0"
                style={{
                  backgroundColor: subjectColor ? `${subjectColor}15` : 'rgba(99, 102, 241, 0.1)',
                  borderColor: subjectColor ? `${subjectColor}35` : 'rgba(99, 102, 241, 0.25)',
                  color: subjectColor || '#6366f1',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: subjectColor || '#6366f1' }}
                />
                {doc.subjectName}
              </span>
            )}
            {isCurrentlyActive ? (
              <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
            <span>{doc.size}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {doc.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => onRemove(doc.id, e)}
          title="Remove from session"
          className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button 
          onClick={() => onOpen(doc)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors"
        >
          <span>{isCurrentlyActive ? 'View' : 'Open'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

interface WorkspacePageProps {
  onReturnToCover: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  controlledActiveTab?: string;
  onActiveTabChange?: (tab: string) => void;
  onActiveDocChange?: (docName: string | null) => void;
  initialMode?: AppMode;
  onModeChange?: (mode: AppMode) => void;
}

export default function WorkspacePage({ 
  onReturnToCover, 
  darkMode, 
  onToggleDarkMode,
  controlledActiveTab,
  onActiveTabChange,
  onActiveDocChange,
  initialMode = 'editor',
  onModeChange,
}: WorkspacePageProps) {
  const [currentMode, setCurrentMode] = useState<AppMode>(initialMode);

  useEffect(() => {
    if (initialMode) {
      setCurrentMode(initialMode);
    }
  }, [initialMode]);

  const handleModeChange = useCallback((mode: AppMode) => {
    setCurrentMode(mode);
    if (onModeChange) onModeChange(mode);
  }, [onModeChange]);

  const [internalActiveTab, setInternalActiveTab] = useState<string>('recent');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = useCallback((tab: string) => {
    setInternalActiveTab(tab);
    if (onActiveTabChange) onActiveTabChange(tab);
  }, [onActiveTabChange]);

  const [openDocs, setOpenDocs] = useState<LoadedPDF[]>([]);

  // If leaving editor mode while on an offline tool, switch back to viewer or recent
  useEffect(() => {
    if (currentMode !== 'editor' && TOOL_ITEMS.some((t) => t.id === activeTab)) {
      setActiveTab(openDocs.length > 0 ? 'viewer' : 'recent');
    }
  }, [currentMode, activeTab, openDocs.length, setActiveTab]);
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('inkvault_active_doc_id') || null;
    } catch {
      return null;
    }
  });

  const activeDoc = React.useMemo(() => {
    if (!activeDocId && openDocs.length > 0) return openDocs[0];
    return openDocs.find((d) => d.id === activeDocId) || null;
  }, [openDocs, activeDocId]);

  useEffect(() => {
    if (onActiveDocChange) {
      onActiveDocChange(activeDoc ? activeDoc.name : null);
    }
    if (activeDocId) {
      try {
        localStorage.setItem('inkvault_active_doc_id', activeDocId);
      } catch {}
    }
  }, [activeDoc, activeDocId, onActiveDocChange]);

  const [recentDocs, setRecentDocs] = useState<LoadedPDF[]>(() => {
    return loadMetadataCache();
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);

  // Study Subjects state & local persistence
  const [studySubjects, setStudySubjects] = useState<StudySubject[]>(() => {
    try {
      const saved = localStorage.getItem('inkvault_study_subjects');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load study subjects from localStorage:', e);
    }
    return [];
  });

interface TauriFolderScanResult {
  folder_name: string;
  folder_path: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    bytes: number[];
  }>;
}

  const [activeSubjectId, setActiveSubjectId] = useState<string | 'all'>(() => {
    try {
      return localStorage.getItem('inkvault_active_subject_id') || 'all';
    } catch {
      return 'all';
    }
  });
  const [studyExplorerView, setStudyExplorerView] = useState<'tree' | 'cards'>(() => {
    try {
      return (localStorage.getItem('inkvault_study_explorer_view') as 'tree' | 'cards') || 'tree';
    } catch {
      return 'tree';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('inkvault_study_subjects', JSON.stringify(studySubjects));
    } catch (e) {
      console.error('Failed to save study subjects to localStorage:', e);
    }
  }, [studySubjects]);

  useEffect(() => {
    try {
      localStorage.setItem('inkvault_active_subject_id', activeSubjectId);
    } catch {}
  }, [activeSubjectId]);

  useEffect(() => {
    try {
      localStorage.setItem('inkvault_study_explorer_view', studyExplorerView);
    } catch {}
  }, [studyExplorerView]);

  // Restore saved documents from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    loadDocumentsFromStorage().then((savedDocs) => {
      if (!isMounted || savedDocs.length === 0) return;
      setRecentDocs((prev) => {
        const byName = new Map<string, LoadedPDF>();
        prev.forEach((d) => byName.set(d.name, d));
        savedDocs.forEach((d) => {
          const existing = byName.get(d.name);
          if (existing) {
            byName.set(d.name, {
              ...existing,
              ...d,
              blobUrl: d.blobUrl || existing.blobUrl,
              file: d.file.size > 0 ? d.file : existing.file,
              filePath: existing.filePath || d.filePath,
            });
          } else {
            byName.set(d.name, d);
          }
        });
        return Array.from(byName.values());
      });
      setOpenDocs((prev) => {
        if (prev.length > 0) return prev;
        return savedDocs.filter((d) => Boolean(d.blobUrl));
      });
    });
    return () => { isMounted = false; };
  }, []);

  // In Tauri desktop app, automatically re-scan all saved subject folders on mount to ensure complete sync
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
    if (!isTauri) return;

    studySubjects.forEach(async (sub) => {
      if (!sub.folderPath) return;
      try {
        const scanResult = await invoke<TauriFolderScanResult | null>('scan_subject_folder', { folderPath: sub.folderPath });
        if (scanResult && scanResult.files && scanResult.files.length > 0) {
          const scannedDocs: LoadedPDF[] = scanResult.files.map((f, idx) => {
            const dummyBlob = new Blob([], { type: 'application/pdf' });
            const dummyFile = new File([dummyBlob], f.name, { type: 'application/pdf' });
            return {
              id: `${sub.id}-${idx}-${f.name}`,
              name: f.name,
              size: formatFileSize(f.size),
              rawSize: f.size,
              blobUrl: '',
              file: dummyFile,
              loadedAt: new Date(),
              subjectId: sub.id,
              subjectName: sub.name,
              folderPath: sub.folderPath,
              filePath: f.path,
            };
          });

          setRecentDocs((prev) => {
            const byName = new Map<string, LoadedPDF>();
            prev.forEach((d) => byName.set(d.name, d));
            scannedDocs.forEach((sd) => {
              const existing = byName.get(sd.name);
              if (existing) {
                byName.set(sd.name, {
                  ...existing,
                  filePath: sd.filePath,
                  subjectId: sd.subjectId,
                  subjectName: sd.subjectName,
                  folderPath: sd.folderPath,
                  rawSize: sd.rawSize,
                  size: sd.size,
                });
              } else {
                byName.set(sd.name, sd);
              }
            });
            const merged = Array.from(byName.values());
            saveMetadataCache(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn(`Could not auto-rescan subject folder "${sub.name}":`, err);
      }
    });
  }, [studySubjects]);

  const activeSubject = React.useMemo(() => {
    if (activeSubjectId === 'all') return null;
    return studySubjects.find((s) => s.id === activeSubjectId) || null;
  }, [studySubjects, activeSubjectId]);

  const displayedRecentDocs = React.useMemo(() => {
    if (currentMode === 'study') {
      if (activeSubjectId === 'all') return recentDocs;
      return recentDocs.filter(
        (d) => d.subjectId === activeSubjectId || (activeSubject && d.subjectName === activeSubject.name)
      );
    }
    if (currentMode === 'editor') {
      // In Studio Editor, do not show study mode subject folders or their documents
      return recentDocs.filter((d) => !d.subjectId);
    }
    return recentDocs;
  }, [recentDocs, currentMode, activeSubjectId, activeSubject]);

  const handleDeleteSubject = useCallback((subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStudySubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setActiveSubjectId((current) => (current === subjectId ? 'all' : current));
    setRecentDocs((prev) => prev.map((doc) => doc.subjectId === subjectId ? { ...doc, subjectId: undefined, subjectName: undefined } : doc));
    setOpenDocs((prev) => prev.map((doc) => doc.subjectId === subjectId ? { ...doc, subjectId: undefined, subjectName: undefined } : doc));
    removeDocumentsBySubject(subjectId).catch((err) => console.warn('Remove subject docs error:', err));
  }, []);

  // Tab session cache (instant tab switching, scroll preservation, zoom and annotations)
  const tabSessionMapRef = useRef<Map<string, { page: number; scale: number; rotation: number; annotations: PDFAnnotation[] }>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Set webkitdirectory on folderInputRef DOM element for strict browser compatibility
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
      (folderInputRef.current as any).webkitdirectory = true;
      (folderInputRef.current as any).directory = true;
    }
  }, []);

  // Open Document handler: triggers the system file picker
  const handleTriggerOpenFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // Forward declaration of processFiles ref so handleTriggerImportFolder can invoke it safely
  const processFilesRef = useRef<(files: FileList | File[], subjectId?: string, subjectName?: string, folderPath?: string) => Promise<void>>();

  // Import Folder handler: opens native folder picker (Tauri native dialog / File System Access API / webkitdirectory fallback)
  // Automatically keeps the folder name as it is without asking the user to set a name
  const handleTriggerImportFolder = useCallback(async () => {
    // 1. If running inside Tauri desktop app, use native OS folder dialog via Tauri command
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
                id: `${targetSubjectId}-${Date.now()}-${idx}-${f.name}`,
                name: f.name,
                size: formatFileSize(f.size),
                rawSize: f.size,
                blobUrl: '',
                file: dummyFile,
                loadedAt: new Date(),
                subjectId: targetSubjectId,
                subjectName: targetSubjectName,
                folderPath: result.folder_path,
                filePath: f.path,
              };
            });

            setRecentDocs((prev) => {
              const byName = new Map<string, LoadedPDF>();
              prev.forEach((d) => byName.set(d.name, d));
              scannedDocs.forEach((sd) => byName.set(sd.name, sd));
              const merged = Array.from(byName.values());
              saveMetadataCache(merged);
              saveDocumentsToStorage(merged).catch((e) => console.warn('Save error:', e));
              return merged;
            });

            setActiveDocId(scannedDocs[0].id);
            if (currentMode === 'study' && scannedDocs.length > 1) {
              setActiveTab('recent');
            } else {
              setActiveTab('viewer');
            }
          } else {
            alert(`Folder "${folderName}" was imported, but contains no supported documents (.pdf, .epub, .cbz).`);
          }
          return;
        }
        return;
      } catch (tauriErr) {
        console.warn('Tauri folder picker error, falling back to browser API:', tauriErr);
      }
    }

    // 2. Modern browser File System Access API
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle) {
          const folderName = dirHandle.name;
          async function scanDirHandle(handle: any, prefix = ''): Promise<File[]> {
            const collected: File[] = [];
            for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                const file = await entry.getFile();
                const lower = file.name.toLowerCase();
                if (lower.endsWith('.pdf') || lower.endsWith('.epub') || lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn')) {
                  const relName = prefix ? `${prefix}/${file.name}` : file.name;
                  collected.push(new File([file], relName, { type: file.type || 'application/pdf' }));
                }
              } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
                const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
                try {
                  const subHandle = await handle.getDirectoryHandle(entry.name);
                  const subFiles = await scanDirHandle(subHandle, nextPrefix);
                  collected.push(...subFiles);
                } catch {
                  // Skip unreadable subdirectories
                }
              }
            }
            return collected;
          }
          const files = await scanDirHandle(dirHandle);

          let subject = studySubjects.find((s) => s.name.toLowerCase() === folderName.toLowerCase());
          let targetSubjectId: string;
          let targetSubjectName = folderName;

          if (subject) {
            targetSubjectId = subject.id;
            targetSubjectName = subject.name;
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

          if (files.length > 0) {
            if (processFilesRef.current) {
              await processFilesRef.current(files, targetSubjectId, targetSubjectName);
            }
          } else {
            alert(`Folder "${folderName}" was imported, but contains no supported documents (.pdf, .epub, .cbz).`);
          }
          return;
        }
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') return;
        console.warn('showDirectoryPicker error, falling back to input:', pickerErr);
      }
    }

    // 3. Fallback: input element
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  }, [studySubjects]);

  // Process chosen File(s) (supporting PDF, EPUB, CBZ, CBR, CBN in Books & Comics mode, with study subject tagging)
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
      if (isReaderMode) {
        alert('Please select valid PDF, EPUB, or CBZ/CBR comic book file(s).');
      } else {
        alert('Please select valid PDF file(s).');
      }
      return;
    }

    // Determine target subject for tagging in Study Mode
    const effectiveSubjectId = assignedSubjectId ?? (currentMode === 'study' && activeSubjectId !== 'all' ? activeSubjectId : undefined);
    const effectiveSubjectName = assignedSubjectName ?? (
      effectiveSubjectId ? studySubjects.find((s) => s.id === effectiveSubjectId)?.name : undefined
    );

    const newDocs: LoadedPDF[] = [];

    for (let idx = 0; idx < validFiles.length; idx++) {
      const file = validFiles[idx];
      const lower = file.name.toLowerCase();
      const isComic = lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn');
      const isEpub = lower.endsWith('.epub');

      try {
        if (isComic) {
          setConversionStatus(`Unpacking comic pages for "${file.name}"...`);
          const { loadComicBookArchive } = await import('../utils/comicLoader');
          const { pdfBytes, pageCount, coverDataUrl } = await loadComicBookArchive(file);
          const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const pdfFile = new File([pdfBlob], file.name, { type: 'application/pdf' });
          newDocs.push({
            id: `${Date.now()}-${idx}-${file.name}`,
            name: file.name,
            size: formatFileSize(file.size),
            rawSize: file.size,
            blobUrl: URL.createObjectURL(pdfBlob),
            file: pdfFile,
            loadedAt: new Date(),
            pageCount,
            currentPage: 1,
            lastReadAt: new Date().toISOString(),
            isComic: true,
            coverDataUrl,
            subjectId: effectiveSubjectId,
            subjectName: effectiveSubjectName,
            folderPath: assignedFolderPath,
          });
        } else if (isEpub) {
          setConversionStatus(`Rendering EPUB book "${file.name}"...`);
          const { loadEpubBook } = await import('../utils/epubLoader');
          const { pdfBytes, pageCount, title, coverDataUrl } = await loadEpubBook(file);
          const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const pdfFile = new File([pdfBlob], file.name, { type: 'application/pdf' });
          newDocs.push({
            id: `${Date.now()}-${idx}-${file.name}`,
            name: title ? `${title} (${file.name})` : file.name,
            size: formatFileSize(file.size),
            rawSize: file.size,
            blobUrl: URL.createObjectURL(pdfBlob),
            file: pdfFile,
            loadedAt: new Date(),
            pageCount,
            currentPage: 1,
            lastReadAt: new Date().toISOString(),
            isEpub: true,
            coverDataUrl,
            subjectId: effectiveSubjectId,
            subjectName: effectiveSubjectName,
            folderPath: assignedFolderPath,
          });
        } else {
          newDocs.push({
            id: `${Date.now()}-${idx}-${file.name}`,
            name: file.name,
            size: formatFileSize(file.size),
            rawSize: file.size,
            blobUrl: URL.createObjectURL(file),
            file,
            loadedAt: new Date(),
            currentPage: 1,
            lastReadAt: new Date().toISOString(),
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

    if (newDocs.length === 0) return;

    setOpenDocs((prev) => {
      const existingNames = new Set(prev.map((d) => d.name));
      const toAdd = newDocs.filter((d) => !existingNames.has(d.name));
      return [...prev, ...(toAdd.length > 0 ? toAdd : newDocs)];
    });

    setRecentDocs((prev) => {
      const merged = [
        ...newDocs,
        ...prev.filter((d) => !newDocs.some((nd) => nd.name === d.name)),
      ];
      saveDocumentsToStorage(merged).catch((e) => console.warn('Save documents error:', e));
      return merged;
    });

    setActiveDocId(newDocs[0].id);
    if (currentMode === 'study' && newDocs.length > 1) {
      setActiveTab('recent');
    } else {
      setActiveTab('viewer');
    }
  }, [currentMode, activeSubjectId, studySubjects, setActiveTab]);

  useEffect(() => {
    processFilesRef.current = processFiles;
  }, [processFiles]);

  // Folder input change handler: automatically organizes documents under the folder's name as a subject
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
      targetSubjectName = subject.name;
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

    // Map files preserving relative subfolder path
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
  }, [studySubjects, processFiles]);

  // File input change event
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Recursive folder traversal for drag and drop
  const traverseFileTree = async (item: any, path = ''): Promise<File[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file(
          (file: File) => {
            const relName = path ? `${path}${file.name}` : file.name;
            const namedFile = path ? new File([file], relName, { type: file.type || 'application/pdf' }) : file;
            Object.defineProperty(namedFile, 'webkitRelativePath', {
              value: path + file.name,
              writable: true,
            });
            resolve([namedFile]);
          },
          () => resolve([])
        );
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readEntriesBatch = async (): Promise<any[]> => {
          return new Promise((res) => {
            dirReader.readEntries(
              (entries: any[]) => res(entries),
              () => res([])
            );
          });
        };
        (async () => {
          const allEntries: any[] = [];
          let batch = await readEntriesBatch();
          while (batch.length > 0) {
            allEntries.push(...batch);
            batch = await readEntriesBatch();
          }
          const filePromises = allEntries.map((entry) =>
            traverseFileTree(entry, path ? `${path}${item.name}/` : `${item.name}/`)
          );
          const nestedFiles = await Promise.all(filePromises);
          resolve(nestedFiles.flat());
        })();
      } else {
        resolve([]);
      }
    });
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function') {
      const entryFiles: File[] = [];
      let detectedFolderName: string | null = null;
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry?.();
        if (entry) {
          if (entry.isDirectory && !detectedFolderName) {
            detectedFolderName = entry.name;
          }
          const files = await traverseFileTree(entry);
          entryFiles.push(...files);
        }
      }

      if (entryFiles.length > 0) {
        if (currentMode === 'study' && detectedFolderName) {
          let subject = studySubjects.find((s) => s.name.toLowerCase() === detectedFolderName!.toLowerCase());
          let targetSubjectId: string;
          let targetSubjectName: string;
          if (subject) {
            targetSubjectId = subject.id;
            targetSubjectName = subject.name;
          } else {
            const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6', '#f97316'];
            const assignedColor = palette[studySubjects.length % palette.length];
            const newSubject: StudySubject = {
              id: `subj-${Date.now()}`,
              name: detectedFolderName,
              color: assignedColor,
              createdAt: new Date().toISOString(),
            };
            setStudySubjects((prev) => [...prev, newSubject]);
            targetSubjectId = newSubject.id;
            targetSubjectName = newSubject.name;
          }
          setActiveSubjectId(targetSubjectId);

          // Strip the root folder name from the display name if present so subpaths are relative to the subject
          const prefixToStrip = `${detectedFolderName}/`;
          const normalizedFiles = entryFiles.map((f) => {
            if (f.name.startsWith(prefixToStrip)) {
              return new File([f], f.name.slice(prefixToStrip.length), { type: f.type || 'application/pdf' });
            }
            return f;
          });

          await processFiles(normalizedFiles, targetSubjectId, targetSubjectName);
          return;
        }
        await processFiles(entryFiles);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles, currentMode, studySubjects]);

  // Keyboard shortcut: ⌘O / Ctrl+O to open file dialog (or folder dialog in Study Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        if (currentMode === 'study') {
          handleTriggerImportFolder();
        } else {
          handleTriggerOpenFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerOpenFile, handleTriggerImportFolder, currentMode]);

  // Tab switching with on-demand instant file hydration
  const handleSelectTabDoc = useCallback(async (doc: LoadedPDF) => {
    let targetDoc = doc;
    if (!targetDoc.blobUrl || targetDoc.file.size === 0) {
      const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
      if (isTauri && targetDoc.filePath) {
        try {
          const bytes = await invoke<number[]>('read_file_bytes', { path: targetDoc.filePath });
          const u8 = new Uint8Array(bytes);
          const blob = new Blob([u8], { type: 'application/pdf' });
          const file = new File([blob], targetDoc.name, { type: 'application/pdf' });
          targetDoc = {
            ...targetDoc,
            blobUrl: URL.createObjectURL(blob),
            file,
            rawSize: u8.length,
          };
          setRecentDocs((prev) => prev.map((d) => (d.id === targetDoc.id || d.name === targetDoc.name ? targetDoc : d)));
        } catch (err) {
          console.warn('Could not read file on demand from disk:', err);
        }
      }
    }

    setOpenDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === targetDoc.id || d.name === targetDoc.name);
      if (idx === -1) {
        return [...prev, targetDoc];
      }
      const next = [...prev];
      next[idx] = targetDoc;
      return next;
    });
    setActiveDocId(targetDoc.id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  // Auto-hydrate active document if it has no blobUrl yet
  useEffect(() => {
    if (activeDoc && (!activeDoc.blobUrl || activeDoc.file.size === 0) && activeDoc.filePath) {
      handleSelectTabDoc(activeDoc);
    }
  }, [activeDoc, handleSelectTabDoc]);

  // Tab closing with cache destruction
  const handleCloseTabDoc = useCallback((docId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setOpenDocs((prev) => {
      const targetDoc = prev.find((d) => d.id === docId);
      const targetIndex = prev.findIndex((d) => d.id === docId);
      if (targetIndex === -1) return prev;
      const remaining = prev.filter((d) => d.id !== docId);

      // Clean up proxy and in-memory caches
      if (targetDoc) {
        const cached = globalDocProxyCache.get(targetDoc.blobUrl);
        if (cached) {
          try { cached.destroy(); } catch {}
          globalDocProxyCache.delete(targetDoc.blobUrl);
        }
        globalTextIndexCache.delete(docId);
        tabSessionMapRef.current.delete(docId);
      }

      // If active doc was closed, pick adjacent tab
      if (activeDocId === docId) {
        if (remaining.length > 0) {
          const nextIndex = Math.min(targetIndex, remaining.length - 1);
          setActiveDocId(remaining[nextIndex].id);
        } else {
          setActiveDocId(null);
          setActiveTab('recent');
        }
      }
      return remaining;
    });
  }, [activeDocId, setActiveTab]);

  // Open New Tab
  const handleNewTab = useCallback(() => {
    handleTriggerOpenFile();
  }, [handleTriggerOpenFile]);

  // Re-open recent document
  const handleOpenRecentDoc = useCallback((doc: LoadedPDF) => {
    handleSelectTabDoc(doc);
  }, [handleSelectTabDoc]);

  // Remove document from recent list
  const handleRemoveRecentDoc = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentDocs((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) {
        try {
          URL.revokeObjectURL(target.blobUrl);
        } catch {}
      }
      return prev.filter((d) => d.id !== id);
    });

    handleCloseTabDoc(id);
    removeDocumentFromStorage(id).catch((err) => console.warn('Remove doc error:', err));
  }, [handleCloseTabDoc]);

  // Close active document in viewer
  const handleCloseViewer = useCallback(() => {
    if (activeDoc) {
      handleCloseTabDoc(activeDoc.id);
    } else {
      setActiveTab('recent');
    }
  }, [activeDoc, handleCloseTabDoc, setActiveTab]);

  // Callback to register and view newly generated/modified tool documents
  const handleRegisterAndOpenDoc = useCallback((generatedDoc: LoadedPDF) => {
    setOpenDocs((prev) => [...prev.filter((d) => d.id !== generatedDoc.id), generatedDoc]);
    setRecentDocs((prev) => [generatedDoc, ...prev.filter((d) => d.id !== generatedDoc.id)]);
    setActiveDocId(generatedDoc.id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  return (
    <PomodoroProvider>
      {/* Global Pomodoro Session Transition Prompt Toast */}
      <PomodoroPromptToast />

      {/* Conversion Status Toast for Comics and Ebooks */}
      {conversionStatus && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-medium border border-zinc-700/50 dark:border-zinc-300/50 animate-in fade-in slide-in-from-top-2">
          <div className="h-3.5 w-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>{conversionStatus}</span>
        </div>
      )}

      <div 
        className="flex w-full h-full overflow-hidden bg-background text-zinc-800 dark:text-zinc-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Native File Input with Multiple Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={
          currentMode === 'reader'
            ? '.pdf,.epub,.cbz,.cbr,.cbn,application/pdf,application/epub+zip'
            : 'application/pdf'
        }
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden Native Folder Input for Directory Selection */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        onChange={handleFolderChange}
        className="hidden"
      />

      {/* 1. Left Sidebar Navigation (Hidden when viewing an active document in PDF Viewer so PDF Pages sidebar is primary) */}
      {!(activeTab === 'viewer' && activeDoc) && (
        <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-border bg-surface dark:bg-surface p-4">
          <div className="flex flex-col gap-6">
            
            {/* Brand Header with Home Action */}
            <button 
              onClick={onReturnToCover}
              className="flex items-center gap-3 px-2 text-left hover:opacity-80 transition-opacity group"
              title="Return to Presentation Cover"
            >
              <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 flex items-center justify-center font-extrabold text-xs shadow-md group-hover:bg-accent group-hover:text-white transition-colors">
                IV
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Ink Vault</h1>
                  <ChevronLeft className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                </div>
              </div>
            </button>

            {/* Mode Switcher Segmented Control: Studio (⌘1) | Study (⌘2) | Books & Comics (⌘3) */}
            <div className="grid grid-cols-3 gap-1 bg-surface dark:bg-card p-1 rounded-xl border border-border text-[11px] font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => handleModeChange('editor')}
                title="Studio Editor (⌘1) - PDF Tools & Annotations"
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
                  currentMode === 'editor'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Layers className="h-3.5 w-3.5 mb-0.5" />
                <span className="text-[10px] truncate">Studio</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('study')}
                title="Study Mode (⌘2) - Coursework, Pomodoro & Focused Reading"
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
                  currentMode === 'study'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5 mb-0.5" />
                <span className="text-[10px] truncate">Study</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('reader')}
                title="Books & Comics (⌘3) - CBZ Comics, EPUB Books & Graphic Novels"
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
                  currentMode === 'reader'
                    ? 'bg-rose-600 text-white font-bold shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 mb-0.5" />
                <span className="text-[10px] truncate">Reader</span>
              </button>
            </div>

            {/* Primary Action Button: Open Document, Import Folder or Add Book/Comic */}
            <button 
              onClick={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-white text-xs font-semibold transition-all shadow-sm group active:scale-[0.98] ${
                currentMode === 'reader' 
                  ? 'bg-rose-600 hover:bg-rose-500' 
                  : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-accent dark:hover:bg-accent dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                {currentMode === 'study' ? <FolderUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>
                  {currentMode === 'study' 
                    ? 'Import Folder' 
                    : currentMode === 'reader'
                    ? 'Add Book / Comic'
                    : 'Open Document'}
                </span>
              </span>
              <span className="text-[10px] font-mono opacity-60 bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded">
                ⌘O
              </span>
            </button>

            {/* Workspace Nav Group */}
            <div className="flex flex-col gap-1">
              <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                {currentMode === 'reader' ? 'Bookshelf' : currentMode === 'study' ? 'Academics' : 'Workspace'}
              </span>
              {NAV_ITEMS.map((item) => {
                const Icon = 
                  item.id === 'recent'
                    ? currentMode === 'reader' ? BookMarked : currentMode === 'study' ? GraduationCap : Layers
                    : currentMode === 'reader' ? BookOpen : item.icon;
                const isActive = activeTab === item.id;
                const count = item.id === 'recent' ? recentDocs.length : item.id === 'viewer' ? openDocs.length : undefined;
                const label = 
                  item.id === 'recent'
                    ? currentMode === 'reader' ? 'Books & Comics' : currentMode === 'study' ? 'Study Subjects' : 'Recent Documents'
                    : item.id === 'viewer'
                    ? currentMode === 'reader' ? 'Comic / Book Reader' : currentMode === 'study' ? 'Study Reader' : 'Studio Viewer'
                    : item.label;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive 
                        ? currentMode === 'reader'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold'
                          : 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </span>
                    {typeof count === 'number' && count > 0 && (
                      <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Study Mode: Subjects / Folders Nav Group */}
            {currentMode === 'study' && (
              <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Folder className="h-3 w-3 text-accent" /> Subjects
                  </span>
                  <button
                    type="button"
                    onClick={handleTriggerImportFolder}
                    title="Import Folder from Computer"
                    className="px-2 py-0.5 rounded text-zinc-500 dark:text-zinc-400 hover:text-accent hover:bg-card transition-colors flex items-center gap-1 text-[11px] font-medium"
                  >
                    <FolderUp className="h-3.5 w-3.5 text-accent" />
                    <span>Import</span>
                  </button>
                </div>

                {/* All Subjects pill */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubjectId('all');
                    if (activeTab !== 'recent') setActiveTab('recent');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeSubjectId === 'all'
                      ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-2xs border border-border font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                    <span>All Subjects</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {recentDocs.length}
                  </span>
                </button>

                {/* Individual Subjects */}
                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                  {studySubjects.map((sub) => {
                    const isSelected = activeSubjectId === sub.id;
                    const subDocs = recentDocs.filter(
                      (d) => d.subjectId === sub.id || d.subjectName === sub.name
                    );
                    const docCount = subDocs.length;
                    return (
                      <div key={sub.id} className="flex flex-col">
                        <div
                          onClick={() => {
                            setActiveSubjectId(sub.id);
                            if (activeTab !== 'recent') setActiveTab('recent');
                          }}
                          className={`group/sub flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-2xs border border-border font-semibold'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: sub.color }}
                            />
                            <span className="truncate">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] font-mono text-zinc-400">
                              {docCount}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSubject(sub.id, e)}
                              title={`Delete ${sub.name}`}
                              className="opacity-0 group-hover/sub:opacity-100 hover:text-rose-500 text-zinc-400 transition-opacity p-0.5 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Inline VS Code Tree Explorer in Left Sidebar */}
                        {isSelected && subDocs.length > 0 && (
                          <div className="mt-1 mb-1 pl-1 border-l-2 border-accent/30 ml-2">
                            <FolderTreeExplorer
                              docs={subDocs}
                              activeDocId={activeDoc?.id}
                              onSelectDoc={handleOpenRecentDoc}
                              onRemoveDoc={handleRemoveRecentDoc}
                              subjectName={sub.name}
                              subjectColor={sub.color}
                              isCompact={true}
                              showControls={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {studySubjects.length === 0 && (
                  <div className="px-2 py-3 text-center text-[11px] text-zinc-400 border border-dashed border-border/80 rounded-lg">
                    <p className="mb-1.5">No folders imported yet</p>
                    <button
                      type="button"
                      onClick={handleTriggerImportFolder}
                      className="text-accent hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                    >
                      <FolderUp className="h-3.5 w-3.5" />
                      <span>Import Folder</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {currentMode === 'editor' && (
              <div className="flex flex-col gap-1">
                <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  Offline Tools
                </span>
                {TOOL_ITEMS.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTab(tool.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive 
                          ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold' 
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {tool.label}
                    </button>
                  );
                })}
              </div>
            )}

          </div>

          {/* Sidebar Footer */}
          <div className="flex flex-col gap-2 pt-3 pb-1 border-t border-border flex-shrink-0">
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                onClick={onToggleDarkMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-card border border-border hover:bg-surface dark:hover:bg-surface transition-colors shadow-xs"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-600" />}
                <span>{darkMode ? 'Light' : 'Dark'}</span>
              </button>

              <button
                onClick={onReturnToCover}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-2 py-1 rounded hover:bg-card"
                title="Return to Presentation Cover"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Cover</span>
              </button>
            </div>
          </div>

        </aside>
      )}

      {/* 2. Main Workspace Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Drag Overlay Indicator */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-white/90 dark:bg-zinc-950/90 border-2 border-dashed border-accent m-4 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
            <div className="h-16 w-16 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg mb-3 animate-bounce">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Drop PDF file(s) to open as tabs
            </p>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              In-Memory Local Processing • Multi-Tab View
            </p>
          </div>
        )}

        {/* Top App Header Bar (Shown when not in full integrated viewer mode) */}
        {!(activeTab === 'viewer' && activeDoc) && (
          <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-surface dark:bg-surface flex-shrink-0 z-20">
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 min-w-0">
              <button 
                onClick={onReturnToCover}
                className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex-shrink-0"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Cover</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex-shrink-0">Workspace</span>
              <span>/</span>
              <span className="capitalize">{activeTab.replace('-', ' ')}</span>
            </div>

            <button
              onClick={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors shadow-sm"
            >
              {currentMode === 'study' ? <FolderUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{currentMode === 'study' ? 'Import Folder' : 'Open PDF'}</span>
            </button>
          </header>
        )}

        {/* Workspace Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col p-0 m-0">
          <React.Suspense fallback={<ToolLoadingFallback />}>
            {/* TAB 1: PDF Viewer */}
            {activeTab === 'viewer' ? (
              activeDoc ? (
                <PDFViewer 
                  key={activeDoc.id} 
                  doc={activeDoc} 
                  allDocs={openDocs}
                  initialPage={tabSessionMapRef.current.get(activeDoc.id)?.page}
                  initialScale={tabSessionMapRef.current.get(activeDoc.id)?.scale}
                  initialRotation={tabSessionMapRef.current.get(activeDoc.id)?.rotation}
                  initialAnnotations={tabSessionMapRef.current.get(activeDoc.id)?.annotations}
                  onSaveSessionState={(state) => {
                    tabSessionMapRef.current.set(activeDoc.id, state);
                    setOpenDocs((prev) =>
                      prev.map((d) =>
                        d.id === activeDoc.id
                          ? {
                              ...d,
                              currentPage: state.page,
                              lastReadAt: new Date().toISOString(),
                            }
                          : d
                      )
                    );
                    setRecentDocs((prev) => {
                      const updated = prev.map((d) =>
                        d.id === activeDoc.id
                          ? {
                              ...d,
                              currentPage: state.page,
                              lastReadAt: new Date().toISOString(),
                            }
                          : d
                      );
                      saveMetadataCache(updated);
                      return updated;
                    });
                  }}
                  onClose={handleCloseViewer} 
                  onSelectDoc={handleSelectTabDoc}
                  onCloseDoc={handleCloseTabDoc}
                  onNewTab={handleNewTab}
                  onOpenDocument={handleTriggerOpenFile}
                  darkMode={darkMode}
                  onToggleDarkMode={onToggleDarkMode}
                  onReturnToCover={onReturnToCover}
                  initialAppMode={currentMode}
                  onAppModeChange={handleModeChange}
                />
              ) : currentMode === 'reader' ? (
                <BookComicHub
                  docs={recentDocs.length > 0 ? recentDocs : openDocs}
                  onOpenDoc={handleOpenRecentDoc}
                  onImportBook={handleTriggerOpenFile}
                  onRemoveDoc={(id) => handleRemoveRecentDoc(id)}
                  onUpdateDocProgress={(docId, newPage) => {
                    setRecentDocs((prev) => {
                      const updated = prev.map((d) =>
                        d.id === docId
                          ? {
                              ...d,
                              currentPage: newPage,
                              lastReadAt: new Date().toISOString(),
                            }
                          : d
                      );
                      saveMetadataCache(updated);
                      return updated;
                    });
                    setOpenDocs((prev) =>
                      prev.map((d) =>
                        d.id === docId
                          ? {
                              ...d,
                              currentPage: newPage,
                              lastReadAt: new Date().toISOString(),
                            }
                          : d
                      )
                    );
                  }}
                  darkMode={darkMode}
                />
              ) : (
                <EmptyState
                  icon={currentMode === 'study' ? FolderUp : FolderOpen}
                  title={
                    currentMode === 'study'
                      ? 'Import a Study Subject Folder'
                      : 'Select a PDF to view'
                  }
                  description={
                    currentMode === 'study'
                      ? 'Select a folder from your computer or drag and drop any folder directly into the workspace to organize it by subject.'
                      : 'Click to open file manager or drag and drop one or more PDF documents anywhere into the workspace.'
                  }
                  actionLabel={
                    currentMode === 'study'
                      ? 'Select Folder from Computer'
                      : 'Browse Local Files'
                  }
                  onAction={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
                  hint={currentMode === 'study' ? 'or drag and drop folder anywhere' : 'or drag and drop PDF anywhere'}
                />
              )
            ) : activeTab === 'recent' ? (
              currentMode === 'reader' ? (
                <BookComicHub
                  docs={recentDocs.length > 0 ? recentDocs : openDocs}
                  onOpenDoc={handleOpenRecentDoc}
                  onImportBook={handleTriggerOpenFile}
                  onRemoveDoc={(id) => handleRemoveRecentDoc(id)}
                  onUpdateDocProgress={(docId, newPage) => {
                    setRecentDocs((prev) => {
                      const updated = prev.map((d) =>
                        d.id === docId
                          ? {
                              ...d,
                              currentPage: newPage,
                              lastReadAt: new Date().toISOString(),
                            }
                          : d
                      );
                      saveMetadataCache(updated);
                      return updated;
                    });
                    setOpenDocs((prev) =>
                      prev.map((d) =>
                        d.id === docId
                          ? {
                              ...d,
                              currentPage: newPage,
                              lastReadAt: new Date().toISOString(),
                            }
                          : d
                      )
                    );
                  }}
                  darkMode={darkMode}
                />
              ) : (
                /* TAB 3: Recent Documents */
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-4xl mx-auto w-full">
                  {currentMode === 'study' && studySubjects.length === 0 && recentDocs.length === 0 ? (
                  <StudySubjectSetupCard
                    onTriggerImportFolder={handleTriggerImportFolder}
                  />
                ) : recentDocs.length === 0 ? (
                  <div className="h-[60vh] flex items-center justify-center">
                    <EmptyState
                      icon={currentMode === 'study' ? GraduationCap : FileText}
                      title={
                        currentMode === 'study'
                          ? 'No study documents yet'
                          : 'No recent documents yet'
                      }
                      description={
                        currentMode === 'study'
                          ? 'Import folders from your computer to organize them subject-wise for your coursework.'
                          : 'Documents opened in this session will appear here for fast access.'
                      }
                      actionLabel={
                        currentMode === 'study'
                          ? 'Select Folder from Computer'
                          : 'Open a PDF Document'
                      }
                      onAction={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header in Study Mode */}
                    {currentMode === 'study' ? (
                      <div className="flex flex-col gap-3 pb-3 border-b border-border">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-2xs flex-shrink-0"
                              style={{ backgroundColor: activeSubject ? activeSubject.color : '#6366f1' }}
                            >
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <span className="truncate">{activeSubject ? activeSubject.name : 'All Study Subjects'}</span>
                                {activeSubject && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 flex-shrink-0">
                                    Subject
                                  </span>
                                )}
                              </h2>
                              <p className="text-xs text-zinc-500 truncate">
                                {activeSubject
                                  ? `Study material, slides, and textbooks for ${activeSubject.name}`
                                  : 'Organized subject-wise to remember coursework and revisions'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Tree / Cards View Toggle */}
                            <div className="flex items-center gap-0.5 bg-surface dark:bg-card border border-border p-0.5 rounded-lg shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setStudyExplorerView('tree')}
                                title="VS Code Folder Structure View"
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                  studyExplorerView === 'tree'
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                }`}
                              >
                                <FolderTree className="h-3.5 w-3.5" />
                                <span>Tree</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudyExplorerView('cards')}
                                title="Cards List View"
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                  studyExplorerView === 'cards'
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                }`}
                              >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span>Cards</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={handleTriggerImportFolder}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-2xs transition-colors"
                              title="Select an entire folder from your computer to import as a subject"
                            >
                              <FolderUp className="h-3.5 w-3.5" />
                              <span>Import Folder</span>
                            </button>
                          </div>
                        </div>

                        {/* Subject Filter Pills */}
                        {studySubjects.length > 0 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveSubjectId('all')}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                activeSubjectId === 'all'
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                                  : 'bg-surface hover:bg-card text-zinc-600 dark:text-zinc-400 border border-border'
                              }`}
                            >
                              <span>All</span>
                              <span className="text-[10px] opacity-70 font-mono">({recentDocs.length})</span>
                            </button>

                            {studySubjects.map((sub) => {
                              const isSelected = activeSubjectId === sub.id;
                              const count = recentDocs.filter(
                                (d) => d.subjectId === sub.id || d.subjectName === sub.name
                              ).length;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => setActiveSubjectId(sub.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                                    isSelected
                                      ? 'bg-card text-zinc-900 dark:text-zinc-100 border border-border shadow-2xs font-semibold'
                                      : 'bg-surface hover:bg-card text-zinc-600 dark:text-zinc-400 border border-border'
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: sub.color }}
                                  />
                                  <span>{sub.name}</span>
                                  <span className="text-[10px] opacity-70 font-mono">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard Header for Editor / Reader */
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div>
                          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Session Documents
                          </h2>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Locally loaded PDF documents stored in-memory.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400">
                            {displayedRecentDocs.length} {displayedRecentDocs.length === 1 ? 'Document' : 'Documents'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Document Cards or Subject Empty State */}
                    {displayedRecentDocs.length === 0 ? (
                      <div className="py-16 text-center flex flex-col items-center select-none animate-in fade-in duration-150">
                        <div 
                          className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 shadow-2xs text-white"
                          style={{ backgroundColor: activeSubject ? activeSubject.color : '#6366f1' }}
                        >
                          <Folder className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          No documents in {activeSubject ? `"${activeSubject.name}"` : 'this category'} yet
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                          Select a folder from your computer or open documents to organize them under this subject.
                        </p>
                        <div className="mt-4 flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleTriggerImportFolder}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-2xs"
                          >
                            <FolderUp className="h-3.5 w-3.5" />
                            <span>Import Folder</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleTriggerOpenFile}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-card transition-colors shadow-2xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add PDF</span>
                          </button>
                        </div>
                      </div>
                    ) : (currentMode === 'study' && studyExplorerView === 'tree') ? (
                      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <FolderTreeExplorer
                          docs={displayedRecentDocs}
                          activeDocId={activeDoc?.id}
                          onSelectDoc={handleOpenRecentDoc}
                          onRemoveDoc={handleRemoveRecentDoc}
                          subjectName={activeSubject ? activeSubject.name : 'Coursework Documents'}
                          subjectColor={activeSubject ? activeSubject.color : undefined}
                          showControls={true}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {displayedRecentDocs.map((doc) => (
                          <RecentDocCard
                            key={doc.id}
                            doc={doc}
                            isCurrentlyActive={activeDoc?.id === doc.id}
                            onOpen={handleOpenRecentDoc}
                            onRemove={handleRemoveRecentDoc}
                            subjectColor={
                              studySubjects.find(
                                (s) => s.id === doc.subjectId || s.name === doc.subjectName
                              )?.color
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )) : activeTab === 'merge' ? (
              /* TAB 4: Merge Tool */
              <MergeTool initialDoc={activeDoc} onOpenMergedDoc={handleRegisterAndOpenDoc} />
            ) : activeTab === 'split' ? (
              /* TAB 5: Split & Extract Tool */
              <SplitTool initialDoc={activeDoc} onOpenExtractedDoc={handleRegisterAndOpenDoc} />
            ) : activeTab === 'compress' ? (
              /* TAB 6: Compress Tool */
              <CompressTool initialDoc={activeDoc} onOpenCompressedDoc={handleRegisterAndOpenDoc} />
            ) : activeTab === 'watermark' ? (
              /* TAB 7: Watermark Tool */
              <WatermarkTool initialDoc={activeDoc} onOpenWatermarkedDoc={handleRegisterAndOpenDoc} />
            ) : activeTab === 'protect' ? (
              /* TAB 8: Protect & Unlock Tool */
              <ProtectTool initialDoc={activeDoc} onOpenProtectedDoc={handleRegisterAndOpenDoc} />
            ) : null}
          </React.Suspense>
        </div>

      </main>

      </div>
    </PomodoroProvider>
  );
}
