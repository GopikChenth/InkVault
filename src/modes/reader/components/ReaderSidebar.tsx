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
      return { label: 'PDF', className: 'bg-accent/15 text-accent border border-accent/25' };
    }
    const ext = doc.name.split('.').pop()?.toUpperCase();
    return { label: ext && ext.length <= 4 ? ext : 'BOOK', className: 'bg-surface-container text-on-surface-variant border border-border' };
  };

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onTriggerOpenFile}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-md bg-accent hover:opacity-95 text-accent-on font-mono font-bold text-xs uppercase tracking-wider shadow-xs active:translate-y-0.5 transition-all cursor-pointer group"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Book / Comic</span>
        </span>
        <span className="text-[9px] font-mono opacity-80 border px-1.5 py-0.5 rounded" style={{ borderColor: 'currentColor' }}>
          ⌘O
        </span>
      </button>

      {/* Bookshelf Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1">
          Bookshelf
        </span>

        {/* Books & Comics Library Navigation */}
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
            <BookMarked className="h-4 w-4" />
            <span>Books & Comics</span>
          </span>
          {totalCount > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'recent' ? 'bg-accent/20 text-accent font-bold' : 'bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
            }`}>
              {totalCount}
            </span>
          )}
        </button>
      </div>

      {/* Books & Comics List */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between px-2 mb-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-accent" /> Books ({docs.length})
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="px-2 py-3 rounded-lg border border-dashed border-border bg-card/40 text-center">
            <p className="text-[11px] text-on-surface-variant/80">
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
                      ? 'bg-accent/10 text-on-surface border border-accent/30 shadow-2xs'
                      : 'text-on-surface-variant hover:bg-card hover:text-on-surface border border-transparent'
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
                        className="opacity-0 group-hover/doc:opacity-100 hover:text-red-500 text-outline transition-opacity p-0.5 rounded shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono mt-0.5">
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
                    <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden mt-0.5">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-300"
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
