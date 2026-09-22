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
  BookOpen 
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
  saveMetadataCache 
} from '../utils/documentStorage';
import { useDocumentLoader } from '../hooks/useDocumentLoader';

// Domain Modules
import { 
  StudioSidebar, 
  StudioRecentView, 
  MergeTool, 
  SplitTool, 
  CompressTool, 
  WatermarkTool, 
  ProtectTool,
  STUDIO_TOOL_ITEMS
} from '../modes/studio';

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

function ToolLoadingFallback() {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-background gap-3 min-h-[300px]">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <span className="text-xs font-mono text-zinc-400">Loading module...</span>
    </div>
  );
}

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
  // 1. Mode & Tab Navigation State
  const [currentMode, setCurrentMode] = useState<AppMode>(initialMode);

  useEffect(() => {
    if (initialMode) setCurrentMode(initialMode);
  }, [initialMode]);

  const [internalActiveTab, setInternalActiveTab] = useState<string>('recent');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = useCallback((tab: string) => {
    setInternalActiveTab(tab);
    if (onActiveTabChange) onActiveTabChange(tab);
  }, [onActiveTabChange]);

  const handleModeChange = useCallback((mode: AppMode) => {
    setCurrentMode(mode);
    if (mode === 'reader') {
      setActiveTab('recent');
    }
    if (onModeChange) onModeChange(mode);
  }, [onModeChange, setActiveTab]);

  // 2. Documents & Session Management
  const [openDocs, setOpenDocs] = useState<LoadedPDF[]>([]);
  const [recentDocs, setRecentDocs] = useState<LoadedPDF[]>(() => loadMetadataCache());

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
    if (onActiveDocChange) onActiveDocChange(activeDoc ? activeDoc.name : null);
    if (activeDocId) {
      try { localStorage.setItem('inkvault_active_doc_id', activeDocId); } catch {}
    }
  }, [activeDoc, activeDocId, onActiveDocChange]);

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

  // If leaving editor mode while on an offline tool, switch back to viewer or recent
  useEffect(() => {
    if (currentMode !== 'editor' && STUDIO_TOOL_ITEMS.some((t) => t.id === activeTab)) {
      setActiveTab(openDocs.length > 0 ? 'viewer' : 'recent');
    }
  }, [currentMode, activeTab, openDocs.length, setActiveTab]);

  const tabSessionMapRef = useRef<Map<string, { page: number; scale: number; rotation: number; annotations: PDFAnnotation[] }>>(new Map());

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
      if (idx === -1) return [...prev, targetDoc];
      const next = [...prev];
      next[idx] = targetDoc;
      return next;
    });
    setActiveDocId(targetDoc.id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  // 5. Document Loader Hook (Delegates I/O, parsing, unzipping, Tauri folder picking)
  const handleDocumentsLoaded = useCallback((newDocs: LoadedPDF[]) => {
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
  }, [currentMode, setActiveTab]);

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
      const targetIndex = prev.findIndex((d) => d.id === docId);
      if (targetIndex === -1) return prev;
      const remaining = prev.filter((d) => d.id !== docId);

      if (targetDoc) {
        const cached = globalDocProxyCache.get(targetDoc.blobUrl);
        if (cached) {
          try { cached.destroy(); } catch {}
          globalDocProxyCache.delete(targetDoc.blobUrl);
        }
        globalTextIndexCache.delete(docId);
        tabSessionMapRef.current.delete(docId);
      }

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
    setOpenDocs((prev) => [...prev.filter((d) => d.id !== generatedDoc.id), generatedDoc]);
    setRecentDocs((prev) => [generatedDoc, ...prev.filter((d) => d.id !== generatedDoc.id)]);
    setActiveDocId(generatedDoc.id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  const handleUpdateDocProgress = useCallback((docId: string, newPage: number) => {
    setRecentDocs((prev) => {
      const updated = prev.map((d) =>
        d.id === docId ? { ...d, currentPage: newPage, lastReadAt: new Date().toISOString() } : d
      );
      saveMetadataCache(updated);
      return updated;
    });
    setOpenDocs((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, currentPage: newPage, lastReadAt: new Date().toISOString() } : d
      )
    );
  }, []);

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
        {!(activeTab === 'viewer' && activeDoc) && (
          <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-border bg-surface dark:bg-surface p-4">
            <div className="flex flex-col gap-4">
              {/* Mode-Specific Sidebar Delegation */}
              {currentMode === 'editor' && (
                <StudioSidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onOpenDocument={handleTriggerOpenFile}
                  openDocsCount={openDocs.length}
                  recentDocsCount={recentDocs.length}
                />
              )}

              {currentMode === 'study' && (
                <StudySidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onTriggerImportFolder={handleTriggerImportFolder}
                  openDocsCount={openDocs.length}
                  recentDocsCount={recentDocs.length}
                  studySubjects={studySubjects}
                  activeSubjectId={activeSubjectId}
                  onSelectSubject={(id) => {
                    setActiveSubjectId(id);
                    if (activeTab !== 'recent') setActiveTab('recent');
                  }}
                  onDeleteSubject={handleDeleteSubject}
                  recentDocs={recentDocs}
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
                  openDocsCount={openDocs.length}
                  recentDocsCount={recentDocs.length}
                />
              )}

            </div>

            {/* Sidebar Footer */}
            <div className="flex flex-col gap-2 pt-3 pb-1 border-t border-border flex-shrink-0">
              <div className="flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-card border border-border hover:bg-surface dark:hover:bg-surface transition-colors shadow-xs"
                >
                  {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-600" />}
                  <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  type="button"
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
            <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-surface dark:bg-surface flex-shrink-0 z-20">
              <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 min-w-0">
                <button 
                  type="button"
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

              {currentMode !== 'reader' && (
                <button
                  type="button"
                  onClick={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors shadow-sm"
                >
                  {currentMode === 'study' ? <FolderUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{currentMode === 'study' ? 'Import Folder' : 'Open PDF'}</span>
                </button>
              )}
            </header>
          )}

          {/* Workspace Canvas Area */}
          <div className="flex-1 overflow-hidden relative flex flex-col p-0 m-0">
            <React.Suspense fallback={<ToolLoadingFallback />}>
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
                    onCloseDoc={handleCloseTabDoc}
                    onSelectDoc={handleSelectTabDoc}
                    onNewTab={handleTriggerOpenFile}
                    onOpenDocument={handleTriggerOpenFile}
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                    onReturnToCover={onReturnToCover}
                    initialAppMode={currentMode}
                    onAppModeChange={handleModeChange}
                  />
                ) : (
                  <EmptyState
                    icon={currentMode === 'study' ? FolderUp : currentMode === 'reader' ? BookOpen : FolderOpen}
                    title={
                      currentMode === 'study'
                        ? 'Import a Study Subject Folder'
                        : currentMode === 'reader'
                        ? 'Open a Book or Comic'
                        : 'Select a PDF to view'
                    }
                    description={
                      currentMode === 'study'
                        ? 'Select a folder from your computer or drag and drop any folder directly into the workspace to organize it by subject.'
                        : currentMode === 'reader'
                        ? 'Select a CBZ, CBR, EPUB, or PDF document to start reading.'
                        : 'Click to open file manager or drag and drop one or more PDF documents anywhere into the workspace.'
                    }
                    actionLabel={
                      currentMode === 'study'
                        ? 'Select Folder from Computer'
                        : currentMode === 'reader'
                        ? 'Browse Books & Comics'
                        : 'Browse Local Files'
                    }
                    onAction={currentMode === 'study' ? handleTriggerImportFolder : handleTriggerOpenFile}
                    hint={currentMode === 'study' ? 'or drag and drop folder anywhere' : 'or drag and drop document anywhere'}
                  />
                )
              ) : activeTab === 'recent' ? (
                currentMode === 'reader' ? (
                  <BookComicHub
                    docs={recentDocs.length > 0 ? recentDocs : openDocs}
                    onOpenDoc={handleOpenRecentDoc}
                    onImportBook={handleTriggerOpenFile}
                    onRemoveDoc={(id) => handleRemoveRecentDoc(id)}
                    onUpdateDocProgress={handleUpdateDocProgress}
                    darkMode={darkMode}
                  />
                ) : currentMode === 'study' ? (
                  <StudyDashboard
                    studySubjects={studySubjects}
                    recentDocs={recentDocs}
                    activeSubjectId={activeSubjectId}
                    onSelectSubject={setActiveSubjectId}
                    activeDocId={activeDoc?.id || null}
                    onOpenDoc={handleOpenRecentDoc}
                    onRemoveDoc={handleRemoveRecentDoc}
                    onTriggerImportFolder={handleTriggerImportFolder}
                    onTriggerOpenFile={handleTriggerOpenFile}
                  />
                ) : (
                  <StudioRecentView
                    docs={recentDocs}
                    activeDocId={activeDoc?.id || null}
                    onOpenDoc={handleOpenRecentDoc}
                    onRemoveDoc={handleRemoveRecentDoc}
                    onTriggerOpenFile={handleTriggerOpenFile}
                  />
                )
              ) : activeTab === 'merge' ? (
                <MergeTool initialDoc={activeDoc} onOpenMergedDoc={handleRegisterAndOpenDoc} />
              ) : activeTab === 'split' ? (
                <SplitTool initialDoc={activeDoc} onOpenExtractedDoc={handleRegisterAndOpenDoc} />
              ) : activeTab === 'compress' ? (
                <CompressTool initialDoc={activeDoc} onOpenCompressedDoc={handleRegisterAndOpenDoc} />
              ) : activeTab === 'watermark' ? (
                <WatermarkTool initialDoc={activeDoc} onOpenWatermarkedDoc={handleRegisterAndOpenDoc} />
              ) : activeTab === 'protect' ? (
                <ProtectTool initialDoc={activeDoc} onOpenProtectedDoc={handleRegisterAndOpenDoc} />
              ) : null}
            </React.Suspense>
          </div>

        </main>
      </div>
    </PomodoroProvider>
  );
}
