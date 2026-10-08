import { useState, useCallback, useRef, memo } from 'react';
import FloatingAnchor from '../common/FloatingAnchor';
import { 
  MousePointer, 
  Highlighter, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Spline, 
  MessageSquareQuote, 
  PenTool, 
  Square, 
  ArrowUpRight, 
  Minus, 
  Plus,
  Hexagon, 
  Ruler, 
  DraftingCompass, 
  Type, 
  StickyNote, 
  Mic, 
  Undo2, 
  Redo2, 
  Download, 
  Trash2, 
  ChevronUp, 
  Palette
} from 'lucide-react';
import { AnnotationToolType } from '../../types';

// Hoisted constants outside component body (rerender-memo-with-default-value, rendering-hoist-jsx)
const ANNOTATION_COLORS = [
  { label: 'Yellow', hex: '#facc15' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Sky Blue', hex: '#0ea5e9' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Dark Charcoal', hex: '#18181b' },
] as const;

const STROKE_SIZES = [1, 2, 4, 6, 8] as const;

const TEXT_MARKUP_TOOLS = new Set<AnnotationToolType>([
  'highlight', 
  'underline', 
  'strikeout', 
  'squiggly', 
  'callout'
]);

const SHAPE_TOOLS = new Set<AnnotationToolType>([
  'pen', 
  'rectangle', 
  'arrow', 
  'line', 
  'polygon'
]);

const MEASURE_TOOLS = new Set<AnnotationToolType>([
  'measure-distance', 
  'measure-area'
]);

interface FloatingAnnotationToolbarProps {
  activeTool: AnnotationToolType;
  onSelectTool: (tool: AnnotationToolType) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onSelectStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPageAnnotations: () => void;
  onExportXFDF: () => void;
  onExportJSON: () => void;
  onExportAnnotatedPDF?: () => void;
  // Zoom & View Controls
  scale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onSetScale?: (scale: number) => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  focusMode?: boolean;
}

function FloatingAnnotationToolbar({
  activeTool,
  onSelectTool,
  activeColor,
  onSelectColor,
  strokeWidth,
  onSelectStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPageAnnotations,
  onExportXFDF,
  onExportJSON,
  onExportAnnotatedPDF,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSetScale,
  onFitWidth,
  onFitPage,
  focusMode,
}: FloatingAnnotationToolbarProps) {
  const [showMarkupMenu, setShowMarkupMenu] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showMeasureMenu, setShowMeasureMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const markupBtnRef = useRef<HTMLButtonElement>(null);
  const shapesBtnRef = useRef<HTMLButtonElement>(null);
  const measureBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  const closeAllMenus = useCallback(() => {
    setShowMarkupMenu(false);
    setShowShapesMenu(false);
    setShowMeasureMenu(false);
    setShowColorMenu(false);
    setShowExportMenu(false);
  }, []);

  const isTextMarkupActive = TEXT_MARKUP_TOOLS.has(activeTool);
  const isShapeActive = SHAPE_TOOLS.has(activeTool);
  const isMeasureActive = MEASURE_TOOLS.has(activeTool);

  return (
    <div className="fixed inset-x-0 bottom-6 pointer-events-none z-40 flex justify-center px-4">
      <div className={`pointer-events-auto max-w-[min(96vw,880px)] overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full caelestia-glass-dock text-zinc-900 dark:text-zinc-100 select-none animate-in fade-in slide-in-from-bottom-3 duration-200 transition-opacity ${
        focusMode ? 'opacity-30 hover:opacity-100' : 'opacity-100'
      }`}>
      
      {/* 1. Pointer / Select Tool */}
      <button
        onClick={() => {
          onSelectTool('select');
          closeAllMenus();
        }}
        title="Select & Navigate (V)"
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'select' 
            ? 'bg-accent text-[#00363d] shadow-xs font-bold' 
            : 'hover:bg-surface-container text-zinc-700 dark:text-zinc-200'
        }`}
      >
        <MousePointer className="h-4 w-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 2. Text Markup Group Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          ref={markupBtnRef}
          onClick={() => {
            setShowMarkupMenu((p) => !p);
            setShowShapesMenu(false);
            setShowMeasureMenu(false);
            setShowColorMenu(false);
            setShowExportMenu(false);
          }}
          title="Text Markup Tools (Highlight, Underline, Strikeout, Squiggly, Callout)"
          className={`h-8 px-3 rounded-full border flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-all ${
            isTextMarkupActive 
              ? 'bg-accent text-[#00363d] border-accent shadow-xs' 
              : 'border-border hover:bg-surface-container text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {activeTool === 'highlight' ? <Highlighter className="h-3.5 w-3.5" /> :
           activeTool === 'underline' ? <UnderlineIcon className="h-3.5 w-3.5" /> :
           activeTool === 'strikeout' ? <Strikethrough className="h-3.5 w-3.5" /> :
           activeTool === 'squiggly' ? <Spline className="h-3.5 w-3.5" /> :
           activeTool === 'callout' ? <MessageSquareQuote className="h-3.5 w-3.5" /> :
           <Highlighter className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline capitalize">
            {isTextMarkupActive ? activeTool : 'Markup'}
          </span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        <FloatingAnchor
          isOpen={showMarkupMenu}
          onClose={() => setShowMarkupMenu(false)}
          anchorRef={markupBtnRef}
          placement="top-start"
          className="w-48 p-1.5 rounded-2xl caelestia-glass shadow-2xl flex flex-col gap-1 text-xs"
        >
          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Text Markup</div>
          <button
            onClick={() => { onSelectTool('highlight'); setShowMarkupMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'highlight' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200'}`}
          >
            <Highlighter className="h-3.5 w-3.5 text-amber-500" />
            <span>Highlight</span>
          </button>
          <button
            onClick={() => { onSelectTool('underline'); setShowMarkupMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'underline' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200'}`}
          >
            <UnderlineIcon className="h-3.5 w-3.5 text-emerald-500" />
            <span>Underline</span>
          </button>
          <button
            onClick={() => { onSelectTool('strikeout'); setShowMarkupMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'strikeout' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200'}`}
          >
            <Strikethrough className="h-3.5 w-3.5 text-rose-500" />
            <span>Strikethrough</span>
          </button>
          <button
            onClick={() => { onSelectTool('squiggly'); setShowMarkupMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'squiggly' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200'}`}
          >
            <Spline className="h-3.5 w-3.5 text-purple-500" />
            <span>Squiggly Underline</span>
          </button>
          <button
            onClick={() => { onSelectTool('callout'); setShowMarkupMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'callout' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200'}`}
          >
            <MessageSquareQuote className="h-3.5 w-3.5 text-sky-500" />
            <span>Text Callout</span>
          </button>
        </FloatingAnchor>
      </div>

      {/* 3. Drawing & Shapes Group Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          ref={shapesBtnRef}
          onClick={() => {
            setShowShapesMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowMeasureMenu(false);
            setShowColorMenu(false);
            setShowExportMenu(false);
          }}
          title="Drawing & Shapes (Pen, Rectangle, Arrow, Line, Polygon)"
          className={`h-8 px-3 rounded-full border flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-all ${
            isShapeActive 
              ? 'bg-accent text-[#00363d] border-accent shadow-xs' 
              : 'border-border hover:bg-surface-container text-zinc-800 dark:text-zinc-100'
          }`}
        >
          {activeTool === 'pen' ? <PenTool className="h-3.5 w-3.5" /> :
           activeTool === 'rectangle' ? <Square className="h-3.5 w-3.5" /> :
           activeTool === 'arrow' ? <ArrowUpRight className="h-3.5 w-3.5" /> :
           activeTool === 'line' ? <Minus className="h-3.5 w-3.5" /> :
           activeTool === 'polygon' ? <Hexagon className="h-3.5 w-3.5" /> :
           <PenTool className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline capitalize">
            {isShapeActive ? activeTool : 'Shapes'}
          </span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        <FloatingAnchor
          isOpen={showShapesMenu}
          onClose={() => setShowShapesMenu(false)}
          anchorRef={shapesBtnRef}
          placement="top-start"
          className="w-48 p-1.5 rounded-2xl caelestia-glass shadow-2xl flex flex-col gap-1 text-xs"
        >
          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Drawing & Shapes</div>
          <button
            onClick={() => { onSelectTool('pen'); setShowShapesMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'pen' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Freehand Pen</span>
          </button>
          <button
            onClick={() => { onSelectTool('rectangle'); setShowShapesMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'rectangle' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <Square className="h-3.5 w-3.5" />
            <span>Rectangle</span>
          </button>
          <button
            onClick={() => { onSelectTool('arrow'); setShowShapesMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'arrow' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Arrow Pointer</span>
          </button>
          <button
            onClick={() => { onSelectTool('line'); setShowShapesMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'line' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <Minus className="h-3.5 w-3.5" />
            <span>Straight Line</span>
          </button>
          <button
            onClick={() => { onSelectTool('polygon'); setShowShapesMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'polygon' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <Hexagon className="h-3.5 w-3.5" />
            <span>Polygon Area</span>
          </button>
        </FloatingAnchor>
      </div>

      {/* 4. Measuring Tools Group Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          ref={measureBtnRef}
          onClick={() => {
            setShowMeasureMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowShapesMenu(false);
            setShowColorMenu(false);
            setShowExportMenu(false);
          }}
          title="Measuring Tools (Distance / Perimeter & Area)"
          className={`h-8 px-3 rounded-full border flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-all ${
            isMeasureActive 
              ? 'bg-accent text-[#00363d] border-accent shadow-xs' 
              : 'border-border hover:bg-surface-container text-zinc-800 dark:text-zinc-100'
          }`}
        >
          {activeTool === 'measure-distance' ? <Ruler className="h-3.5 w-3.5" /> : <DraftingCompass className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">Measure</span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        <FloatingAnchor
          isOpen={showMeasureMenu}
          onClose={() => setShowMeasureMenu(false)}
          anchorRef={measureBtnRef}
          placement="top-start"
          className="w-52 p-1.5 rounded-2xl caelestia-glass shadow-2xl flex flex-col gap-1 text-xs"
        >
          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Measuring Tools</div>
          <button
            onClick={() => { onSelectTool('measure-distance'); setShowMeasureMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'measure-distance' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <Ruler className="h-3.5 w-3.5 text-accent" />
            <div>
              <div className="font-semibold">Distance & Perimeter</div>
              <div className="text-[10px] opacity-70 font-mono">Calibrated line length</div>
            </div>
          </button>
          <button
            onClick={() => { onSelectTool('measure-area'); setShowMeasureMenu(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors ${activeTool === 'measure-area' ? 'bg-accent text-[#00363d] font-bold' : 'hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-100'}`}
          >
            <DraftingCompass className="h-3.5 w-3.5 text-accent" />
            <div>
              <div className="font-semibold">Area Calculation</div>
              <div className="text-[10px] opacity-70 font-mono">Multi-point surface area</div>
            </div>
          </button>
        </FloatingAnchor>
      </div>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 5. Text Box Tool */}
      <button
        onClick={() => {
          onSelectTool('textbox');
          closeAllMenus();
        }}
        title="Text Box Tool (T) — Click anywhere on canvas to type"
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'textbox' 
            ? 'bg-accent text-[#00363d] shadow-xs font-bold' 
            : 'hover:bg-surface-container text-zinc-700 dark:text-zinc-200'
        }`}
      >
        <Type className="h-4 w-4" />
      </button>

      {/* 6. Sticky Note Tool */}
      <button
        onClick={() => {
          onSelectTool('sticky-note');
          closeAllMenus();
        }}
        title="Sticky Note (N) — Click anywhere to add a threaded comment pin"
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'sticky-note' 
            ? 'bg-amber-400 text-[#101415] shadow-xs font-bold' 
            : 'hover:bg-surface-container text-zinc-700 dark:text-zinc-200'
        }`}
      >
        <StickyNote className="h-4 w-4" />
      </button>

      {/* 7. Voice Note Memo Tool */}
      <button
        onClick={() => {
          onSelectTool('voice-note');
          closeAllMenus();
        }}
        title="Voice Note (M) — Click anywhere to record an embedded voice comment"
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'voice-note' 
            ? 'bg-rose-500 text-white shadow-xs font-bold' 
            : 'hover:bg-surface-container text-zinc-700 dark:text-zinc-200'
        }`}
      >
        <Mic className="h-4 w-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 8. Color Palette & Stroke Picker Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          ref={colorBtnRef}
          onClick={() => {
            setShowColorMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowShapesMenu(false);
            setShowMeasureMenu(false);
            setShowExportMenu(false);
          }}
          title="Annotation Color & Stroke Width"
          className="h-8 px-2.5 rounded-full border border-border hover:bg-surface-container flex items-center gap-1.5 transition-all shadow-xs text-zinc-800 dark:text-zinc-100"
        >
          <div 
            className="h-3.5 w-3.5 rounded-full shadow-xs ring-1 ring-black/20"
            style={{ backgroundColor: activeColor }}
          />
          <span className="text-[11px] font-mono font-medium hidden sm:inline">{strokeWidth}px</span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        <FloatingAnchor
          isOpen={showColorMenu}
          onClose={() => setShowColorMenu(false)}
          anchorRef={colorBtnRef}
          placement="top-end"
          className="w-52 p-3 rounded-2xl caelestia-glass shadow-2xl flex flex-col gap-3 text-xs"
        >
          {/* Color Palette */}
          <div>
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold mb-1.5 flex items-center gap-1">
              <Palette className="h-3 w-3" /> Color Palette
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => {
                    onSelectColor(c.hex);
                    setShowColorMenu(false);
                  }}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  className={`h-5 w-5 rounded-full transition-transform border border-black/15 dark:border-white/20 ${
                    activeColor === c.hex ? 'scale-125 ring-2 ring-accent' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width Selector */}
          <div className="pt-2 border-t border-border">
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold mb-1.5">
              Stroke Width
            </div>
            <div className="flex items-center justify-between gap-1 bg-surface-container p-1 rounded-xl border border-border">
              {STROKE_SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => {
                    onSelectStrokeWidth(sz);
                    setShowColorMenu(false);
                  }}
                  className={`h-6 px-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                    strokeWidth === sz ? 'bg-accent text-[#00363d] shadow-xs' : 'text-zinc-500 hover:text-on-surface'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        </FloatingAnchor>
      </div>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 9. Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo Annotation (⌘Z)"
        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 text-zinc-500 hover:text-on-surface transition-colors flex-shrink-0"
      >
        <Undo2 className="h-4 w-4" />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo Annotation (⌘⇧Z)"
        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 text-zinc-500 hover:text-on-surface transition-colors flex-shrink-0"
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 10. Export Annotations Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          ref={exportBtnRef}
          onClick={() => {
            setShowExportMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowShapesMenu(false);
            setShowMeasureMenu(false);
            setShowColorMenu(false);
          }}
          title="Export Annotations (XFDF / JSON)"
          className="h-8 px-3 rounded-full border border-border hover:bg-surface-container flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-zinc-800 dark:text-zinc-100 transition-all shadow-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Export</span>
        </button>

        <FloatingAnchor
          isOpen={showExportMenu}
          onClose={() => setShowExportMenu(false)}
          anchorRef={exportBtnRef}
          placement="top-end"
          className="w-56 p-1.5 rounded-2xl caelestia-glass shadow-2xl flex flex-col gap-1 text-xs"
        >
          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Export & Save</div>
          {onExportAnnotatedPDF ? (
            <button
              onClick={() => { onExportAnnotatedPDF(); setShowExportMenu(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-emerald-600 hover:text-white transition-colors group bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
              <div>
                <div className="font-semibold">Bake Annotations into PDF</div>
                <div className="text-[10px] opacity-80 font-mono">Download flattened PDF file</div>
              </div>
            </button>
          ) : null}
          <button
            onClick={() => { onExportXFDF(); setShowExportMenu(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200 transition-colors group"
          >
            <Download className="h-3.5 w-3.5 text-accent" />
            <div>
              <div className="font-semibold">Adobe XFDF Format</div>
              <div className="text-[10px] opacity-70 font-mono">Compatible with Acrobat Pro</div>
            </div>
          </button>
          <button
            onClick={() => { onExportJSON(); setShowExportMenu(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-accent/15 hover:text-accent text-zinc-800 dark:text-zinc-200 transition-colors group"
          >
            <Download className="h-3.5 w-3.5 text-accent" />
            <div>
              <div className="font-semibold">Structured JSON Export</div>
              <div className="text-[10px] opacity-70 font-mono">Full annotations payload</div>
            </div>
          </button>
        </FloatingAnchor>
      </div>

      {/* 11. Clear Page Annotations */}
      <button
        onClick={onClearPageAnnotations}
        title="Clear annotations on this page"
        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-rose-500/15 hover:text-rose-400 text-zinc-500 transition-colors flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* 12. Zoom & Layout Controls (Unified inside same dock with clean layout) */}
      {typeof scale === 'number' && (
        <>
          <div className="w-[1px] h-5 bg-border mx-1 flex-shrink-0" />

          {onFitWidth && (
            <button
              onClick={onFitWidth}
              title="Fit to Width"
              className="h-8 px-3 rounded-full border border-border hover:bg-surface-container text-xs font-semibold whitespace-nowrap text-zinc-800 dark:text-zinc-100 transition-all flex items-center gap-1 flex-shrink-0"
            >
              <span>Fit W</span>
            </button>
          )}

          {onFitPage && (
            <button
              onClick={onFitPage}
              title="Fit to Page"
              className="h-8 px-3 rounded-full border border-border hover:bg-surface-container text-xs font-semibold whitespace-nowrap text-zinc-800 dark:text-zinc-100 transition-all hidden sm:inline-flex items-center gap-1 flex-shrink-0"
            >
              <span>Fit H</span>
            </button>
          )}

          {onZoomOut && (
            <button
              onClick={onZoomOut}
              disabled={scale <= 0.4}
              title="Zoom Out (-)"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 transition-colors text-zinc-700 dark:text-zinc-200 flex-shrink-0"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          )}

          {onSetScale && (
            <input
              type="range"
              min="40"
              max="250"
              step="1"
              value={Math.round(scale * 100)}
              onChange={(e) => onSetScale(parseFloat(e.target.value) / 100)}
              className="w-16 sm:w-20 md:w-24 h-1.5 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-accent hidden md:inline-block flex-shrink-0 border border-border"
              title={`Zoom: ${Math.round(scale * 100)}%`}
            />
          )}

          {onZoomIn && (
            <button
              onClick={onZoomIn}
              disabled={scale >= 2.5}
              title="Zoom In (+)"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 transition-colors text-zinc-700 dark:text-zinc-200 flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          {onZoomReset && (
            <button
              onClick={onZoomReset}
              title="Reset to 100%"
              className="h-8 px-2.5 rounded-full bg-surface-container border border-border hover:border-accent text-xs font-mono font-bold text-accent transition-all whitespace-nowrap shadow-2xs flex-shrink-0"
            >
              {Math.round(scale * 100)}%
            </button>
          )}
        </>
      )}

      </div>
    </div>
  );
}

export default memo(FloatingAnnotationToolbar);
