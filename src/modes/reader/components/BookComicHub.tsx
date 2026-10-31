import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  MoreVertical, 
  Plus, 
  Star, 
  ArrowUpDown,
  CheckCircle,
  RotateCcw,
  Trash2,
  ChevronDown,
  Check,
  Flame
} from 'lucide-react';
import { LoadedPDF } from '../../../types';
import FloatingAnchor from '../../../components/common/FloatingAnchor';
import EmptyState from '../../../components/EmptyState';
import CircularProgress from './CircularProgress';
import { 
  getBookRating, 
  saveBookRating, 
  formatRelativeTime,
  getReadingStats 
} from '../utils/readingStats';

interface BookComicHubProps {
  docs: LoadedPDF[];
  onOpenDoc: (doc: LoadedPDF) => void;
  onImportBook: () => void;
  onRemoveDoc: (docId: string) => void;
  onUpdateDocProgress?: (docId: string, currentPage: number, isFinished?: boolean) => void;
  darkMode?: boolean;
}

type SortOption = 'lastRead' | 'title' | 'progress' | 'recentAdded';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'lastRead', label: 'Recently Read' },
  { id: 'recentAdded', label: 'Recently Added' },
  { id: 'progress', label: 'Reading Progress' },
  { id: 'title', label: 'Title (A-Z)' },
];

interface BookCardProps {
  doc: any;
  isOpenMenu: boolean;
  onToggleMenu: (id: string, e?: React.MouseEvent) => void;
  onOpenDoc: (doc: LoadedPDF) => void;
  onMarkFinished: (doc: any, e: React.MouseEvent) => void;
  onResetProgress: (doc: any, e: React.MouseEvent) => void;
  onRatingChange: (docId: string, star: number, e: React.MouseEvent) => void;
  onRemoveDoc: (docId: string) => void;
}

