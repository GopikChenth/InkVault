import React from 'react';
import { 
  Plus, 
  BookMarked,
  BookOpen,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { LoadedPDF } from '../../../types';

export interface ReaderSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onTriggerOpenFile: () => void;
  openDocsCount: number;
  recentDocsCount: number;
  docs?: LoadedPDF[];
  activeDocId?: string | null;
  onSelectDoc?: (doc: LoadedPDF) => void;
  onRemoveDoc?: (docId: string, e?: React.MouseEvent) => void;
}

export const ReaderSidebar: React.FC<ReaderSidebarProps> = ({
  activeTab,
  onSelectTab,
  onTriggerOpenFile,
  openDocsCount,
  recentDocsCount,
  docs = [],
  activeDocId,
  onSelectDoc,
  onRemoveDoc,
}) => {
  const totalCount = docs.length > 0 ? docs.length : (recentDocsCount > 0 ? recentDocsCount : openDocsCount);

  const getFormatBadge = (doc: LoadedPDF) => {
    const lower = doc.name.toLowerCase();
    if (doc.isComic || lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn')) {
      return { label: 'CBZ', className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' };
    }
    if (doc.isEpub || lower.endsWith('.epub')) {
      return { label: 'EPUB', className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' };
    }
    if (lower.endsWith('.pdf')) {
      return { label: 'PDF', className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20' };
    }
    const ext = doc.name.split('.').pop()?.toUpperCase();
    return { label: ext && ext.length <= 4 ? ext : 'BOOK', className: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20' };
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onTriggerOpenFile}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-white text-xs font-semibold bg-rose-600 hover:bg-rose-500 shadow-sm group active:scale-[0.98] transition-all"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Book / Comic</span>
        </span>
        <span className="text-[10px] font-mono opacity-60 bg-black/20 px-1.5 py-0.5 rounded">
          ⌘O
        </span>
      </button>

      {/* Bookshelf Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
          Bookshelf
        </span>

        {/* Books & Comics Library Navigation */}
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'recent'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <BookMarked className="h-4 w-4" />
            <span>Books & Comics</span>
          </span>
          {totalCount > 0 && (
            <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
              {totalCount}
            </span>
          )}
        </button>
      </div>

      {/* Books & Comics List */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between px-2 mb-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-rose-500" /> Books ({docs.length})
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="px-2 py-3 rounded-lg border border-dashed border-border bg-card/40 text-center">
            <p className="text-[11px] text-zinc-400">
              No books yet. Click Add Book or drag & drop files.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {docs.map((doc) => {
              const isActive = activeTab === 'viewer' && activeDocId === doc.id;
              const formatInfo = getFormatBadge(doc);
              const currentPage = doc.currentPage || 1;
              const rawPageCount = doc.pageCount;
              const hasPageCount = typeof rawPageCount === 'number' && rawPageCount > 0;
              const pageCount = hasPageCount ? rawPageCount : 1;
              const isFinished = Boolean(
                doc.isFinished || (hasPageCount && pageCount > 1 && currentPage >= pageCount)
              );
              const progressPercent = isFinished
                ? 100
                : hasPageCount && pageCount > 1
                ? Math.min(99, Math.round((currentPage / pageCount) * 100))
                : 0;

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoc?.(doc)}
                  className={`group/doc relative flex flex-col gap-1 p-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-rose-500/10 text-zinc-900 dark:text-zinc-100 border border-rose-500/30 shadow-2xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded leading-none shrink-0 ${formatInfo.className}`}>
                        {formatInfo.label}
                      </span>
                      <span className="text-xs font-medium truncate" title={doc.name}>
                        {doc.name.replace(/\.[^/.]+$/, '')}
                      </span>
                    </div>
                    {onRemoveDoc && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDoc(doc.id, e);
                        }}
                        title={`Remove ${doc.name}`}
                        className="opacity-0 group-hover/doc:opacity-100 hover:text-rose-500 text-zinc-400 transition-opacity p-0.5 rounded shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                    {isFinished ? (
                      <span className="text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Finished
                      </span>
                    ) : progressPercent > 0 ? (
                      <span>{progressPercent}% completed</span>
                    ) : (
                      <span>Page {currentPage}{hasPageCount && pageCount > 1 ? ` / ${pageCount}` : ''}</span>
                    )}
                  </div>

                  {/* Mini progress bar if in progress */}
                  {!isFinished && progressPercent > 0 && (
                    <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700/50 rounded-full overflow-hidden mt-0.5">
                      <div 
                        className="h-full bg-rose-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReaderSidebar;
