import React from 'react';
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
  return (
    <div className="flex flex-col gap-6">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onTriggerImportFolder}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm group active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          <FolderUp className="h-4 w-4" />
          <span>Import Folder</span>
        </span>
        <span className="text-[10px] font-mono opacity-60 bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded">
          ⌘O
        </span>
      </button>

      {/* Main Academics Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
          Academics
        </span>

        {/* Study Reader */}
        <button
          type="button"
          onClick={() => onSelectTab('viewer')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'viewer'
              ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4" />
            <span>Study Reader</span>
          </span>
          {openDocsCount > 0 && (
            <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
              {openDocsCount}
            </span>
          )}
        </button>

        {/* Study Subjects */}
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'recent'
              ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <GraduationCap className="h-4 w-4" />
            <span>Study Subjects</span>
          </span>
          {recentDocsCount > 0 && (
            <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
              {recentDocsCount}
            </span>
          )}
        </button>
      </div>

      {/* Subjects / Folders Nav Group */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
            <Folder className="h-3 w-3 text-accent" /> Subjects
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

        {/* All Subjects pill */}
        <button
          type="button"
          onClick={() => onSelectSubject('all')}
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
                  onClick={() => onSelectSubject(sub.id)}
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
                      onClick={(e) => onDeleteSubject(sub.id, e)}
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
                      activeDocId={activeDocId}
                      onSelectDoc={onSelectDoc}
                      onRemoveDoc={onRemoveDoc}
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
          <div className="px-2 py-3 rounded-lg border border-dashed border-border bg-card/40 text-center">
            <p className="text-[11px] text-zinc-400">
              No subjects yet. Click Import or drop a folder to organize coursework.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudySidebar;
