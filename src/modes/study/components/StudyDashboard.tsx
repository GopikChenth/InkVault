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
import StudySubjectSetupCard from './StudySubjectSetupCard';

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

  if (studySubjects.length === 0 && recentDocs.length === 0) {
    return <StudySubjectSetupCard onTriggerImportFolder={onTriggerImportFolder} />;
  }

  const activeSubject = activeSubjectId !== 'all' 
    ? studySubjects.find((s) => s.id === activeSubjectId) 
    : null;

  const displayedDocs = activeSubjectId === 'all'
    ? recentDocs
    : recentDocs.filter(
        (d) => d.subjectId === activeSubjectId || d.subjectName === activeSubject?.name
      );

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-4xl mx-auto w-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-2xs flex-shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeSubject ? activeSubject.name : 'Study Subjects & Coursework'}
                </h2>
                <p className="text-xs text-zinc-500 truncate">
                  {activeSubject
                    ? `Imported subject directory • ${displayedDocs.length} documents`
                    : 'Organized local folders & study materials for distraction-free revision'}
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
                onClick={onTriggerImportFolder}
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
                onClick={() => onSelectSubject('all')}
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
                    onClick={() => onSelectSubject(sub.id)}
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

        {/* Content Area */}
        {displayedDocs.length === 0 ? (
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
                onClick={onTriggerImportFolder}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-2xs"
              >
                <FolderUp className="h-3.5 w-3.5" />
                <span>Import Folder</span>
              </button>
              <button
                type="button"
                onClick={onTriggerOpenFile}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-card transition-colors shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add PDF</span>
              </button>
            </div>
          </div>
        ) : studyExplorerView === 'tree' ? (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
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
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Active
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

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => onRemoveDoc(doc.id, e)}
                      title="Remove from session"
                      className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => onOpenDoc(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors"
                    >
                      <span>{isCurrentlyActive ? 'View' : 'Open'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyDashboard;
