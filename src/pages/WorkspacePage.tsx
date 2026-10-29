import React, { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Sun, 
  Moon, 
  Plus, 
  FolderOpen, 
  Home, 
  UploadCloud, 
  FolderUp, 
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  Folder
} from 'lucide-react';
import { LoadedPDF, PDFAnnotation, AppMode } from '../types';
import PDFViewer, { globalDocProxyCache, globalTextIndexCache } from '../components/PDFViewer';
import EmptyState from '../components/EmptyState';
import PomodoroPromptToast from '../components/viewer/PomodoroPromptToast';
import { 
  saveDocumentsToStorage, 
  loadDocumentsFromStorage, 
  removeDocumentFromStorage, 
  loadMetadataCache, 
  saveMetadataCache,
  getDocsForMode
} from '../utils/documentStorage';
import { useDocumentLoader } from '../hooks/useDocumentLoader';

// Domain Modules
import { 
  StudioSidebar, 
  StudioRecentView, 
  STUDIO_TOOL_ITEMS
} from '../modes/studio';

// Studio PDF manipulation tools (lazily loaded for instant startup and optimal memory footprint)
const MergeTool = React.lazy(() => import('../modes/studio/components/tools/MergeTool'));
const SplitTool = React.lazy(() => import('../modes/studio/components/tools/SplitTool'));
const CompressTool = React.lazy(() => import('../modes/studio/components/tools/CompressTool'));
const WatermarkTool = React.lazy(() => import('../modes/studio/components/tools/WatermarkTool'));
const BatesNumberingTool = React.lazy(() => import('../modes/studio/components/tools/BatesNumberingTool'));
const FlattenTool = React.lazy(() => import('../modes/studio/components/tools/FlattenTool'));
const ProtectTool = React.lazy(() => import('../modes/studio/components/tools/ProtectTool'));
const DigitalSignTool = React.lazy(() => import('../modes/studio/components/tools/DigitalSignTool'));
const PrepareFormTool = React.lazy(() => import('../modes/studio/components/tools/PrepareFormTool'));
const OrganizePagesTool = React.lazy(() => import('../modes/studio/components/tools/OrganizePagesTool'));

import { 
  StudySidebar, 
  StudyDashboard, 
  PomodoroProvider, 
  StudySubject 
} from '../modes/study';

import { 
  ReaderSidebar, 
  BookComicHub 
} from '../modes/reader';

interface WorkspacePageProps {
  onReturnToCover: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  // Tabs (controlled from App or TitleBar)
  activeTab?: string;
  controlledActiveTab?: string;
  onSelectTab?: (tab: string) => void;
  onActiveTabChange?: (tab: string) => void;
  onActiveDocChange?: (docName: string | null) => void;
  // Modes (controlled from App or TitleBar)
  currentMode?: AppMode;
  initialMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
  onModeChange?: (mode: AppMode) => void;
}

