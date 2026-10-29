import React, { useState } from 'react';
import { 
  Folder, 
  FolderUp, 
  GraduationCap, 
  FolderTree, 
  LayoutGrid, 
  FileText, 
  Trash2, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Plus 
} from 'lucide-react';
import { LoadedPDF } from '../../../types';
import { StudySubject, StudyExplorerView } from '../types';
import FolderTreeExplorer from './FolderTreeExplorer';
import EmptyState from '../../../components/EmptyState';

export interface StudyDashboardProps {
  studySubjects: StudySubject[];
  recentDocs: LoadedPDF[];
  activeSubjectId: string | 'all';
  onSelectSubject: (id: string | 'all') => void;
  activeDocId: string | null;
  onOpenDoc: (doc: LoadedPDF) => void;
  onRemoveDoc: (docId: string, e?: React.MouseEvent) => void;
  onTriggerImportFolder: () => void;
  onTriggerOpenFile: () => void;
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({
  studySubjects,
  recentDocs,
  activeSubjectId,
  onSelectSubject,
  activeDocId,
  onOpenDoc,
  onRemoveDoc,
  onTriggerImportFolder,
  onTriggerOpenFile,
}) => {
  const [studyExplorerView, setStudyExplorerView] = useState<StudyExplorerView>('tree');

  const isLibraryEmpty = studySubjects.length === 0 && recentDocs.length === 0;

  const activeSubject = activeSubjectId !== 'all' 
    ? studySubjects.find((s) => s.id === activeSubjectId) 
    : null;

  const displayedDocs = activeSubjectId === 'all'
    ? recentDocs
    : recentDocs.filter(
        (d) => d.subjectId === activeSubjectId || d.subjectName === activeSubject?.name
      );

  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-background text-zinc-900 dark:text-zinc-100 flex flex-col select-none">
      {/* 1. Constraint-Aligned Mecha Header Bar (NO SUBTEXT) */}
      <header className="px-4 sm:px-6 md:px-8 h-11 border-b border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md flex items-center justify-between gap-3 flex-shrink-0 z-20 select-none">
        {/* Left: Icon + Title + Count Badge */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <div className="h-7 w-7 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-2xs flex-shrink-0">
            <GraduationCap className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-50 tracking-tight whitespace-nowrap flex items-center gap-1.5 font-sans">
              <span className="text-accent font-black text-[9px]">▶</span>
              <span>{activeSubject ? activeSubject.name : 'Study Subjects & Coursework'}</span>
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] bg-accent/15 border border-accent/25 text-accent flex-shrink-0">
              {displayedDocs.length} {displayedDocs.length === 1 ? 'DOC' : 'DOCS'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 font-mono">
          {/* Tree / Cards View Toggle */}
          <div className="flex items-center gap-0.5 bg-surface dark:bg-card border border-border p-0.5 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] shadow-2xs">
            <button
              type="button"
              onClick={() => setStudyExplorerView('tree')}
              title="Tree Folder View"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                studyExplorerView === 'tree'
                  ? 'bg-accent text-accent-on shadow-2xs [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)]'
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
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                studyExplorerView === 'cards'
                  ? 'bg-accent text-accent-on shadow-2xs [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)]'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onTriggerImportFolder}
            className="h-7 flex items-center gap-1.5 px-3.5 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] bg-accent hover:opacity-90 active:translate-y-0.5 text-accent-on font-mono font-bold text-xs transition-all shadow-xs cursor-pointer"
            title="Import Subject Folder (⌘O)"
          >
            <FolderUp className="h-3.5 w-3.5" />
            <span>Import Folder</span>
          </button>
        </div>
      </header>

      {/* 2. Responsive Subject Filter Pills Bar */}
      {studySubjects.length > 0 && (
        <div className="px-4 sm:px-6 md:px-8 py-2 border-b border-border bg-surface/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 text-xs font-mono">
          <button
            type="button"
            onClick={() => onSelectSubject('all')}
            className={`flex items-center gap-1.5 px-3 py-1 [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] text-xs font-bold transition-all cursor-pointer ${
              activeSubjectId === 'all'
                ? 'bg-accent text-accent-on shadow-2xs'
                : 'bg-surface hover:bg-card text-zinc-600 dark:text-zinc-400 border border-border'
            }`}
          >
            <span>ALL</span>
            <span className="text-[10px] opacity-70">({recentDocs.length})</span>
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
                onClick={() => onSelectSubject(sub.id)}
                className={`flex items-center gap-1.5 px-3 py-1 [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-card text-zinc-900 dark:text-zinc-100 border border-border shadow-2xs'
                    : 'bg-surface hover:bg-card text-zinc-600 dark:text-zinc-400 border border-border'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sub.color }}
                />
                <span>{sub.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Main Viewport Canvas */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto flex flex-col">
        {isLibraryEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={GraduationCap}
              title="Import Subject Folder"
              description="Select a folder to organize coursework, notes, and textbook PDFs."
              actionLabel="Select Folder from Computer"
              actionIcon={FolderUp}
              onAction={onTriggerImportFolder}
              hint="Or drag & drop folder here"
              hintIcon={Folder}
            />
          </div>
        ) : displayedDocs.length === 0 ? (
          <div className="my-auto py-12 text-center flex flex-col items-center select-none animate-in fade-in duration-150 [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] border border-border bg-card/60 p-8 max-w-md mx-auto">
            <div 
              className="h-12 w-12 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] flex items-center justify-center mb-3 shadow-2xs text-white"
              style={{ backgroundColor: activeSubject ? activeSubject.color : 'var(--color-accent, #6366f1)' }}
            >
              <Folder className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans">
              No documents in {activeSubject ? `"${activeSubject.name}"` : 'this category'} yet
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-1 max-w-sm">
              Select a folder from your computer or add documents to organize them under this subject.
            </p>
            <div className="mt-4 flex items-center gap-2.5 font-mono">
              <button
                type="button"
                onClick={onTriggerImportFolder}
                className="flex items-center gap-1.5 px-3.5 py-1.5 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] bg-accent text-accent-on text-xs font-bold hover:opacity-90 active:translate-y-0.5 transition-all shadow-xs cursor-pointer"
              >
                <FolderUp className="h-3.5 w-3.5" />
                <span>Import Folder</span>
              </button>
              <button
                type="button"
                onClick={onTriggerOpenFile}
                className="flex items-center gap-1.5 px-3.5 py-1.5 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] border border-border bg-surface text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-card transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add PDF</span>
              </button>
            </div>
          </div>
        ) : studyExplorerView === 'tree' ? (
          <div className="bg-card border border-border [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] p-4 shadow-sm">
            <FolderTreeExplorer
              docs={displayedDocs}
              activeDocId={activeDocId || undefined}
              onSelectDoc={onOpenDoc}
              onRemoveDoc={onRemoveDoc}
              subjectName={activeSubject ? activeSubject.name : 'Coursework Documents'}
              subjectColor={activeSubject ? activeSubject.color : undefined}
              showControls={true}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {displayedDocs.map((doc) => {
              const isCurrentlyActive = activeDocId === doc.id;
              const subColor = studySubjects.find(
                (s) => s.id === doc.subjectId || s.name === doc.subjectName
              )?.color;
              const formattedTime = doc.loadedAt instanceof Date
                ? doc.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(doc.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className={`flex items-center justify-between p-3.5 rounded-lg [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))] bg-card border transition-all shadow-sm cursor-pointer group [content-visibility:auto] ${
                    isCurrentlyActive 
                      ? 'border-accent/60 bg-accent/[0.04]' 
                      : 'border-border hover:border-accent/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`h-10 w-10 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                      isCurrentlyActive 
                        ? 'bg-accent text-accent-on' 
                        : 'bg-surface text-zinc-700 dark:text-zinc-300 group-hover:bg-accent/15 group-hover:text-accent'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors truncate font-sans">
                          {doc.name}
                        </h4>
                        {doc.subjectName && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] border flex-shrink-0"
                            style={{
                              backgroundColor: subColor ? `${subColor}15` : 'rgba(99, 102, 241, 0.1)',
                              borderColor: subColor ? `${subColor}35` : 'rgba(99, 102, 241, 0.25)',
                              color: subColor || '#6366f1',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: subColor || '#6366f1' }}
                            />
                            {doc.subjectName}
                          </span>
                        )}
                        {isCurrentlyActive && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <button
                      type="button"
                      onClick={(e) => onRemoveDoc(doc.id, e)}
                      title="Remove from session"
                      className="h-7 w-7 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => onOpenDoc(doc)}
                      className="h-7 flex items-center gap-1 px-3 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] bg-accent text-accent-on text-xs font-bold hover:opacity-90 active:translate-y-0.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <span>{isCurrentlyActive ? 'VIEW' : 'OPEN'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudyDashboard;
