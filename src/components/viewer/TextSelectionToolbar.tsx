import React, { useState, useRef, useEffect } from 'react';
import { 
  Highlighter, 
  Globe, 
  Copy, 
  Check, 
  StickyNote, 
  Search, 
  X,
  Palette
} from 'lucide-react';
import { useFloatingConstraints } from '../../hooks/useFloatingConstraints';
import { VIEWPORT_CONSTRAINTS } from '../../utils/layoutConstraints';

export interface SelectionData {
  text: string;
  pageNum: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  clientRect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', hex: '#facc15' },
  { label: 'Green', hex: '#10b981' },
  { label: 'Sky Blue', hex: '#0ea5e9' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Amber', hex: '#f59e0b' },
] as const;

interface TextSelectionToolbarProps {
  selectionData: SelectionData | null;
  onHighlight: (color: string) => void;
  onSearchOnline: (text: string) => void;
  onSearchInDoc?: (text: string) => void;
  onAddStickyNote?: (text: string) => void;
  onClose: () => void;
  defaultColor?: string;
  isStudyMode?: boolean;
}

function TextSelectionToolbar({
  selectionData,
  onHighlight,
  onSearchOnline,
  onSearchInDoc,
  onAddStickyNote,
  onClose,
  defaultColor = '#facc15',
  isStudyMode = false,
}: TextSelectionToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [currentColor, setCurrentColor] = useState(defaultColor);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCopied(false);
    setShowPalette(false);
  }, [selectionData?.text]);

  const { clientRect, text } = selectionData || { clientRect: { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }, text: '' };

  const { style, actualPlacement } = useFloatingConstraints(
    { currentRect: selectionData ? clientRect : null },
    toolbarRef,
    {
      placement: 'top-center',
      offset: VIEWPORT_CONSTRAINTS.FLOATING_OFFSET_PX,
      viewportPadding: VIEWPORT_CONSTRAINTS.SAFE_INSET_PX,
      enabled: Boolean(selectionData && selectionData.text.trim()),
    }
  );

  if (!selectionData || !selectionData.text.trim()) {
    return null;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleQuickHighlight = (e: React.MouseEvent, color?: string) => {
    e.stopPropagation();
    const chosenColor = color || currentColor;
    setCurrentColor(chosenColor);
    onHighlight(chosenColor);
  };

  const handleSearchOnline = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSearchOnline(text);
  };

  return (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={style}
      data-placement={actualPlacement}
      className="z-[90] flex flex-col gap-1.5 p-1.5 rounded-2xl caelestia-glass border border-outline/20 shadow-[0_16px_50px_rgba(0,0,0,0.65)] text-on-surface select-none animate-in fade-in zoom-in-95 duration-200 ease-caelestia-decel ring-1 ring-white/10"
    >
      {/* Main Action Bar */}
      <div className="flex items-center gap-1">
        
        {/* 1. Highlight Button */}
        <div className="flex items-center rounded-full bg-surface-container hover:bg-surface-high border border-outline/20 transition-all duration-200 ease-caelestia-decel p-0.5">
          <button
            type="button"
            onClick={(e) => handleQuickHighlight(e)}
            title={`Highlight text in ${currentColor} (Click to highlight)`}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-on-surface hover:text-white transition-colors"
          >
            <div 
              className="h-3 w-3 rounded-full shadow-xs ring-1 ring-black/20 flex-shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <Highlighter className="h-3.5 w-3.5 text-accent" />
            <span>Highlight</span>
          </button>

          {/* Color Palette Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPalette((prev) => !prev);
            }}
            title="Choose highlight color"
            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-surface-highest text-zinc-400 hover:text-on-surface transition-colors"
          >
            <Palette className="h-3 w-3" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-outline/20 mx-0.5" />

        {/* 2. Search Online (Web Search) */}
        <button
          type="button"
          onClick={handleSearchOnline}
          title="Search Google in new tab"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-surface-high text-on-surface text-xs font-medium transition-all duration-200 ease-caelestia-decel"
        >
          <Globe className="h-3.5 w-3.5 text-accent" />
          <span>Search Online</span>
        </button>

        {/* 3. Search in Document */}
        {onSearchInDoc && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSearchInDoc(text);
            }}
            title="Find all occurrences in this document (Ctrl+F)"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-surface-high text-on-surface text-xs font-medium transition-all duration-200 ease-caelestia-decel"
          >
            <Search className="h-3.5 w-3.5 text-secondary" />
            <span className="hidden sm:inline">Find in Doc</span>
          </button>
        )}

        {/* 4. Add Sticky Note */}
        {onAddStickyNote && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddStickyNote(text);
            }}
            title="Create Sticky Note for this quote"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-surface-high text-on-surface text-xs font-medium transition-all duration-200 ease-caelestia-decel"
          >
            <StickyNote className="h-3.5 w-3.5 text-tertiary" />
            <span className="hidden md:inline">Note</span>
          </button>
        )}

        <div className="w-[1px] h-4 bg-outline/20 mx-0.5" />

        {/* 5. Copy Text Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy selected text to clipboard"
          className="h-7 px-2.5 rounded-full hover:bg-surface-high text-on-surface text-xs flex items-center gap-1.5 transition-all duration-200 ease-caelestia-decel"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] text-accent font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Dismiss selection menu"
          className="h-7 w-7 rounded-full hover:bg-surface-high text-zinc-400 hover:text-on-surface flex items-center justify-center transition-colors ml-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expandable Highlight Colors Strip */}
      {showPalette && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-outline/20 mt-0.5 bg-surface-lowest/70 rounded-xl">
          <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">Highlight Color:</span>
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={(e) => handleQuickHighlight(e, c.hex)}
                title={`Highlight in ${c.label}`}
                className={`h-5 w-5 rounded-full transition-all duration-200 ease-caelestia-decel flex items-center justify-center ${
                  currentColor === c.hex
                    ? 'ring-2 ring-accent scale-110 shadow-sm'
                    : 'hover:scale-110 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {currentColor === c.hex && <Check className="h-2.5 w-2.5 text-black stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Study Mode Indicator Badge */}
      {isStudyMode && (
        <div className="px-3 py-1 bg-accent/10 border-t border-accent/25 rounded-b-xl flex items-center justify-between text-[9px] font-mono text-accent">
          <span>Study Mode Active</span>
          <span>Instant Capture</span>
        </div>
      )}
    </div>
  );
}

export default React.memo(TextSelectionToolbar);