export default function WorkspacePage({
  onReturnToCover,
  darkMode,
  onToggleDarkMode,
  activeTab: propActiveTab,
  controlledActiveTab,
  onSelectTab: propOnSelectTab,
  onActiveTabChange,
  onActiveDocChange,
  currentMode: propCurrentMode,
  initialMode = 'editor',
  onSelectMode: propOnSelectMode,
  onModeChange,
}: WorkspacePageProps) {
  // 1. Mode & Tab Navigation State
  const effectiveInitialMode = propCurrentMode ?? initialMode ?? 'editor';
  const [currentMode, setCurrentMode] = useState<AppMode>(effectiveInitialMode);

  // Sync mode changes from parent (e.g. TitleBar mode switcher)
  useEffect(() => {
    if (propCurrentMode) {
      setCurrentMode((prev) => (prev !== propCurrentMode ? propCurrentMode : prev));
    }
  }, [propCurrentMode]);

  // Sync data-mode on document.documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', currentMode);
  }, [currentMode]);

  const [internalActiveTabByMode, setInternalActiveTabByMode] = useState<Record<AppMode, string>>(() => {
    try {
      const initial = propActiveTab ?? controlledActiveTab ?? 'recent';
      return {
        editor: localStorage.getItem('inkvault_active_tab_editor') || initial,
        study: localStorage.getItem('inkvault_active_tab_study') || initial,
        reader: localStorage.getItem('inkvault_active_tab_reader') || initial,
      };
    } catch {
      return { editor: 'recent', study: 'recent', reader: 'recent' };
    }
  });

  const activeTab = propActiveTab ?? controlledActiveTab ?? internalActiveTabByMode[currentMode];

  // Sync tab changes from parent (e.g. File menu tools)
  useEffect(() => {
    const incomingTab = propActiveTab ?? controlledActiveTab;
    if (incomingTab) {
      setInternalActiveTabByMode((prev) => {
        if (prev[currentMode] === incomingTab) return prev;
        return { ...prev, [currentMode]: incomingTab };
      });
    }
  }, [propActiveTab, controlledActiveTab, currentMode]);

  const setActiveTab = useCallback((tab: string) => {
    setInternalActiveTabByMode((prev) => {
      const next = { ...prev, [currentMode]: tab };
      try {
        localStorage.setItem(`inkvault_active_tab_${currentMode}`, tab);
      } catch {}
      return next;
    });
    if (onActiveTabChange) onActiveTabChange(tab);
    if (propOnSelectTab) propOnSelectTab(tab);
  }, [currentMode, onActiveTabChange, propOnSelectTab]);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // 2. Documents & Session Management
  const [openDocs, setOpenDocs] = useState<LoadedPDF[]>([]);
  const [recentDocs, setRecentDocs] = useState<LoadedPDF[]>(() => loadMetadataCache());

  const [activeDocIdByMode, setActiveDocIdByMode] = useState<Record<AppMode, string | null>>(() => {
    try {
      return {
        editor: localStorage.getItem('inkvault_active_doc_id_editor') || null,
        study: localStorage.getItem('inkvault_active_doc_id_study') || null,
        reader: localStorage.getItem('inkvault_active_doc_id_reader') || null,
      };
    } catch {
      return { editor: null, study: null, reader: null };
    }
  });

  const activeDocId = activeDocIdByMode[currentMode];

  const setActiveDocId = useCallback((id: string | null) => {
    setActiveDocIdByMode((prev) => {
      const next = { ...prev, [currentMode]: id };
      try {
        if (id) {
          localStorage.setItem(`inkvault_active_doc_id_${currentMode}`, id);
          localStorage.setItem('inkvault_active_doc_id', id);
        } else {
          localStorage.removeItem(`inkvault_active_doc_id_${currentMode}`);
        }
      } catch {}
      return next;
    });
  }, [currentMode]);

  // Segregated documents per mode
  const readerRecentDocs = React.useMemo(() => getDocsForMode(recentDocs, 'reader'), [recentDocs]);
  const studyRecentDocs = React.useMemo(() => getDocsForMode(recentDocs, 'study'), [recentDocs]);
  const studioRecentDocs = React.useMemo(() => getDocsForMode(recentDocs, 'editor'), [recentDocs]);

  // Open documents segregated strictly per mode (Domain Isolation)
  const readerOpenDocs = React.useMemo(() => getDocsForMode(openDocs, 'reader'), [openDocs]);
  const studyOpenDocs = React.useMemo(() => getDocsForMode(openDocs, 'study'), [openDocs]);
  const studioOpenDocs = React.useMemo(() => getDocsForMode(openDocs, 'editor'), [openDocs]);

  // All study documents available (open documents + recent/imported documents for Study Mode)
  const studyAllAvailableDocs = React.useMemo(() => {
    const map = new Map<string, LoadedPDF>();
    for (const d of studyOpenDocs) {
      map.set(d.id, d);
      map.set(d.name, d);
    }
    for (const d of studyRecentDocs) {
      if (!map.has(d.id) && !map.has(d.name)) {
        map.set(d.id, d);
      }
    }
    return Array.from(new Set(map.values()));
  }, [studyOpenDocs, studyRecentDocs]);

  const studioActiveDoc = React.useMemo(() => {
    const id = activeDocIdByMode.editor;
    if (id) {
      const found = studioOpenDocs.find((d) => d.id === id);
      if (found) return found;
    }
    return studioOpenDocs.length > 0 ? studioOpenDocs[0] : null;
  }, [studioOpenDocs, activeDocIdByMode.editor]);

  const studyActiveDoc = React.useMemo(() => {
    const id = activeDocIdByMode.study;
    if (id) {
      const found = studyOpenDocs.find((d) => d.id === id);
      if (found) return found;
    }
    return studyOpenDocs.length > 0 ? studyOpenDocs[0] : null;
  }, [studyOpenDocs, activeDocIdByMode.study]);

  const readerActiveDoc = React.useMemo(() => {
    const id = activeDocIdByMode.reader;
    if (id) {
      const found = readerOpenDocs.find((d) => d.id === id);
      if (found) return found;
    }
    return readerOpenDocs.length > 0 ? readerOpenDocs[0] : null;
  }, [readerOpenDocs, activeDocIdByMode.reader]);

  const activeDoc = React.useMemo(() => {
    if (currentMode === 'reader') return readerActiveDoc;
    if (currentMode === 'study') return studyActiveDoc;
    return studioActiveDoc;
  }, [currentMode, readerActiveDoc, studyActiveDoc, studioActiveDoc]);

  const studioActiveTab = internalActiveTabByMode.editor;
  const studyActiveTab = internalActiveTabByMode.study;
  const readerActiveTab = internalActiveTabByMode.reader;

  const handleModeChange = useCallback((mode: AppMode) => {
    setCurrentMode(mode);
    if (onModeChange) onModeChange(mode);
    if (propOnSelectMode) propOnSelectMode(mode);
  }, [onModeChange, propOnSelectMode]);

  const handleSaveSessionState = useCallback((docId: string, state: any) => {
    tabSessionMapRef.current.set(docId, state);
    setOpenDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              currentPage: state.page,
              pageCount: state.pageCount ?? d.pageCount,
              isFinished: state.isFinished ?? d.isFinished,
              lastReadAt: new Date().toISOString(),
              mode: d.mode || currentMode,
            }
          : d
      )
    );
    setRecentDocs((prev) => {
      const updated = prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              currentPage: state.page,
              pageCount: state.pageCount ?? d.pageCount,
              isFinished: state.isFinished ?? d.isFinished,
              lastReadAt: new Date().toISOString(),
              mode: d.mode || currentMode,
            }
          : d
      );
      saveMetadataCache(updated);
      return updated;
    });
  }, [currentMode]);

  useEffect(() => {
    if (onActiveDocChange) onActiveDocChange(activeDoc ? activeDoc.name : null);
  }, [activeDoc, onActiveDocChange]);

  // 3. Study Subjects State
  const [studySubjects, setStudySubjects] = useState<StudySubject[]>(() => {
    try {
      const saved = localStorage.getItem('inkvault_study_subjects');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string | 'all'>(() => {
    try {
      return localStorage.getItem('inkvault_active_subject_id') || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('inkvault_active_subject_id', activeSubjectId); } catch {}
  }, [activeSubjectId]);

  // Persist studySubjects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('inkvault_study_subjects', JSON.stringify(studySubjects));
    } catch {}
  }, [studySubjects]);

  // Auto-recover subjects from existing coursework documents if missing from localStorage
  useEffect(() => {
    if (studyRecentDocs.length === 0) return;
    setStudySubjects((prev) => {
      const existingNames = new Set(prev.map((s) => s.name.toLowerCase()));
      const toAdd: StudySubject[] = [];
      const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6', '#f97316'];

      studyRecentDocs.forEach((d) => {
        let name = d.subjectName;
        if (!name && d.name.includes('/')) {
          const parts = d.name.replace(/\\/g, '/').split('/');
          if (parts.length > 1 && parts[0]) {
            name = parts[0];
          }
        }
        if (name && !existingNames.has(name.toLowerCase())) {
          existingNames.add(name.toLowerCase());
          toAdd.push({
            id: d.subjectId || `subj-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name,
            color: palette[(prev.length + toAdd.length) % palette.length],
            createdAt: new Date().toISOString(),
            folderPath: d.folderPath,
          });
        }
      });

      if (toAdd.length > 0) {
        return [...prev, ...toAdd];
      }
      return prev;
    });
  }, [studyRecentDocs]);

  // If leaving editor mode while on an offline tool, switch back to viewer or recent
  useEffect(() => {
    if (currentMode !== 'editor' && STUDIO_TOOL_ITEMS.some((t) => t.id === activeTab)) {
      setActiveTab(openDocs.length > 0 ? 'viewer' : 'recent');
    }
  }, [currentMode, activeTab, openDocs.length, setActiveTab]);

  const tabSessionMapRef = useRef<Map<string, { page: number; scale: number; rotation: number; pageRotations?: Record<number, number>; annotations: PDFAnnotation[]; pageCount?: number; isFinished?: boolean }>>(new Map());

  // Restore persistent storage on initial mount
  useEffect(() => {
    let isCancelled = false;
    loadDocumentsFromStorage().then((stored) => {
      if (!isCancelled && stored && stored.length > 0) {
        setRecentDocs((prev) => {
          const combined = [...prev];
          for (const s of stored) {
            if (!combined.some((c) => c.id === s.id || c.name === s.name)) {
              combined.push(s);
            }
          }
          return combined;
        });
      }
    }).catch((err) => console.warn('Storage restore error:', err));
    return () => { isCancelled = true; };
  }, []);

  // 4. Tab selection and instant on-demand file hydration
  const handleSelectTabDoc = useCallback(async (doc: LoadedPDF) => {
    let targetDoc = doc;
    if (!targetDoc.mode) {
      targetDoc = { ...targetDoc, mode: currentMode };
    }
    if (!targetDoc.blobUrl || targetDoc.file.size === 0) {
      const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
      if (isTauri && targetDoc.filePath) {
        try {
          const bytes = await invoke<ArrayBuffer | Uint8Array | number[]>('read_file_bytes', { path: targetDoc.filePath });
          const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
          const blob = new Blob([u8.buffer as ArrayBuffer], { type: 'application/pdf' });
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
      if (idx === -1) return [...prev, targetDoc];
      const next = [...prev];
      next[idx] = targetDoc;
      return next;
    });
    setActiveDocId(targetDoc.id);
    setActiveTab('viewer');
  }, [currentMode, setActiveDocId, setActiveTab]);

  // 5. Document Loader Hook (Delegates I/O, parsing, unzipping, Tauri folder picking)
  const handleDocumentsLoaded = useCallback((newDocs: LoadedPDF[]) => {
    const docsWithMode = newDocs.map((d) => ({
      ...d,
      mode: d.mode || currentMode,
    }));

    setOpenDocs((prev) => {
      const existingNames = new Set(prev.map((d) => d.name));
      const toAdd = docsWithMode.filter((d) => !existingNames.has(d.name));
      return [...prev, ...(toAdd.length > 0 ? toAdd : docsWithMode)];
    });

    setRecentDocs((prev) => {
      const merged = [
        ...docsWithMode,
        ...prev.filter((d) => !docsWithMode.some((nd) => nd.name === d.name)),
      ];
      saveDocumentsToStorage(merged).catch((e) => console.warn('Save documents error:', e));
      return merged;
    });

    setActiveDocId(docsWithMode[0].id);
    if (currentMode === 'study' && docsWithMode.length > 1) {
      setActiveTab('recent');
    } else {
      setActiveTab('viewer');
    }
  }, [currentMode, setActiveDocId, setActiveTab]);

  const {
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
  } = useDocumentLoader({
    currentMode,
    activeSubjectId,
    studySubjects,
    setStudySubjects,
    setActiveSubjectId,
    onDocumentsLoaded: handleDocumentsLoaded,
    onOpenDocDirectly: handleSelectTabDoc,
  });

  // Keyboard shortcut: ⌘O / Ctrl+O and mode switching (⌘1, ⌘2, ⌘3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        if (currentMode === 'study') {
          handleTriggerImportFolder();
        } else {
          handleTriggerOpenFile();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        handleModeChange('editor');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        handleModeChange('study');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        handleModeChange('reader');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerOpenFile, handleTriggerImportFolder, handleModeChange, currentMode]);

  // Tab closing & cache destruction
  const handleCloseTabDoc = useCallback((docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenDocs((prev) => {
      const targetDoc = prev.find((d) => d.id === docId);
      const remaining = prev.filter((d) => d.id !== docId);

      if (targetDoc) {
        const cached = globalDocProxyCache.get(targetDoc.blobUrl);
        if (cached) {
          try { cached.destroy(); } catch {}
          globalDocProxyCache.delete(targetDoc.blobUrl);
        }
        if (targetDoc.blobUrl && targetDoc.blobUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(targetDoc.blobUrl); } catch {}
        }
        globalTextIndexCache.delete(docId);
        tabSessionMapRef.current.delete(docId);
      }

      if (activeDocId === docId) {
        const modeRemaining = getDocsForMode(remaining, currentMode);
        if (modeRemaining.length > 0) {
          setActiveDocId(modeRemaining[0].id);
        } else {
          setActiveDocId(null);
          setActiveTab('recent');
        }
      }
      return remaining;
    });
  }, [activeDocId, currentMode, setActiveDocId, setActiveTab]);

  const handleOpenRecentDoc = useCallback((doc: LoadedPDF) => {
    handleSelectTabDoc(doc);
  }, [handleSelectTabDoc]);

  const handleRemoveRecentDoc = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentDocs((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) {
        try { URL.revokeObjectURL(target.blobUrl); } catch {}
      }
      return prev.filter((d) => d.id !== id);
    });
    handleCloseTabDoc(id);
    removeDocumentFromStorage(id).catch((err) => console.warn('Remove doc error:', err));
  }, [handleCloseTabDoc]);

  const handleRegisterAndOpenDoc = useCallback((generatedDoc: LoadedPDF) => {
    const docWithMode: LoadedPDF = {
      ...generatedDoc,
      mode: generatedDoc.mode || currentMode,
    };
    setOpenDocs((prev) => [...prev.filter((d) => d.id !== docWithMode.id), docWithMode]);
    setRecentDocs((prev) => [docWithMode, ...prev.filter((d) => d.id !== docWithMode.id)]);
    setActiveDocId(docWithMode.id);
    setActiveTab('viewer');
  }, [currentMode, setActiveDocId, setActiveTab]);

  const handleUpdateDocProgress = useCallback((docId: string, newPage: number, isFinished?: boolean) => {
    setRecentDocs((prev) => {
      const updated = prev.map((d) => {
        if (d.id === docId) {
          const finished = isFinished !== undefined 
            ? isFinished 
            : Boolean(d.isFinished || (d.pageCount && d.pageCount > 1 && newPage >= d.pageCount));
          return {
            ...d,
            currentPage: newPage,
            isFinished: finished,
            lastReadAt: new Date().toISOString(),
            mode: d.mode || currentMode,
          };
        }
        return d;
      });
      saveMetadataCache(updated);
      return updated;
    });
    setOpenDocs((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const finished = isFinished !== undefined 
            ? isFinished 
            : Boolean(d.isFinished || (d.pageCount && d.pageCount > 1 && newPage >= d.pageCount));
          return {
            ...d,
            currentPage: newPage,
            isFinished: finished,
            lastReadAt: new Date().toISOString(),
            mode: d.mode || currentMode,
          };
        }
        return d;
      })
    );
  }, [currentMode]);

  const handleDeleteSubject = useCallback(async (subjectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const subject = studySubjects.find((s) => s.id === subjectId);
    if (!window.confirm(`Delete subject "${subject?.name || 'Subject'}"?`)) return;

    setStudySubjects((prev) => {
      const updated = prev.filter((s) => s.id !== subjectId);
      try { localStorage.setItem('inkvault_study_subjects', JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (activeSubjectId === subjectId) {
      setActiveSubjectId('all');
    }

    setRecentDocs((prev) => {
      const updated = prev.map((d) =>
        d.subjectId === subjectId ? { ...d, subjectId: undefined, subjectName: undefined } : d
      );
      saveDocumentsToStorage(updated).catch((err) => console.warn('Update docs error:', err));
      return updated;
    });
  }, [studySubjects, activeSubjectId]);

  return (
    <PomodoroProvider>
      <PomodoroPromptToast />

      {conversionStatus && (
        <div className="fixed inset-x-0 top-6 pointer-events-none z-50 flex justify-center px-4">
          <div className="pointer-events-auto bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-medium border border-zinc-700/50 dark:border-zinc-300/50 animate-in fade-in slide-in-from-top-2">
            <div className="h-3.5 w-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span>{conversionStatus}</span>
          </div>
        </div>
      )}

      <div 
        data-mode={currentMode}
        className="flex w-full h-full overflow-hidden bg-background text-zinc-800 dark:text-zinc-200 transition-colors duration-200"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={currentMode === 'reader' ? '.pdf,.epub,.cbz,.cbr,.cbn,application/pdf,application/epub+zip' : 'application/pdf'}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as any)}
          multiple
          onChange={handleFolderChange}
          className="hidden"
        />

        {/* 1. Left Sidebar Navigation */}
        {!(activeTab === 'viewer' && activeDoc) && isSidebarOpen && (
          <aside className="w-56 sm:w-64 flex-shrink-0 flex flex-col justify-between border-r border-border bg-surface dark:bg-surface p-3 sm:p-4">
            <div className="flex flex-col gap-4">
              {/* Mode-Specific Sidebar Delegation */}
              {currentMode === 'editor' && (
                <StudioSidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onOpenDocument={handleTriggerOpenFile}
                  openDocsCount={studioOpenDocs.length}
                  recentDocsCount={studioRecentDocs.length}
                />
              )}

              {currentMode === 'study' && (
                <StudySidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onTriggerImportFolder={handleTriggerImportFolder}
                  openDocsCount={studyOpenDocs.length}
                  recentDocsCount={studyRecentDocs.length}
                  studySubjects={studySubjects}
                  activeSubjectId={activeSubjectId}
                  onSelectSubject={(id) => {
                    setActiveSubjectId(id);
                    if (activeTab !== 'recent') setActiveTab('recent');
                  }}
                  onDeleteSubject={handleDeleteSubject}
                  recentDocs={studyRecentDocs}
                  activeDocId={activeDoc?.id}
                  onSelectDoc={handleOpenRecentDoc}
                  onRemoveDoc={handleRemoveRecentDoc}
                />
              )}

              {currentMode === 'reader' && (
                <ReaderSidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onTriggerOpenFile={handleTriggerOpenFile}
                  openDocsCount={readerOpenDocs.length}
                  recentDocsCount={readerRecentDocs.length}
                  docs={readerRecentDocs}
                  activeDocId={activeDoc?.id}
                  onSelectDoc={handleOpenRecentDoc}
                  onRemoveDoc={handleRemoveRecentDoc}
                />
              )}

            </div>

            {/* Sidebar Footer — Chamfered Mecha Controls */}
            <div className="flex flex-col gap-2 pt-3 pb-1 border-t border-border flex-shrink-0 font-mono">
              <div className="flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="h-7 flex items-center gap-1.5 px-2.5 [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] text-xs font-mono font-bold bg-card border border-border hover:bg-black/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
                >
                  {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-950" />}
                  <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={onReturnToCover}
                  className="h-7 flex items-center gap-1.5 text-[11px] font-mono font-bold text-zinc-500 hover:text-accent transition-colors px-2 rounded hover:bg-card cursor-pointer"
                  title="Return to Presentation Cover (⌘↵)"
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
          
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-white/90 dark:bg-zinc-950/90 border-2 border-dashed border-accent m-4 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
              <div className="h-16 w-16 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg mb-3 animate-bounce">
                <UploadCloud className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Drop document(s) to open as tabs
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                In-Memory Local Processing • Multi-Tab View
              </p>
            </div>
          )}

          {!(activeTab === 'viewer' && activeDoc) && (
            <header className="h-10 border-b border-border flex items-center justify-between px-3 sm:px-4 bg-surface dark:bg-surface flex-shrink-0 z-20 select-none">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono text-zinc-500 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                  className="h-7 w-7 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] border border-border flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-card transition-colors flex-shrink-0 mr-1 shadow-2xs cursor-pointer"
                >
                  {isSidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
                </button>

                <button 
                  type="button"
                  onClick={onReturnToCover}
                  className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-accent transition-colors flex-shrink-0 font-bold"
                  title="Return to Cover (⌘↵)"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cover</span>
                </button>
                <span className="opacity-40">/</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold flex-shrink-0 uppercase text-[11px] tracking-wider">Workspace</span>
                <span className="opacity-40">/</span>
                <div className="flex items-center gap-1 font-bold text-accent truncate uppercase text-[11px] tracking-wider">
                  <span className="text-[9px]">▶</span>
                  <span>{activeTab.replace('-', ' ')}</span>
                </div>
              </div>

              {currentMode !== 'reader' && (
                <button
                  type="button"
                  onClick={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
                  className="h-7 flex items-center gap-1.5 px-3 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] bg-accent text-accent-on font-mono font-bold text-xs hover:opacity-90 active:translate-y-0.5 transition-all shadow-xs cursor-pointer"
                  title={currentMode === 'study' ? 'Import Folder' : 'Open PDF (⌘O)'}
                >
                  {currentMode === 'study' ? <FolderUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{currentMode === 'study' ? 'Import Folder' : 'Open PDF'}</span>
                  {currentMode !== 'study' && (
                    <span className="text-[9px] opacity-75 font-mono ml-0.5 hidden sm:inline">⌘O</span>
                  )}
                </button>
              )}
            </header>
          )}

          {/* Workspace Canvas Area: Strict Domain-Isolated Viewports */}
          <div className="flex-1 overflow-hidden relative flex flex-col p-0 m-0">

            {/* Subtle Blueprint Grid Background matching FirstPage (Non-Aggressive) */}
            <div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                opacity: darkMode ? 0.05 : 0.03,
                backgroundImage: `
                  linear-gradient(to right, ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 104, 116, 0.18)'} 1px, transparent 1px),
                  linear-gradient(to bottom, ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 104, 116, 0.18)'} 1px, transparent 1px)
                `,
                backgroundSize: '36px 36px',
              }}
            />

            {/* 1. STUDIO VIEWPORT */}
            <div className={`w-full h-full flex flex-col ${currentMode === 'editor' ? 'relative flex-1' : 'absolute inset-0 invisible pointer-events-none -z-10'}`}>
              {studioActiveTab === 'viewer' ? (
                studioActiveDoc ? (
                  <PDFViewer 
                    key={studioActiveDoc.id} 
                    doc={studioActiveDoc} 
                    allDocs={studioOpenDocs}
                    initialPage={tabSessionMapRef.current.get(studioActiveDoc.id)?.page}
                    initialScale={tabSessionMapRef.current.get(studioActiveDoc.id)?.scale}
                    initialRotation={tabSessionMapRef.current.get(studioActiveDoc.id)?.rotation}
                    initialPageRotations={tabSessionMapRef.current.get(studioActiveDoc.id)?.pageRotations}
                    initialAnnotations={tabSessionMapRef.current.get(studioActiveDoc.id)?.annotations}
                    onSaveSessionState={(state) => handleSaveSessionState(studioActiveDoc.id, state)}
                    onCloseDoc={handleCloseTabDoc}
                    onSelectDoc={handleSelectTabDoc}
                    onNewTab={handleTriggerOpenFile}
                    onOpenDocument={handleTriggerOpenFile}
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                    onReturnToCover={onReturnToCover}
                    initialAppMode="editor"
                    onAppModeChange={handleModeChange}
                    isActive={currentMode === 'editor' && studioActiveTab === 'viewer'}
                  />
                ) : (
                  <EmptyState
                    icon={FolderOpen}
                    title="No Document Open"
                    description="Select a PDF document to view and edit."
                    actionLabel="Browse Local Files"
                    actionIcon={Plus}
                    onAction={handleTriggerOpenFile}
                    hint="Or drag & drop files here"
                    hintIcon={UploadCloud}
                  />
                )
              ) : studioActiveTab === 'recent' ? (
                <StudioRecentView
                  docs={studioRecentDocs}
                  activeDocId={studioActiveDoc?.id || null}
                  onOpenDoc={handleOpenRecentDoc}
                  onRemoveDoc={handleRemoveRecentDoc}
                  onTriggerOpenFile={handleTriggerOpenFile}
                />
              ) : (
                <React.Suspense
                  fallback={
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface">
                      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
                      <span className="text-xs font-mono text-muted">Loading Studio Tool…</span>
                    </div>
                  }
                >
                  {studioActiveTab === 'organize' ? (
                    <OrganizePagesTool initialDoc={studioActiveDoc} onOpenOrganizedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'merge' ? (
                    <MergeTool initialDoc={studioActiveDoc} onOpenMergedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'split' ? (
                    <SplitTool initialDoc={studioActiveDoc} onOpenExtractedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'compress' ? (
                    <CompressTool initialDoc={studioActiveDoc} onOpenCompressedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'watermark' ? (
                    <WatermarkTool initialDoc={studioActiveDoc} onOpenWatermarkedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'bates' ? (
                    <BatesNumberingTool initialDoc={studioActiveDoc} onOpenBatesDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'flatten' ? (
                    <FlattenTool initialDoc={studioActiveDoc} onOpenFlattenedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'protect' ? (
                    <ProtectTool initialDoc={studioActiveDoc} onOpenProtectedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'sign' ? (
                    <DigitalSignTool initialDoc={studioActiveDoc} onOpenSignedDoc={handleRegisterAndOpenDoc} />
                  ) : studioActiveTab === 'forms' ? (
                    <PrepareFormTool initialDoc={studioActiveDoc} onOpenFormDoc={handleRegisterAndOpenDoc} />
                  ) : null}
                </React.Suspense>
              )}
            </div>

            {/* 2. STUDY VIEWPORT */}
            <div className={`w-full h-full flex flex-col ${currentMode === 'study' ? 'relative flex-1' : 'absolute inset-0 invisible pointer-events-none -z-10'}`}>
              {studyActiveTab === 'viewer' ? (
                studyActiveDoc ? (
                  <PDFViewer 
                    key={studyActiveDoc.id} 
                    doc={studyActiveDoc} 
                    allDocs={studyAllAvailableDocs}
                    initialPage={tabSessionMapRef.current.get(studyActiveDoc.id)?.page}
                    initialScale={tabSessionMapRef.current.get(studyActiveDoc.id)?.scale}
                    initialRotation={tabSessionMapRef.current.get(studyActiveDoc.id)?.rotation}
                    initialPageRotations={tabSessionMapRef.current.get(studyActiveDoc.id)?.pageRotations}
                    initialAnnotations={tabSessionMapRef.current.get(studyActiveDoc.id)?.annotations}
                    onSaveSessionState={(state) => handleSaveSessionState(studyActiveDoc.id, state)}
                    onCloseDoc={handleCloseTabDoc}
                    onSelectDoc={handleSelectTabDoc}
                    onNewTab={handleTriggerImportFolder}
                    onOpenDocument={handleTriggerImportFolder}
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                    onReturnToCover={onReturnToCover}
                    initialAppMode="study"
                    onAppModeChange={handleModeChange}
                    isActive={currentMode === 'study' && studyActiveTab === 'viewer'}
                  />
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title="Import Subject Folder"
                    description="Select a folder to organize your study documents."
                    actionLabel="Select Folder from Computer"
                    actionIcon={FolderUp}
                    onAction={handleTriggerImportFolder}
                    hint="Or drag & drop a folder here"
                    hintIcon={Folder}
                  />
                )
              ) : studyActiveTab === 'recent' ? (
                <StudyDashboard
                  studySubjects={studySubjects}
                  recentDocs={studyRecentDocs}
                  activeSubjectId={activeSubjectId}
                  onSelectSubject={setActiveSubjectId}
                  activeDocId={studyActiveDoc?.id || null}
                  onOpenDoc={handleOpenRecentDoc}
                  onRemoveDoc={handleRemoveRecentDoc}
                  onTriggerImportFolder={handleTriggerImportFolder}
                  onTriggerOpenFile={handleTriggerOpenFile}
                />
              ) : null}
            </div>

            {/* 3. READER VIEWPORT */}
            <div className={`w-full h-full flex flex-col ${currentMode === 'reader' ? 'relative flex-1' : 'absolute inset-0 invisible pointer-events-none -z-10'}`}>
              {readerActiveTab === 'viewer' ? (
                readerActiveDoc ? (
                  <PDFViewer 
                    key={readerActiveDoc.id} 
                    doc={readerActiveDoc} 
                    allDocs={readerOpenDocs}
                    initialPage={tabSessionMapRef.current.get(readerActiveDoc.id)?.page}
                    initialScale={tabSessionMapRef.current.get(readerActiveDoc.id)?.scale}
                    initialRotation={tabSessionMapRef.current.get(readerActiveDoc.id)?.rotation}
                    initialPageRotations={tabSessionMapRef.current.get(readerActiveDoc.id)?.pageRotations}
                    initialAnnotations={tabSessionMapRef.current.get(readerActiveDoc.id)?.annotations}
                    onSaveSessionState={(state) => handleSaveSessionState(readerActiveDoc.id, state)}
                    onCloseDoc={handleCloseTabDoc}
                    onSelectDoc={handleSelectTabDoc}
                    onNewTab={handleTriggerOpenFile}
                    onOpenDocument={handleTriggerOpenFile}
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                    onReturnToCover={onReturnToCover}
                    initialAppMode="reader"
                    onAppModeChange={handleModeChange}
                    isActive={currentMode === 'reader' && readerActiveTab === 'viewer'}
                  />
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="Your Bookshelf is Empty"
                    description="Add books or comics to start reading."
                    actionLabel="Add Book or Comic"
                    actionIcon={Plus}
                    onAction={handleTriggerOpenFile}
                    shortcut="⌘O"
                    hint="Or drag & drop files here"
                    hintIcon={BookOpen}
                  />
                )
              ) : readerActiveTab === 'recent' ? (
                <BookComicHub
                  docs={readerRecentDocs.length > 0 ? readerRecentDocs : readerOpenDocs}
                  onOpenDoc={handleOpenRecentDoc}
                  onImportBook={handleTriggerOpenFile}
                  onRemoveDoc={(id) => handleRemoveRecentDoc(id)}
                  onUpdateDocProgress={handleUpdateDocProgress}
                  darkMode={darkMode}
                />
              ) : null}
            </div>

          </div>

        </main>
      </div>
    </PomodoroProvider>
  );
}
