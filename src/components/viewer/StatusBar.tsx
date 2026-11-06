import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  Square, 
  Columns, 
  Rows, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Hash
} from 'lucide-react';
import { PageLayoutMode, AppMode } from '../../types';

export interface StatusBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  docName?: string;
  docSize?: number;
  isComic?: boolean;
  appMode?: AppMode;
  subjectName?: string;
  
  // Layout Modes
  layoutMode: PageLayoutMode;
  onLayoutModeChange: (mode: PageLayoutMode) => void;
  
  // Zoom Controls
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSetScale: (scale: number) => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  
  // Focus & Fullscreen
  focusMode: boolean;
  onToggleFocusMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const StatusBar: React.FC<StatusBarProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  docSize,
  isComic,
  appMode = 'editor',
  subjectName,
  layoutMode,
  onLayoutModeChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSetScale,
  onFitWidth,
  onFitPage,
  focusMode,
  onToggleFocusMode,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState(String(currentPage));
  const jumpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setJumpInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (isJumpOpen) {
      setTimeout(() => jumpInputRef.current?.select(), 50);
    }
  }, [isJumpOpen]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setIsJumpOpen(false);
    }
  };

  const currentPercent = Math.round(scale * 100);

  return (
    <footer 
      className={`h-7 border-t border-outline/20 bg-surface/95 dark:bg-[#111416]/95 backdrop-blur-md px-2 sm:px-3 flex items-center justify-between gap-2 text-[11px] font-sans text-on-surface select-none z-30 flex-shrink-0 transition-opacity duration-200 ${
        focusMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'
      }`}
      aria-label="Document Status and View Bar"
    >
      {/* 1. Left Cluster: Page Stats & Document Details (WordCraft Standard) */}
      <div className="flex items-center gap-1.5 min-w-0">
        
        {/* Page Jump Button / Input */}
        {isJumpOpen ? (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
            <span className="text-[10px] text-muted font-mono">Page</span>
            <input
              ref={jumpInputRef}
              type="number"
              min={1}
              max={totalPages || 1}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onBlur={() => setIsJumpOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsJumpOpen(false);
              }}
              className="w-12 h-5 px-1 rounded bg-surface-container border border-accent text-center text-xs font-mono font-semibold focus:outline-none"
            />
            <span className="text-[10px] text-muted font-mono">/ {totalPages || 1}</span>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsJumpOpen(true)}
            title="Click to jump to page"
            className="h-5.5 px-2 rounded hover:bg-surface-high text-on-surface font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Hash className="h-3 w-3 opacity-60" />
            <span>Page {currentPage} of {totalPages || 1}</span>
          </button>
        )}

        <div className="h-3 w-px bg-outline/20 hidden md:block" />

        {/* Document Metadata Badges */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted font-mono">
          <span className="px-1.5 py-0.2 rounded bg-surface-container border border-outline/20 uppercase text-[9px] font-bold tracking-wider text-muted">
            {appMode}
          </span>
          {docSize ? <span>{formatBytes(docSize)}</span> : null}
          {isComic ? (
            <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 font-semibold uppercase">
              Comic
            </span>
          ) : null}
          {subjectName ? (
            <span className="px-1.5 py-0.2 rounded bg-accent/15 text-accent border border-accent/20 truncate max-w-[120px]">
              {subjectName}
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. Center Cluster: Smooth Scrubber & Page Nav (When applicable) */}
      <div className="hidden md:flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          title="Previous Page [Left Arrow]"
          className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-high disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {totalPages > 1 && (
          <input
            type="range"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            title={`Page ${currentPage} of ${totalPages}`}
            className="w-20 lg:w-32 h-1 accent-accent bg-outline/20 rounded-lg cursor-pointer transition-all"
          />
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          title="Next Page [Right Arrow / Space]"
          className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-high disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 3. Right Cluster: View Mode Switchers & Interactive Precision Zoom Slider (The WordCraft Signature) */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        
        {/* Segmented Layout View Buttons: Single | Facing | Continuous */}
        <div className="flex items-center bg-surface-container/80 p-0.5 rounded border border-outline/15 text-xs">
          <button
            type="button"
            onClick={() => onLayoutModeChange('single')}
            title="Single Page View [1]"
            className={`h-5 px-1.5 rounded flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
              layoutMode === 'single'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'text-on-surface hover:bg-surface-high opacity-70 hover:opacity-100'
            }`}
          >
            <Square className="h-3 w-3" />
            <span className="hidden xl:inline">Single</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutModeChange('facing-pages')}
            title="Facing Dual Pages [2]"
            className={`h-5 px-1.5 rounded flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
              layoutMode === 'facing-pages'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'text-on-surface hover:bg-surface-high opacity-70 hover:opacity-100'
            }`}
          >
            <Columns className="h-3 w-3" />
            <span className="hidden xl:inline">Facing</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutModeChange('continuous')}
            title="Continuous Vertical Scroll [3]"
            className={`h-5 px-1.5 rounded flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
              layoutMode === 'continuous'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'text-on-surface hover:bg-surface-high opacity-70 hover:opacity-100'
            }`}
          >
            <Rows className="h-3 w-3" />
            <span className="hidden xl:inline">Scroll</span>
          </button>
        </div>

        <div className="h-3 w-px bg-outline/20" />

        {/* Quick Fit Controls */}
        {layoutMode === 'single' && (
          <div className="hidden lg:flex items-center gap-0.5">
            {onFitPage && (
              <button
                type="button"
                onClick={onFitPage}
                title="Fit Page in Window [P]"
                className="h-5 px-1.5 rounded text-[10px] font-mono text-muted hover:text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
              >
                Fit
              </button>
            )}
            {onFitWidth && (
              <button
                type="button"
                onClick={onFitWidth}
                title="Fit Width [W]"
                className="h-5 px-1.5 rounded text-[10px] font-mono text-muted hover:text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
              >
                Width
              </button>
            )}
          </div>
        )}

        {/* Fine-Grained WordCraft Zoom Engine */}
        <div className="flex items-center gap-1">
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out [-]"
            aria-label="Zoom Out"
            className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-high text-on-surface transition-colors cursor-pointer"
          >
            <ZoomOut className="h-3 w-3" />
          </button>

          {/* Interactive Precision Zoom Slider (40% to 250%) */}
          <input
            type="range"
            min={40}
            max={250}
            step={5}
            value={currentPercent}
            onChange={(e) => onSetScale(Number(e.target.value) / 100)}
            title={`Zoom: ${currentPercent}%`}
            className="w-16 sm:w-20 h-1 accent-accent bg-outline/20 rounded-lg cursor-pointer"
          />

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In [+]"
            aria-label="Zoom In"
            className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-high text-on-surface transition-colors cursor-pointer"
          >
            <ZoomIn className="h-3 w-3" />
          </button>

          {/* Zoom Percentage Pill (Click resets to 100%) */}
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset Zoom to 100%"
            className="h-5 px-1.5 rounded font-mono text-[10px] tabular-nums font-semibold text-on-surface hover:text-accent hover:bg-surface-high transition-colors cursor-pointer"
          >
            {currentPercent}%
          </button>
        </div>

        <div className="h-3 w-px bg-outline/20 hidden sm:block" />

        {/* Zen Focus Toggle [Z] */}
        <button
          type="button"
          onClick={onToggleFocusMode}
          title={focusMode ? 'Exit Zen Mode [Z]' : 'Zen Focus Mode [Z]'}
          className={`h-5 w-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
            focusMode ? 'bg-tertiary text-accent-on' : 'hover:bg-surface-high text-on-surface'
          }`}
        >
          <Eye className="h-3 w-3" />
        </button>

        {/* Fullscreen Toggle [F] */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen [F]"
          className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-high text-on-surface transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>

      </div>
    </footer>
  );
};

export default memo(StatusBar);
