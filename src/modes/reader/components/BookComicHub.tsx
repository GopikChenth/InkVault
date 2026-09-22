import React, { useState, useMemo } from 'react';
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  MoreVertical, 
  Plus, 
  Star, 
  ArrowUpDown
} from 'lucide-react';
import { LoadedPDF } from '../../../types';
import { 
  getBookRating, 
  saveBookRating, 
  formatRelativeTime 
} from '../utils/readingStats';

interface BookComicHubProps {
  docs: LoadedPDF[];
  onOpenDoc: (doc: LoadedPDF) => void;
  onImportBook: () => void;
  onRemoveDoc: (docId: string) => void;
  onUpdateDocProgress?: (docId: string, currentPage: number) => void;
  darkMode?: boolean;
}

type SortOption = 'lastRead' | 'title' | 'progress' | 'recentAdded';

export default function BookComicHub({
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

  // Determine if a document is a comic or an epub/book with progress calculations
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
      if (activeFilter === 'in-progress') return doc.progressPercent > 0 && doc.progressPercent < 100;
      if (activeFilter === 'completed') return doc.progressPercent >= 100;
      if (activeFilter === 'comics') return doc.isComic;
      if (activeFilter === 'books') return doc.isEpub || (!doc.isComic && !doc.name.toLowerCase().endsWith('.pdf'));
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

  const handleRatingChange = (docId: string, star: number, e: React.MouseEvent) => {
    e.stopPropagation();
    saveBookRating(docId, star);
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
    <div className="flex-1 w-full h-full overflow-hidden bg-[#0c0c12] text-zinc-100 flex flex-col select-none">
      
      {/* 1. Desktop PC Header Bar across entire width */}
      <header className="h-16 px-6 sm:px-8 border-b border-zinc-800/80 bg-[#111119] flex items-center justify-between gap-4 flex-shrink-0 z-20">
        
        {/* Left: Library Title */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-600/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-xs flex-shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                  My Books & Comics
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 font-semibold">
                  {enrichedDocs.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="flex-1 max-w-md relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, subject, format..."
            className="w-full bg-[#171722] border border-zinc-800 rounded-xl pl-10 pr-9 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[10px] font-mono text-zinc-500 hover:text-zinc-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Primary PC Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowHelpModal(true)}
            className="h-9 w-9 rounded-xl bg-[#171722] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Shortcuts & Format Guide"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Desktop Add Book / Comic Button */}
          <button
            onClick={onImportBook}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm group"
            title="Import Comic (.cbz, .cbr), Book (.epub), or PDF"
          >
            <Plus className="h-4 w-4" />
            <span>Add Book / Comic</span>
            <span className="text-[10px] font-mono opacity-70 bg-black/25 px-1.5 py-0.5 rounded ml-0.5">
              ⌘O
            </span>
          </button>
        </div>

      </header>

      {/* 2. Desktop Filters & Sorting Bar */}
      <div className="h-12 px-6 sm:px-8 border-b border-zinc-800/60 bg-[#0f0f16] flex items-center justify-between gap-4 flex-shrink-0 text-xs">
        
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'all', label: 'All Books' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'comics', label: 'Comics & Manga' },
            { id: 'books', label: 'E-Books' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium ${
                  isSelected
                    ? 'bg-rose-600 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Sort Dropdown */}
        <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs flex-shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
          <span className="hidden sm:inline text-zinc-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-[#171722] border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="lastRead">Recently Read</option>
            <option value="recentAdded">Recently Added</option>
            <option value="progress">Reading Progress</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>

      </div>

      {/* 3. Main Bookshelf Canvas across entire page */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 w-full">
        {filteredAndSortedDocs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 sm:gap-6">
            {filteredAndSortedDocs.map((doc) => {
              const formattedTime = doc.lastReadAt 
                ? formatRelativeTime(doc.lastReadAt) 
                : formatRelativeTime(doc.loadedAt);

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className="group flex flex-col cursor-pointer select-none"
                >
                  {/* Book Cover Container with ~2:3 PC Book Proportion */}
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#161622] border border-zinc-800 shadow-md group-hover:border-rose-500/50">
                    
                    {/* Cover Art / Vector Spine */}
                    {doc.coverDataUrl ? (
                      <img
                        src={doc.coverDataUrl}
                        alt={doc.name}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-zinc-800 via-[#1c1c2b] to-[#12121a]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                            {doc.isComic ? 'Comic' : doc.isEpub ? 'E-Book' : 'Document'}
                          </span>
                          <BookOpen className="h-4 w-4 text-zinc-600" />
                        </div>
                        <p className="text-xs font-bold text-zinc-200 line-clamp-4 leading-snug drop-shadow-sm">
                          {doc.name.replace(/\.[^/.]+$/, '')}
                        </p>
                        <div className="text-[10px] font-mono text-zinc-500 truncate">
                          {doc.size}
                        </div>
                      </div>
                    )}

                    {/* Format Badge (Top-Right) */}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 text-zinc-200 border border-white/10 shadow-xs">
                        {doc.isComic ? 'CBZ' : doc.isEpub ? 'EPUB' : 'PDF'}
                      </span>
                    </div>

                    {/* Progress Badge (Top-Left) */}
                    {doc.progressPercent > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider backdrop-blur-md shadow-xs ${
                          doc.progressPercent >= 100
                            ? 'bg-emerald-500/80 text-white'
                            : 'bg-rose-600/80 text-white'
                        }`}>
                          {doc.progressPercent >= 100 ? 'Finished' : `${doc.progressPercent}%`}
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay with Read Button and 3-Dots Menu */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
                      
                      {/* Top right menu button */}
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id)}
                          className="h-7 w-7 rounded-lg bg-black/60 hover:bg-black/90 text-zinc-200 flex items-center justify-center backdrop-blur-md"
                          title="Options"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {openMenuDocId === doc.id && (
                          <div className="absolute right-3 top-10 w-44 rounded-xl bg-[#1c1c28] border border-zinc-700 shadow-2xl py-1 z-30 text-xs flex flex-col">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuDocId(null);
                                onOpenDoc(doc);
                              }}
                              className="px-3 py-1.5 text-left text-zinc-200 hover:bg-rose-600 hover:text-white"
                            >
                              Open in Reader
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleMarkFinished(doc, e)}
                              className="px-3 py-1.5 text-left text-zinc-200 hover:bg-rose-600 hover:text-white"
                            >
                              Mark Finished (100%)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleResetProgress(doc, e)}
                              className="px-3 py-1.5 text-left text-zinc-200 hover:bg-rose-600 hover:text-white"
                            >
                              Reset Progress
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuDocId(null);
                                onRemoveDoc(doc.id);
                              }}
                              className="px-3 py-1.5 text-left text-rose-400 hover:bg-rose-600 hover:text-white"
                            >
                              Remove from Shelf
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Center Action */}
                      <div className="flex items-center justify-center">
                        <span className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Read</span>
                        </span>
                      </div>

                      {/* Bottom info on hover */}
                      <div className="text-[11px] font-mono text-zinc-300 bg-black/60 backdrop-blur-md rounded-md px-2 py-0.5 text-center">
                        {doc.currentPage} / {doc.pageCount} pages
                      </div>
                    </div>

                    {/* Progress Bar Indicator at bottom edge */}
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-800/80">
                      <div
                        className={`h-full ${
                          doc.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(3, doc.progressPercent)}%` }}
                      />
                    </div>

                  </div>

                  {/* Desktop Metadata Underneath Cover */}
                  <div className="pt-2.5 px-0.5 flex flex-col gap-1">
                    <h3 
                      className="text-xs font-semibold text-zinc-200 group-hover:text-rose-400 line-clamp-2 leading-snug"
                      title={doc.name}
                    >
                      {doc.name.replace(/\.[^/.]+$/, '')}
                    </h3>

                    {/* Star Rating & Last Read */}
                    <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400 pt-0.5">
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
                            onClick={(e) => handleRatingChange(doc.id, star, e)}
                            className="p-0.5"
                          >
                            <Star
                              className={`h-3 w-3 ${
                                star <= (doc.rating || 0)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-zinc-600 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <span className="text-[10px] font-mono text-zinc-500 truncate">
                        {formattedTime}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 select-none">
            <p className="text-xs text-zinc-400">No books found matching "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
            >
              Clear Search
            </button>
          </div>
        ) : null}
      </main>

      {/* 4. Help & Shortcuts Desktop Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-[#161622] border border-zinc-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-rose-500" />
                <h3 className="text-sm font-bold text-zinc-100">Books & Comics Reader Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                <strong className="text-zinc-100 block mb-1">Supported Formats:</strong>
                <ul className="space-y-1 text-[11px] font-mono text-zinc-400">
                  <li>• <span className="text-rose-400 font-bold">.CBZ / .CBR / .CBN</span> Comic archives (automatic page unpack & cover extraction)</li>
                  <li>• <span className="text-rose-400 font-bold">.EPUB</span> E-Books with dynamic layout rendering</li>
                  <li>• <span className="text-rose-400 font-bold">.PDF</span> Graphic novels, manuals, and documents</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                <strong className="text-zinc-100 block mb-1">Keyboard Shortcuts in Reader:</strong>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400 pt-1">
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">← / →</kbd> Previous / Next Page</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">Space</kbd> Next Page</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">w</kbd> Fit to Width</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">p</kbd> Fit to Page</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">F11</kbd> Fullscreen Zen Mode</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">⌘ + Wheel</kbd> Zoom In / Out</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 5. Simple Floating Action Button (+) */}
      <button
        type="button"
        onClick={onImportBook}
        className="fixed bottom-8 right-8 h-12 w-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl flex items-center justify-center z-40 border border-white/10 cursor-pointer"
        title="Add Book or Comic (⌘O)"
        aria-label="Add Book or Comic"
      >
        <Plus className="h-6 w-6" />
      </button>

    </div>
  );
}
