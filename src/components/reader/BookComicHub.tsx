import React, { useState, useMemo } from 'react';
import { 
  Search, 
  HelpCircle, 
  Settings, 
  Flame, 
  FileText, 
  Clock, 
  BookOpen, 
  BookMarked,
  MoreVertical, 
  Plus, 
  Star, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  ExternalLink
} from 'lucide-react';
import { LoadedPDF } from '../../types';
import CircularProgress from './CircularProgress';
import { 
  getReadingStats, 
  getBookRating, 
  saveBookRating, 
  formatRelativeTime, 
  formatMinutes 
} from '../../utils/readingStats';

interface BookComicHubProps {
  docs: LoadedPDF[];
  onOpenDoc: (doc: LoadedPDF) => void;
  onImportBook: () => void;
  onRemoveDoc: (docId: string) => void;
  onUpdateDocProgress?: (docId: string, currentPage: number) => void;
  darkMode?: boolean;
}

export default function BookComicHub({
  docs,
  onOpenDoc,
  onImportBook,
  onRemoveDoc,
  onUpdateDocProgress,
}: BookComicHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in-progress' | 'completed' | 'comics' | 'books'>('all');
  const [continueIndex, setContinueIndex] = useState(0);
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Synchronously fetch reading statistics
  const stats = useMemo(() => getReadingStats(), [docs]);

  // Determine if a document is a comic or an epub/book
  const enrichedDocs = useMemo(() => {
    return docs.map((doc) => {
      const lower = doc.name.toLowerCase();
      const isComic = doc.isComic ?? (lower.endsWith('.cbz') || lower.endsWith('.cbr') || lower.endsWith('.cbn'));
      const isEpub = doc.isEpub ?? lower.endsWith('.epub');
      const currentPage = doc.currentPage || 1;
      const pageCount = doc.pageCount || 1;
      const progressPercent = Math.min(100, Math.round((currentPage / pageCount) * 100));
      const rating = doc.rating ?? getBookRating(doc.id);

      return {
        ...doc,
        isComic,
        isEpub,
        currentPage,
        pageCount,
        progressPercent,
        rating,
      };
    });
  }, [docs]);

  // Filtered docs based on search and selected tab
  const filteredDocs = useMemo(() => {
    return enrichedDocs.filter((doc) => {
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesSubject = doc.subjectName?.toLowerCase().includes(query);
        if (!matchesName && !matchesSubject) return false;
      }

      // Filter match
      if (activeFilter === 'in-progress') return doc.progressPercent > 0 && doc.progressPercent < 100;
      if (activeFilter === 'completed') return doc.progressPercent >= 100;
      if (activeFilter === 'comics') return doc.isComic;
      if (activeFilter === 'books') return doc.isEpub || (!doc.isComic && !doc.name.toLowerCase().endsWith('.pdf'));
      return true;
    });
  }, [enrichedDocs, searchQuery, activeFilter]);

  // Candidates for "Continue Reading" (books that have been read or opened, sorted by last read or loaded date)
  const continueCandidates = useMemo(() => {
    return [...enrichedDocs]
      .sort((a, b) => {
        const timeA = a.lastReadAt ? new Date(a.lastReadAt).getTime() : new Date(a.loadedAt).getTime();
        const timeB = b.lastReadAt ? new Date(b.lastReadAt).getTime() : new Date(b.loadedAt).getTime();
        return timeB - timeA;
      });
  }, [enrichedDocs]);

  const activeContinueDoc = continueCandidates[continueIndex] || continueCandidates[0] || null;

  const handleRatingChange = (docId: string, star: number, e: React.MouseEvent) => {
    e.stopPropagation();
    saveBookRating(docId, star);
    // Force re-render of local doc rating
    const target = docs.find((d) => d.id === docId);
    if (target) {
      target.rating = star;
      onUpdateDocProgress?.(docId, target.currentPage || 1);
    }
  };

  const handleMarkFinished = (doc: typeof enrichedDocs[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuDocId(null);
    onUpdateDocProgress?.(doc.id, doc.pageCount);
  };

  const handleResetProgress = (doc: typeof enrichedDocs[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuDocId(null);
    onUpdateDocProgress?.(doc.id, 1);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#0a0a0f] text-zinc-100 flex flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 relative selection:bg-rose-500 selection:text-white">
      
      {/* 1. Header Search Bar & Actions */}
      <div className="flex items-center gap-3 w-full">
        {/* Search Input Box */}
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Book"
            className="w-full bg-[#16161f] border border-zinc-800/80 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 text-xs font-mono text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Top Right Tool Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowHelpModal(true)}
            className="h-11 w-11 rounded-2xl bg-[#16161f] border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors shadow-sm"
            title="Reading Help & Shortcuts"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="h-11 w-11 rounded-2xl bg-[#16161f] border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors shadow-sm"
            title="Reading Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. Reading Statistics Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </span>
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
              Reading statistics
            </h2>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="text-xs font-semibold text-rose-500 hover:text-rose-400 transition-colors"
          >
            See All
          </button>
        </div>

        {/* 3 Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          
          {/* Card 1: Day Streak */}
          <div className="bg-[#170e12] border border-red-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-500">
                {stats.dayStreak}
              </span>
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 fill-rose-500/20" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold font-mono tracking-wider text-zinc-400 uppercase mt-4">
              DAY STREAK
            </span>
          </div>

          {/* Card 2: Pages This Week */}
          <div className="bg-[#170e17] border border-pink-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-pink-500">
                {stats.pagesThisWeek}
              </span>
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold font-mono tracking-wider text-zinc-400 uppercase mt-4">
              PAGES THIS WEEK
            </span>
          </div>

          {/* Card 3: Time This Week */}
          <div className="bg-[#12160f] border border-lime-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-lime-400">
                {formatMinutes(stats.timeThisWeekMinutes)}
              </span>
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-lime-400" />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold font-mono tracking-wider text-zinc-400 uppercase mt-4">
              TIME THIS WEEK
            </span>
          </div>

        </div>
      </div>

      {/* 3. Continue Reading Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
              Continue reading
            </h2>
          </div>

          {continueCandidates.length > 0 && (
            <span className="text-xs font-semibold text-rose-500">
              See All ({continueCandidates.length})
            </span>
          )}
        </div>

        {activeContinueDoc ? (
          <div className="space-y-3">
            {/* Hero Continue Reading Card */}
            <div 
              onClick={() => onOpenDoc(activeContinueDoc)}
              className="bg-[#14141c] hover:bg-[#181822] border border-zinc-800/90 rounded-3xl p-4 sm:p-5 flex gap-4 sm:gap-6 items-center shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Left: Book / Comic Cover Preview */}
              <div className="w-24 sm:w-32 aspect-[2/3] flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-700/60 relative">
                {activeContinueDoc.coverDataUrl ? (
                  <img
                    src={activeContinueDoc.coverDataUrl}
                    alt={activeContinueDoc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 p-2.5 flex flex-col justify-between border-l-4 border-rose-500">
                    <span className="text-[9px] font-mono uppercase font-bold text-rose-400">
                      {activeContinueDoc.isComic ? 'Comic' : activeContinueDoc.isEpub ? 'EPUB' : 'Book'}
                    </span>
                    <p className="text-[11px] font-bold text-zinc-100 line-clamp-3 leading-tight">
                      {activeContinueDoc.name.replace(/\.[^/.]+$/, '')}
                    </p>
                    <span className="text-[8px] font-mono text-zinc-500">Ink Vault</span>
                  </div>
                )}
              </div>

              {/* Right: Metadata, Rating & Progress */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1 space-y-2.5">
                
                {/* Title & Options Menu */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 truncate group-hover:text-rose-400 transition-colors">
                    {activeContinueDoc.name.replace(/\.[^/.]+$/, '')}
                  </h3>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuDocId(openMenuDocId === activeContinueDoc.id ? null : activeContinueDoc.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openMenuDocId === activeContinueDoc.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#1e1e28] border border-zinc-700 shadow-2xl py-1.5 z-30 text-xs flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuDocId(null);
                            onOpenDoc(activeContinueDoc);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-zinc-200 hover:bg-rose-500 hover:text-white transition-colors text-left"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open in Reader
                        </button>
                        <button
                          onClick={(e) => handleMarkFinished(activeContinueDoc, e)}
                          className="flex items-center gap-2 px-3 py-2 text-zinc-200 hover:bg-rose-500 hover:text-white transition-colors text-left"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Finished
                        </button>
                        <button
                          onClick={(e) => handleResetProgress(activeContinueDoc, e)}
                          className="flex items-center gap-2 px-3 py-2 text-zinc-200 hover:bg-rose-500 hover:text-white transition-colors text-left"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset Progress
                        </button>
                        <div className="my-1 border-t border-zinc-700/60" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuDocId(null);
                            onRemoveDoc(activeContinueDoc.id);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors text-left"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove from Library
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Last Opened & Page Counter */}
                <div className="space-y-1 text-xs text-zinc-400 font-mono">
                  <div>
                    Last opened: <span className="text-zinc-300">{formatRelativeTime(activeContinueDoc.lastReadAt || activeContinueDoc.loadedAt)}</span>
                  </div>
                  <div>
                    {activeContinueDoc.currentPage} / {activeContinueDoc.pageCount} Pages
                  </div>
                </div>

                {/* Star Rating Row */}
                <div className="flex items-center gap-1 text-zinc-500" onClick={(e) => e.stopPropagation()}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={(e) => handleRatingChange(activeContinueDoc.id, star, e)}
                      className="p-0.5 hover:scale-125 transition-transform text-zinc-600 hover:text-amber-400"
                      title={`Rate ${star} star`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          (activeContinueDoc.rating || 0) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Circular Progress Display */}
                <div className="pt-1">
                  <CircularProgress
                    percentage={activeContinueDoc.progressPercent}
                    size={38}
                    strokeWidth={4}
                    color="#ef4444"
                  />
                </div>

              </div>
            </div>

            {/* Pagination / Dots indicator */}
            {continueCandidates.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {continueCandidates.slice(0, 5).map((doc, idx) => (
                  <button
                    key={doc.id}
                    onClick={() => setContinueIndex(idx)}
                    className={`h-1.5 transition-all rounded-full ${
                      idx === continueIndex ? 'w-5 bg-rose-500' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                    }`}
                    title={doc.name}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Empty Continue Reading Banner */
          <div 
            onClick={onImportBook}
            className="p-6 rounded-3xl bg-[#14141c] border border-dashed border-zinc-800 hover:border-rose-500/50 flex flex-col items-center justify-center text-center cursor-pointer group transition-all"
          >
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200">No books or comics in progress</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Open a CBZ comic, EPUB ebook, or PDF to begin reading with automatic page-progress tracking.
            </p>
          </div>
        )}
      </div>

      {/* 4. My Books Shelf Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
              My Books
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              ({filteredDocs.length})
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#16161f] p-1 rounded-xl border border-zinc-800/80 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('in-progress')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeFilter === 'in-progress'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveFilter('comics')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeFilter === 'comics'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Comics
            </button>
            <button
              onClick={() => setActiveFilter('books')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeFilter === 'books'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Books
            </button>
          </div>
        </div>

        {/* Books & Comics Grid Shelf */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 pb-16">
            {filteredDocs.map((doc) => {
              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className="flex flex-col group cursor-pointer"
                >
                  {/* Book / Comic Cover Card */}
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-md group-hover:shadow-2xl group-hover:border-rose-500/50 group-hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-end">
                    
                    {/* Cover Art */}
                    {doc.coverDataUrl ? (
                      <img
                        src={doc.coverDataUrl}
                        alt={doc.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-zinc-900/60 to-zinc-800 p-3 flex flex-col justify-between border-l-4 border-rose-500">
                        <span className="text-[9px] font-mono font-bold text-rose-400 uppercase">
                          {doc.isComic ? 'Comic' : doc.isEpub ? 'EPUB' : 'Book'}
                        </span>
                        <div className="text-xs font-bold text-zinc-200 line-clamp-4 leading-snug">
                          {doc.name.replace(/\.[^/.]+$/, '')}
                        </div>
                      </div>
                    )}

                    {/* Dark gradient overlay for bottom badge */}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                    {/* Bottom overlay badge: pages X/Y and 3-dots */}
                    <div className="relative z-10 px-2.5 pb-2.5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-zinc-300/90 drop-shadow-md">
                          pages
                        </span>
                        <span className="text-xs font-bold font-mono text-white drop-shadow-md">
                          {doc.currentPage}/{doc.pageCount}
                        </span>
                      </div>

                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id)}
                          className="h-6 w-6 rounded-full bg-black/50 hover:bg-black/80 text-zinc-200 flex items-center justify-center backdrop-blur-xs transition-colors"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </button>

                        {openMenuDocId === doc.id && (
                          <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-[#1e1e28] border border-zinc-700 shadow-2xl py-1 z-30 text-xs flex flex-col animate-in fade-in zoom-in-95">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuDocId(null);
                                onOpenDoc(doc);
                              }}
                              className="px-3 py-1.5 text-left text-zinc-200 hover:bg-rose-500 hover:text-white transition-colors"
                            >
                              Open in Reader
                            </button>
                            <button
                              onClick={(e) => handleMarkFinished(doc, e)}
                              className="px-3 py-1.5 text-left text-zinc-200 hover:bg-rose-500 hover:text-white transition-colors"
                            >
                              Mark Finished
                            </button>
                            <button
                              onClick={(e) => handleResetProgress(doc, e)}
                              className="px-3 py-1.5 text-left text-zinc-200 hover:bg-rose-500 hover:text-white transition-colors"
                            >
                              Reset Progress
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuDocId(null);
                                onRemoveDoc(doc.id);
                              }}
                              className="px-3 py-1.5 text-left text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Indicator at bottom edge */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800/80">
                      <div
                        className="h-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${doc.progressPercent}%` }}
                      />
                    </div>

                  </div>

                  {/* Title underneath the card */}
                  <div className="pt-2 px-0.5">
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-rose-400 transition-colors line-clamp-2 leading-tight">
                      {doc.name.replace(/\.[^/.]+$/, '')}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-1">
                      <span>{doc.isComic ? 'CBZ' : doc.isEpub ? 'EPUB' : 'PDF'}</span>
                      <span>{doc.progressPercent}%</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Shelf */
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
              <BookMarked className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-200">Your library is empty</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5">
              Import comics (.cbz, .cbr), books (.epub), or PDF documents to track your reading journey.
            </p>
            <button
              onClick={onImportBook}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Import Book or Comic</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Floating Action Button (FAB) at Bottom Right */}
      <button
        onClick={onImportBook}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 h-14 w-14 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-90 text-white shadow-2xl flex items-center justify-center transition-all z-40 group"
        title="Add Book or Comic"
      >
        <Plus className="h-7 w-7 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* 6. Help Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-[#181824] border border-zinc-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-bold text-zinc-100">Reading Mode Guide</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong className="text-zinc-100">Supported Formats:</strong><br />
                • <span className="text-rose-400 font-mono font-semibold">.CBZ / .CBR / .CBN</span> Comic archives (automatic page unpack & cover extraction)<br />
                • <span className="text-rose-400 font-mono font-semibold">.EPUB</span> E-Books with chapters and typography<br />
                • <span className="text-rose-400 font-mono font-semibold">.PDF</span> Standard documents and graphic manuals
              </p>
              <p>
                <strong className="text-zinc-100">Reading Progress Tracking:</strong><br />
                Every time you scroll or flip pages in the reader, your progress is automatically saved to your offline storage.
              </p>
              <p>
                <strong className="text-zinc-100">Keyboard Shortcuts in Reader:</strong><br />
                • <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded">← / →</span> Previous / Next Page<br />
                • <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded">F11</span> Toggle Immersive Fullscreen<br />
                • <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded">⌘ + Wheel</span> Zoom In / Out
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 7. Settings Modal */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="bg-[#181824] border border-zinc-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-bold text-zinc-100">Reader Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-100">Weekly Goal & Streak</div>
                  <div className="text-[11px] text-zinc-500">Consecutive days active: {stats.dayStreak} days</div>
                </div>
                <Flame className="h-5 w-5 text-rose-500" />
              </div>

              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-100">Total Books in Library</div>
                  <div className="text-[11px] text-zinc-500">{docs.length} books and comics loaded</div>
                </div>
                <BookMarked className="h-5 w-5 text-zinc-400" />
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
