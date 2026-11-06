import React, { useState, useRef, memo } from 'react';
import FloatingAnchor from '../common/FloatingAnchor';
import { 
  MousePointer, 
  Highlighter, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  MessageSquareQuote, 
  PenTool, 
  Square, 
  ArrowUpRight, 
  Minus, 
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
  ChevronDown, 
  Award
} from 'lucide-react';
import { AnnotationToolType } from '../../types';

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

export interface StudioRibbonProps {
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
  onOpenSignModal?: () => void;
  isVisible: boolean;
}

const StudioRibbon: React.FC<StudioRibbonProps> = ({
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
  onOpenSignModal,
  isVisible,
}) => {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMeasureMenu, setShowMeasureMenu] = useState(false);

  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const shapesBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const measureBtnRef = useRef<HTMLButtonElement>(null);

  if (!isVisible) return null;

  return (
    <div 
      className="w-full border-b border-outline/20 bg-surface/90 dark:bg-[#141719]/90 backdrop-blur-md px-3 sm:px-4 py-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar z-20 select-none transition-all duration-200"
      aria-label="Studio Annotation Ribbon"
    >
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        
        {/* 1. Pointer / Select Tool */}
        <button
          type="button"
          onClick={() => onSelectTool('select')}
          title="Select & Navigate (V)"
          className={`h-7 px-2 rounded-md flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
            activeTool === 'select'
              ? 'bg-accent text-accent-on font-bold shadow-2xs'
              : 'hover:bg-surface-high text-on-surface'
          }`}
        >
          <MousePointer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Select</span>
        </button>

        <div className="h-4 w-px bg-outline/20 mx-0.5" />

        {/* 2. Text Markup Group */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectTool('highlight')}
            title="Highlighter (H)"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'highlight'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" style={{ color: activeTool === 'highlight' ? 'inherit' : activeColor }} />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('underline')}
            title="Underline"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'underline'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('strikeout')}
            title="Strikethrough"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'strikeout'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('callout')}
            title="Callout"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'callout'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <MessageSquareQuote className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-outline/20 mx-0.5" />

        {/* 3. Drawing & Shapes Group */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectTool('pen')}
            title="Pen (P)"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
          </button>

          {/* Shapes Dropdown */}
          <div className="relative">
            <button
              ref={shapesBtnRef}
              type="button"
              onClick={() => setShowShapesMenu((prev) => !prev)}
              title="Geometric Shapes (Rectangle, Arrow, Line, Polygon)"
              className={`h-7 px-1.5 rounded-md flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                ['rectangle', 'arrow', 'line', 'polygon'].includes(activeTool)
                  ? 'bg-accent text-accent-on font-bold shadow-2xs'
                  : 'hover:bg-surface-high text-on-surface'
              }`}
            >
              {activeTool === 'arrow' ? <ArrowUpRight className="h-3.5 w-3.5" /> :
               activeTool === 'line' ? <Minus className="h-3.5 w-3.5" /> :
               activeTool === 'polygon' ? <Hexagon className="h-3.5 w-3.5" /> :
               <Square className="h-3.5 w-3.5" />}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            <FloatingAnchor
              isOpen={showShapesMenu}
              onClose={() => setShowShapesMenu(false)}
              anchorRef={shapesBtnRef}
              placement="bottom-start"
              className="w-40 p-1 rounded-xl caelestia-glass border border-outline/20 shadow-xl flex flex-col gap-0.5 text-xs z-50"
            >
              <button
                type="button"
                onClick={() => { onSelectTool('rectangle'); setShowShapesMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 text-accent" />
                <span>Rectangle</span>
              </button>
              <button
                type="button"
                onClick={() => { onSelectTool('arrow'); setShowShapesMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                <span>Arrow</span>
              </button>
              <button
                type="button"
                onClick={() => { onSelectTool('line'); setShowShapesMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5 text-sky-400" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => { onSelectTool('polygon'); setShowShapesMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <Hexagon className="h-3.5 w-3.5 text-purple-400" />
                <span>Polygon</span>
              </button>
            </FloatingAnchor>
          </div>
        </div>

        <div className="h-4 w-px bg-outline/20 mx-0.5" />

        {/* 4. Text & Notes Group */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectTool('textbox')}
            title="Text Box (T)"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'textbox'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('sticky-note')}
            title="Sticky Note (N)"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'sticky-note'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5 text-amber-400" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('voice-note')}
            title="Voice Note (M)"
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              activeTool === 'voice-note'
                ? 'bg-accent text-accent-on font-bold shadow-2xs'
                : 'hover:bg-surface-high text-on-surface'
            }`}
          >
            <Mic className="h-3.5 w-3.5 text-rose-400" />
          </button>
        </div>

        <div className="h-4 w-px bg-outline/20 mx-0.5" />

        {/* 5. Measurement & Signature Tools */}
        <div className="flex items-center gap-0.5">
          {/* Measure Menu */}
          <div className="relative">
            <button
              ref={measureBtnRef}
              type="button"
              onClick={() => setShowMeasureMenu((prev) => !prev)}
              title="Engineering Calibration & Distance Measuring"
              className={`h-7 px-1.5 rounded-md flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                activeTool === 'measure-distance' || activeTool === 'measure-area'
                  ? 'bg-accent text-accent-on font-bold shadow-2xs'
                  : 'hover:bg-surface-high text-on-surface'
              }`}
            >
              <Ruler className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            <FloatingAnchor
              isOpen={showMeasureMenu}
              onClose={() => setShowMeasureMenu(false)}
              anchorRef={measureBtnRef}
              placement="bottom-start"
              className="w-44 p-1 rounded-xl caelestia-glass border border-outline/20 shadow-xl flex flex-col gap-0.5 text-xs z-50"
            >
              <button
                type="button"
                onClick={() => { onSelectTool('measure-distance'); setShowMeasureMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <Ruler className="h-3.5 w-3.5 text-accent" />
                <span>Distance Tool</span>
              </button>
              <button
                type="button"
                onClick={() => { onSelectTool('measure-area'); setShowMeasureMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <DraftingCompass className="h-3.5 w-3.5 text-emerald-400" />
                <span>Area Polygon</span>
              </button>
            </FloatingAnchor>
          </div>

          {onOpenSignModal && (
            <button
              type="button"
              onClick={onOpenSignModal}
              title="Sign Document Digitally"
              className="h-7 px-2 rounded-md flex items-center gap-1 text-xs text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
            >
              <Award className="h-3.5 w-3.5 text-accent" />
              <span className="hidden md:inline">Sign</span>
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-outline/20 mx-0.5" />

        {/* 6. Color & Stroke Palette */}
        <div className="relative">
          <button
            ref={colorBtnRef}
            type="button"
            onClick={() => setShowColorMenu((prev) => !prev)}
            title="Stroke Color & Thickness"
            className="h-7 px-2 rounded-md flex items-center gap-1.5 hover:bg-surface-high transition-colors cursor-pointer"
          >
            <span 
              className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-xs"
              style={{ backgroundColor: activeColor }}
            />
            <span className="text-[11px] font-mono text-muted">{strokeWidth}px</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          <FloatingAnchor
            isOpen={showColorMenu}
            onClose={() => setShowColorMenu(false)}
            anchorRef={colorBtnRef}
            placement="bottom-start"
            className="w-56 p-2 rounded-xl caelestia-glass border border-outline/20 shadow-2xl flex flex-col gap-2 text-xs z-50"
          >
            <div>
              <div className="text-[10px] font-mono text-muted uppercase font-semibold mb-1">Color</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ANNOTATION_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => { onSelectColor(c.hex); }}
                    title={c.label}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      activeColor === c.hex ? 'scale-120 border-white shadow-sm ring-1 ring-accent' : 'border-black/20 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-outline/20 pt-1.5">
              <div className="text-[10px] font-mono text-muted uppercase font-semibold mb-1">Stroke Width</div>
              <div className="flex items-center gap-1">
                {STROKE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => { onSelectStrokeWidth(sz); }}
                    className={`flex-1 h-6 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                      strokeWidth === sz ? 'bg-accent text-accent-on font-bold' : 'hover:bg-surface-high text-on-surface'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>
          </FloatingAnchor>
        </div>

      </div>

      {/* Right Cluster: History (Undo/Redo), Clear & Export */}
      <div className="flex items-center gap-1 flex-shrink-0">
        
        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Annotation (⌘Z)"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-surface-high disabled:opacity-30 text-on-surface transition-colors cursor-pointer"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Annotation (⌘⇧Z)"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-surface-high disabled:opacity-30 text-on-surface transition-colors cursor-pointer"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        {/* Clear Annotations */}
        <button
          type="button"
          onClick={onClearPageAnnotations}
          title="Clear Annotations on this Page"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-rose-500/15 text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-outline/20 mx-0.5" />

        {/* Export Annotations Menu */}
        <div className="relative">
          <button
            ref={exportBtnRef}
            type="button"
            onClick={() => setShowExportMenu((prev) => !prev)}
            title="Export Annotated Document or Data"
            className="h-7 px-2 rounded-md flex items-center gap-1 text-xs text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-accent" />
            <span className="hidden md:inline">Export</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          <FloatingAnchor
            isOpen={showExportMenu}
            onClose={() => setShowExportMenu(false)}
            anchorRef={exportBtnRef}
            placement="bottom-end"
            className="w-48 p-1 rounded-xl caelestia-glass border border-outline/20 shadow-xl flex flex-col gap-0.5 text-xs z-50"
          >
            {onExportAnnotatedPDF && (
              <button
                type="button"
                onClick={() => { onExportAnnotatedPDF(); setShowExportMenu(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-accent" />
                <span>Save Annotated PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { onExportXFDF(); setShowExportMenu(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export XFDF</span>
            </button>
            <button
              type="button"
              onClick={() => { onExportJSON(); setShowExportMenu(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-high text-left cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              <span>Export JSON</span>
            </button>
          </FloatingAnchor>
        </div>

      </div>
    </div>
  );
};

export default memo(StudioRibbon);
