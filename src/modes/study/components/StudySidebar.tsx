import React, { useMemo } from 'react';
import { 
  FolderUp, 
  GraduationCap, 
  BookOpen, 
  Folder, 
  Trash2 
} from 'lucide-react';
import { LoadedPDF } from '../../../types';
import { StudySubject } from '../types';
import FolderTreeExplorer from './FolderTreeExplorer';

export interface StudySidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onTriggerImportFolder: () => void;
  openDocsCount: number;
  recentDocsCount: number;
  studySubjects: StudySubject[];
  activeSubjectId: string | 'all';
  onSelectSubject: (subjectId: string | 'all') => void;
  onDeleteSubject: (subjectId: string, e: React.MouseEvent) => void;
  recentDocs: LoadedPDF[];
  activeDocId?: string;
  onSelectDoc: (doc: LoadedPDF) => void;
  onRemoveDoc: (docId: string, e?: React.MouseEvent) => void;
}

export const StudySidebar: React.FC<StudySidebarProps> = ({
  activeTab,
  onSelectTab,
  onTriggerImportFolder,
  openDocsCount,
  recentDocsCount,
  studySubjects,
  activeSubjectId,
  onSelectSubject,
  onDeleteSubject,
  recentDocs,
  activeDocId,
  onSelectDoc,
  onRemoveDoc,
}) => {
  // Derive effective subjects if studySubjects is not yet populated from storage
  const effectiveSubjects = useMemo(() => {
    if (studySubjects && studySubjects.length > 0) return studySubjects;
    const map = new Map<string, StudySubject>();
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'];
    let colorIdx = 0;
    for (const doc of recentDocs) {
      let subName = doc.subjectName;
      if (!subName && doc.name.includes('/')) {
        const parts = doc.name.replace(/\\/g, '/').split('/');
        if (parts.length > 1 && parts[0]) {
          subName = parts[0];
        }
      }
      if (subName && !map.has(subName.toLowerCase())) {
        map.set(subName.toLowerCase(), {
          id: doc.subjectId || `subj-${subName.toLowerCase().replace(/\s+/g, '-')}`,
          name: subName,
          color: palette[colorIdx % palette.length],
          createdAt: new Date().toISOString(),
          folderPath: doc.folderPath,
        });
        colorIdx++;
      }
    }
    return Array.from(map.values());
  }, [studySubjects, recentDocs]);

  const activeSubject = activeSubjectId !== 'all'
    ? effectiveSubjects.find((s) => s.id === activeSubjectId)
    : null;

  const displayedDocs = activeSubjectId === 'all'
    ? recentDocs
    : recentDocs.filter(
        (d) => d.subjectId === activeSubjectId || d.subjectName === activeSubject?.name
      );

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onTriggerImportFolder}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-md bg-accent hover:opacity-95 text-accent-on font-mono font-bold text-xs uppercase tracking-wider shadow-xs active:translate-y-0.5 transition-all cursor-pointer group"
      >
        <span className="flex items-center gap-2">
          <FolderUp className="h-4 w-4" />
          <span>Import Folder</span>
        </span>
        <span className="text-[9px] font-mono opacity-80 border px-1.5 py-0.5 rounded" style={{ borderColor: 'currentColor' }}>
          ⌘O
        </span>
      </button>

      {/* Main Academics Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1">
          Academics
        </span>

        {/* Study Reader */}
        <button
          type="button"
          onClick={() => onSelectTab('viewer')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold outline-none focus:outline-none select-none transition-all duration-100 rounded-md ${
            activeTab === 'viewer'
              ? 'bg-accent/15 text-accent border-l-2 border-accent shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-zinc-100 border-l-2 border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4" />
            <span>Study Reader</span>
          </span>
          {openDocsCount > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'viewer' ? 'bg-accent/20 text-accent font-bold' : 'bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
            }`}>
              {openDocsCount}
            </span>
          )}
        </button>

        {/* Study Subjects */}
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold outline-none focus:outline-none select-none transition-all duration-100 rounded-md ${
            activeTab === 'recent'
              ? 'bg-accent/15 text-accent border-l-2 border-accent shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-zinc-100 border-l-2 border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <GraduationCap className="h-4 w-4" />
            <span>Study Subjects</span>
          </span>
          {recentDocsCount > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'recent' ? 'bg-accent/20 text-accent font-bold' : 'bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
            }`}>
              {recentDocsCount}
            </span>
          )}
        </button>
      </div>

      {/* Subjects & Folders Tree Explorer */}
      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
            <Folder className="h-3 w-3 text-accent" /> Subjects & Folders
          </span>
          <button
            type="button"
            onClick={onTriggerImportFolder}
            title="Import Folder from Computer"
            className="px-2 py-0.5 rounded text-zinc-500 dark:text-zinc-400 hover:text-accent hover:bg-card transition-colors flex items-center gap-1 text-[11px] font-medium"
          >
            <FolderUp className="h-3.5 w-3.5 text-accent" />
            <span>Import</span>
          </button>
        </div>

        {/* Subject Filter Pills (When subjects exist) */}
        {effectiveSubjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 no-scrollbar">
            <button
              type="button"
              onClick={() => onSelectSubject('all')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${
                activeSubjectId === 'all'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                  : 'bg-card hover:bg-surface text-zinc-600 dark:text-zinc-400 border border-border'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-70 font-mono">({recentDocs.length})</span>
            </button>

            {effectiveSubjects.map((sub) => {
              const isSelected = activeSubjectId === sub.id;
              const count = recentDocs.filter(
                (d) => d.subjectId === sub.id || d.subjectName === sub.name
              ).length;
              return (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubject(sub.id)}
                  className={`group/pill flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all shrink-0 ${
                    isSelected
                      ? 'bg-card text-zinc-900 dark:text-zinc-100 border border-border shadow-2xs font-semibold'
                      : 'bg-surface hover:bg-card text-zinc-600 dark:text-zinc-400 border border-border'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="truncate max-w-[90px]">{sub.name}</span>
                  <span className="text-[10px] opacity-70 font-mono">({count})</span>
                  {onDeleteSubject && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSubject(sub.id, e);
                      }}
                      title={`Delete ${sub.name}`}
                      className="opacity-0 group-hover/pill:opacity-100 hover:text-rose-500 text-zinc-400 transition-opacity p-0.5 rounded"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tree Explorer in Sidebar */}
        {displayedDocs.length > 0 ? (
          <div className="flex flex-col max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            <FolderTreeExplorer
              docs={displayedDocs}
              activeDocId={activeDocId}
              onSelectDoc={onSelectDoc}
              onRemoveDoc={onRemoveDoc}
              isCompact={true}
              showControls={displayedDocs.length > 5}
            />
          </div>
        ) : (
          <div className="px-2 py-3 rounded-lg border border-dashed border-border bg-card/40 text-center">
            <p className="text-[11px] text-zinc-400">
              {activeSubject
                ? `No documents in "${activeSubject.name}".`
                : 'No subjects yet. Import or drop a folder.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudySidebar;