const BookCard = React.memo(function BookCard({
  doc,
  isOpenMenu,
  onToggleMenu,
  onOpenDoc,
  onMarkFinished,
  onResetProgress,
  onRatingChange,
  onRemoveDoc,
}: BookCardProps) {
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const formattedTime = doc.lastReadAt 
    ? formatRelativeTime(doc.lastReadAt) 
    : formatRelativeTime(doc.loadedAt);

  return (
    <div
      onClick={() => onOpenDoc(doc)}
      className="group flex flex-col cursor-pointer select-none"
    >
      {/* Book Cover Container with ~2:3 PC Book Proportion */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-card border border-border shadow-md group-hover:border-accent/50 transition-colors">
        
        {/* Cover Art / Vector Spine */}
        {doc.coverDataUrl ? (
          <img
            src={doc.coverDataUrl}
            alt={doc.name}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-surface-container-high via-surface-container to-surface">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase">
                {doc.isComic ? 'Comic' : doc.isEpub ? 'E-Book' : 'Document'}
              </span>
              <BookOpen className="h-4 w-4 text-on-surface-variant/60" />
            </div>
            <p className="text-xs font-bold text-on-surface line-clamp-4 leading-snug drop-shadow-xs">
              {doc.name.replace(/\.[^/.]+$/, '')}
            </p>
            <div className="text-[10px] font-mono text-on-surface-variant truncate">
              {doc.size}
            </div>
          </div>
        )}

        {/* Format Badge (Top-Right) */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 text-zinc-100 border border-white/10 shadow-xs">
            {doc.isComic ? 'CBZ' : doc.isEpub ? 'EPUB' : 'PDF'}
          </span>
        </div>

        {/* Progress Badge (Top-Left) */}
        {(doc.isFinished || doc.progressPercent > 0) && (
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider backdrop-blur-md shadow-xs ${
              doc.isFinished
                ? 'bg-emerald-500/90 text-white'
                : 'bg-accent/90 text-on-accent'
            }`}>
              {doc.isFinished ? 'Finished' : `${doc.progressPercent}%`}
            </span>
          </div>
        )}

        {/* Hover Overlay with Read Button and 3-Dots Menu */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-3 pointer-events-none group-hover:pointer-events-auto transition-opacity">
          
          {/* Top right menu button */}
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              ref={moreBtnRef}
              type="button"
              onClick={(e) => onToggleMenu(doc.id, e)}
              className="h-7 w-7 rounded-lg bg-black/60 hover:bg-black/90 text-zinc-200 flex items-center justify-center backdrop-blur-md transition-colors"
              title="Options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            <FloatingAnchor
              isOpen={isOpenMenu}
              onClose={() => onToggleMenu('')}
              anchorRef={moreBtnRef}
              placement="bottom-end"
              className="w-48 rounded-xl caelestia-glass border border-border shadow-2xl py-1.5 z-50 text-xs flex flex-col ring-1 ring-white/10"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDoc(doc);
                }}
                className="w-full px-3 py-1.5 text-left text-on-surface hover:bg-accent hover:text-on-accent transition-colors flex items-center gap-2"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent" />
                <span>Open in Reader</span>
              </button>
              <button
                type="button"
                onClick={(e) => onMarkFinished(doc, e)}
                className="w-full px-3 py-1.5 text-left text-on-surface hover:bg-accent hover:text-on-accent transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>Mark Finished (100%)</span>
              </button>
              <button
                type="button"
                onClick={(e) => onResetProgress(doc, e)}
                className="w-full px-3 py-1.5 text-left text-on-surface hover:bg-accent hover:text-on-accent transition-colors flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                <span>Reset Progress</span>
              </button>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDoc(doc.id);
                }}
                className="w-full px-3 py-1.5 text-left text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove from Shelf</span>
              </button>
            </FloatingAnchor>
          </div>

          {/* Center Action */}
          <div className="flex items-center justify-center">
            <span className="px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs shadow-lg flex items-center gap-1.5 transition-all active:scale-95">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Read</span>
            </span>
          </div>

          {/* Bottom info on hover */}
          <div className="text-[11px] font-mono text-zinc-200 bg-black/60 backdrop-blur-md rounded-md px-2 py-0.5 text-center">
            {doc.pageCount && doc.pageCount > 1
              ? `${doc.currentPage} / ${doc.pageCount} pages`
              : `Page ${doc.currentPage}`}
          </div>
        </div>

        {/* Progress Bar Indicator at bottom edge */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-surface-container-high/60">
          <div
            className={`h-full ${
              doc.isFinished ? 'bg-emerald-500' : 'bg-accent'
            }`}
            style={{ width: `${doc.isFinished ? 100 : Math.max(3, doc.progressPercent)}%` }}
          />
        </div>

      </div>

      {/* Desktop Metadata Underneath Cover */}
      <div className="pt-2.5 px-0.5 flex flex-col gap-1">
        <h3 
          className="text-xs font-semibold text-on-surface group-hover:text-accent line-clamp-2 leading-snug transition-colors"
          title={doc.name}
        >
          {doc.name.replace(/\.[^/.]+$/, '')}
        </h3>

        {/* Star Rating & Last Read */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-on-surface-variant pt-0.5">
          {/* Interactive 5-Star Rating */}
          <div 
            className="flex items-center gap-0.5" 
            onClick={(e) => e.stopPropagation()}
            title={`Rating: ${doc.rating || 0}/5`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={(e) => onRatingChange(doc.id, star, e)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-3 w-3 ${
                    star <= (doc.rating || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-outline/40 hover:text-amber-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-on-surface-variant truncate">
            {formattedTime}
          </span>
        </div>
      </div>

    </div>
  );
});

function BookComicHub({
  docs,
  onOpenDoc,
  onImportBook,
  onRemoveDoc,
  onUpdateDocProgress,
}: BookComicHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in-progress' | 'completed' | 'comics' | 'books'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lastRead');
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);

  // Determine if a document is a comic or an epub/book with progress calculations
  const enrichedDocs = useMemo(() => {
    return docs.map((doc) => {
      const lower = doc.name.toLowerCase();
      const isComic = doc.isComic ?? (lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn'));
      const isEpub = doc.isEpub ?? lower.endsWith('.epub');
      const currentPage = doc.currentPage || 1;
      const rawPageCount = doc.pageCount;
      const hasPageCount = typeof rawPageCount === 'number' && rawPageCount > 0;
      const pageCount = hasPageCount ? rawPageCount : 1;

      // Determine isFinished:
      // A book is finished ONLY if explicitly marked finished, OR if pageCount is known (> 1) and currentPage >= pageCount.
      // If pageCount is unknown or 1, opening on page 1 is NEVER automatically finished!
      const isFinished = Boolean(
        doc.isFinished || (hasPageCount && pageCount > 1 && currentPage >= pageCount)
      );

      let progressPercent = 0;
      if (isFinished) {
        progressPercent = 100;
      } else if (hasPageCount && pageCount > 1) {
        progressPercent = Math.min(99, Math.round((currentPage / pageCount) * 100));
      } else {
        progressPercent = 0;
      }

      const rating = doc.rating ?? getBookRating(doc.id);

      return {
        ...doc,
        isComic,
        isEpub,
        currentPage,
        pageCount: hasPageCount ? pageCount : (doc.pageCount || undefined),
        progressPercent,
        isFinished,
        rating,
      };
    });
  }, [docs]);

  // Filtered and sorted docs based on search, filter, and sort order
  const filteredAndSortedDocs = useMemo(() => {
    let result = enrichedDocs.filter((doc) => {
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesSubject = doc.subjectName?.toLowerCase().includes(query);
        if (!matchesName && !matchesSubject) return false;
      }

      // Filter match
      if (activeFilter === 'in-progress') return !doc.isFinished && doc.progressPercent > 0;
      if (activeFilter === 'completed') return doc.isFinished;
      if (activeFilter === 'comics') return Boolean(doc.isComic);
      if (activeFilter === 'books') return Boolean(doc.isEpub) || !doc.isComic;
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'progress') {
        return b.progressPercent - a.progressPercent;
      }
      if (sortBy === 'recentAdded') {
        const timeA = new Date(a.loadedAt).getTime();
        const timeB = new Date(b.loadedAt).getTime();
        return timeB - timeA;
      }
      // Default: lastRead
      const timeA = a.lastReadAt ? new Date(a.lastReadAt).getTime() : new Date(a.loadedAt).getTime();
      const timeB = b.lastReadAt ? new Date(b.lastReadAt).getTime() : new Date(b.loadedAt).getTime();
      return timeB - timeA;
    });

    return result;
  }, [enrichedDocs, searchQuery, activeFilter, sortBy]);

  const readingStats = useMemo(() => getReadingStats(), [docs]);

  const averageProgress = useMemo(() => {
    if (enrichedDocs.length === 0) return 0;
    const total = enrichedDocs.reduce((acc, d) => acc + (d.isFinished ? 100 : (d.progressPercent || 0)), 0);
    return Math.round(total / enrichedDocs.length);
  }, [enrichedDocs]);

  const handleRatingChange = useCallback((docId: string, star: number, e: React.MouseEvent) => {
    e.stopPropagation();
    saveBookRating(docId, star);
    const target = docs.find((d) => d.id === docId);
    if (target) {
      target.rating = star;
      onUpdateDocProgress?.(docId, target.currentPage || 1, target.isFinished);
    }
  }, [docs, onUpdateDocProgress]);

  const handleMarkFinished = useCallback((doc: typeof enrichedDocs[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuDocId(null);
    onUpdateDocProgress?.(doc.id, doc.pageCount || doc.currentPage || 1, true);
  }, [onUpdateDocProgress]);

  const handleResetProgress = useCallback((doc: typeof enrichedDocs[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuDocId(null);
    onUpdateDocProgress?.(doc.id, 1, false);
  }, [onUpdateDocProgress]);

  const handleToggleMenu = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenMenuDocId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-background text-on-surface flex flex-col select-none">
      
      {/* 1. Constraint-Aligned Responsive Header Bar */}
      <header className="px-3 sm:px-4 h-10 border-b border-border bg-surface flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0 z-20 select-none">
        
        {/* Left: Library Title & Count Badge */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <BookOpen className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold text-on-surface tracking-tight whitespace-nowrap font-sans">
              Books & Comics
            </h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent/15 border border-accent/25 text-accent flex-shrink-0">
              {enrichedDocs.length}
            </span>
          </div>
        </div>

        {/* Center: Constrained Search Input */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md min-w-[120px] relative flex items-center font-mono">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-on-surface-variant/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, format..."
            className="w-full bg-surface-container border border-border rounded-md pl-8 pr-7 py-1 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[10px] font-mono text-on-surface-variant hover:text-on-surface"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 justify-end font-mono">
          <button
            onClick={() => setShowHelpModal(true)}
            className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-2xs cursor-pointer"
            title="Shortcuts & Format Guide"
            aria-label="Shortcuts & Format Guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>

          {/* Add Book / Comic Button */}
          <button
            onClick={onImportBook}
            className="h-7 flex items-center gap-1.5 px-3 rounded-md bg-accent hover:opacity-90 active:translate-y-0.5 text-accent-on text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Import Comic (.cbz, .cbr), Book (.epub), or PDF (⌘O)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add <span className="hidden md:inline">Book / Comic</span></span>
            <span className="text-[9px] opacity-75 font-mono ml-0.5 hidden sm:inline">
              ⌘O
            </span>
          </button>
        </div>

      </header>

      {/* 2. Responsive Filters & Sorting Bar */}
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface/60 flex items-center justify-between gap-3 flex-shrink-0 text-xs">
        
        {/* Left: Scrollable Filter Pills with responsive labels to avoid clipping */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 pr-2">
          {[
            { id: 'all', label: 'All Books', shortLabel: 'All' },
            { id: 'in-progress', label: 'In Progress', shortLabel: 'Reading' },
            { id: 'comics', label: 'Comics & Manga', shortLabel: 'Comics' },
            { id: 'books', label: 'E-Books', shortLabel: 'E-Books' },
            { id: 'completed', label: 'Completed', shortLabel: 'Finished' },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg font-medium whitespace-nowrap text-[11px] sm:text-xs transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'bg-accent text-accent-on font-semibold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right: FloatingAnchor Sort Menu (no native OS select box) */}
        <div className="relative flex items-center flex-shrink-0 border-l border-border pl-3">
          <button
            ref={sortBtnRef}
            type="button"
            onClick={() => setShowSortMenu((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container border border-border text-on-surface hover:bg-surface-high text-[11px] sm:text-xs font-medium transition-colors shadow-2xs"
            title="Sort bookshelf"
          >
            <ArrowUpDown className="h-3 w-3 text-on-surface-variant" />
            <span className="hidden sm:inline text-on-surface-variant font-mono">Sort:</span>
            <span className="font-medium text-on-surface">
              {SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Sort'}
            </span>
            <ChevronDown className="h-3 w-3 text-on-surface-variant opacity-70" />
          </button>

          <FloatingAnchor
            isOpen={showSortMenu}
            onClose={() => setShowSortMenu(false)}
            anchorRef={sortBtnRef}
            placement="bottom-end"
            className="w-44 p-1.5 rounded-xl bg-surface border border-border shadow-xl flex flex-col gap-0.5 text-xs z-50 ring-1 ring-black/5"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSortBy(opt.id);
                  setShowSortMenu(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  sortBy === opt.id
                    ? 'bg-accent text-accent-on font-semibold shadow-2xs'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <span>{opt.label}</span>
                {sortBy === opt.id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </FloatingAnchor>
        </div>

      </div>

      {/* 3. Main Bookshelf Canvas across entire page */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 w-full">
        {/* Reading Streak & Weekly Momentum Showcase (Bibliophile Amber & Nordic Vellum) */}
        {enrichedDocs.length > 0 && !searchQuery && activeFilter === 'all' && (
          <div className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-2xs flex-shrink-0">
                <Flame className="h-5 w-5 fill-accent/20" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-on-surface">
                    {readingStats.dayStreak > 0 ? `${readingStats.dayStreak}-Day Reading Streak` : 'Start Your Reading Streak'}
                  </span>
                  {readingStats.dayStreak > 0 && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {readingStats.pagesThisWeek > 0
                    ? `${readingStats.pagesThisWeek} pages read this week • ${Math.round(readingStats.timeThisWeekMinutes)}m immersion`
                    : 'Turn pages in Reader to log your daily reading streak.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <CircularProgress percentage={averageProgress} size={36} strokeWidth={3.5} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase font-semibold">Library</span>
                  <span className="text-xs font-bold text-on-surface">{averageProgress}% Read</span>
                </div>
              </div>

              {readingStats.totalBooksFinished > 0 && (
                <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-border">
                  <div className="h-8 w-8 rounded-lg bg-surface-container flex items-center justify-center text-accent">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase font-semibold">Finished</span>
                    <span className="text-xs font-bold text-on-surface">{readingStats.totalBooksFinished} {readingStats.totalBooksFinished === 1 ? 'Book' : 'Books'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredAndSortedDocs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6">
            {filteredAndSortedDocs.map((doc) => (
              <BookCard
                key={doc.id}
                doc={doc}
                isOpenMenu={openMenuDocId === doc.id}
                onToggleMenu={handleToggleMenu}
                onOpenDoc={onOpenDoc}
                onMarkFinished={handleMarkFinished}
                onResetProgress={handleResetProgress}
                onRatingChange={handleRatingChange}
                onRemoveDoc={onRemoveDoc}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 select-none">
            <p className="text-xs text-on-surface-variant">No books found matching "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-high border border-border text-on-surface text-xs font-semibold shadow-2xs"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Your Bookshelf is Empty"
            description="Add books or comics to start reading."
            actionLabel="Add Book or Comic"
            actionIcon={Plus}
            onAction={onImportBook}
            shortcut="⌘O"
            hint="Or drag & drop files here"
            hintIcon={BookOpen}
          />
        )}
      </main>

      {/* 4. Help & Shortcuts Desktop Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent" />
                <h3 className="text-sm font-bold text-on-surface">Books & Comics Reader Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-xs font-mono text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
              <div className="p-3 rounded-xl bg-surface-container border border-border">
                <strong className="text-on-surface block mb-1">Supported Formats:</strong>
                <ul className="space-y-1 text-[11px] font-mono text-on-surface-variant">
                  <li>• <span className="text-accent font-bold">.CBZ / .CBR / .CBN</span> Comic archives (automatic page unpack & cover extraction)</li>
                  <li>• <span className="text-accent font-bold">.EPUB</span> E-Books with dynamic layout rendering</li>
                  <li>• <span className="text-accent font-bold">.PDF</span> Graphic novels, manuals, and documents</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-border">
                <strong className="text-on-surface block mb-1">Keyboard Shortcuts in Reader:</strong>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-on-surface-variant pt-1">
                  <div><kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-on-surface">← / →</kbd> Previous / Next Page</div>
                  <div><kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-on-surface">Space</kbd> Next Page</div>
                  <div><kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-on-surface">w</kbd> Fit to Width</div>
                  <div><kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-on-surface">p</kbd> Fit to Page</div>
                  <div><kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-on-surface">F11</kbd> Fullscreen Zen Mode</div>
                  <div><kbd className="bg-surface border border-border px-1.5 py-0.5 rounded text-on-surface">⌘ + Wheel</kbd> Zoom In / Out</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-on font-semibold text-xs transition-colors shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 5. Simple Floating Action Button (+) only when bookshelf has books */}
      {filteredAndSortedDocs.length > 0 && (
        <button
          type="button"
          onClick={onImportBook}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-accent hover:bg-accent-hover text-accent-on shadow-xl flex items-center justify-center z-40 border border-white/20 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Add Book or Comic (⌘O)"
          aria-label="Add Book or Comic"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

    </div>
  );
}

export default React.memo(BookComicHub);
