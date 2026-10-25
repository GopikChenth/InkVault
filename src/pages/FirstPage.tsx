import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  FolderOpen,
  Layers,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  FileText,
  CornerDownRight
} from 'lucide-react';
import { AppMode } from '../types';
import { 
  FIRST_PAGE_CONSTRAINTS, 
  VIEWPORT_CONSTRAINTS 
} from '../utils/layoutConstraints';

interface FirstPageProps {
  onEnterWorkspace: (mode?: AppMode) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  currentMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
}

/**
 * InkVault Scientific Color Theory Palette (docs/COLOR_THEORY.md)
 * - Studio / Editor: Blueprint Cyan (#81D3E0 / #00363d, 485–495 nm)
 * - Study Focus: Botanical Sage (#8DDBB0 / #072A18, 520–545 nm)
 * - Zen Reader: Bibliophile Amber (#EAA558 / #291402, 585–595 nm)
 */
interface ModeConfig {
  id: AppMode;
  code: string;
  serial: string;
  title: string;
  tag: string;
  archetype: string;
  accent: string;
  onAccent: string;
  glow: string;
  border: string;
  icon: typeof Layers;
  brief: string;
  features: string[];
}

const WORKFLOW_MODES: ModeConfig[] = [
  {
    id: 'editor',
    code: '01',
    serial: 'MOD-01',
    title: 'Studio Suite',
    tag: 'BLUEPRINT CYAN // PDF TOOLS',
    archetype: 'Blueprint Cyan',
    accent: '#81D3E0',
    onAccent: '#00363d',
    glow: 'rgba(129, 211, 224, 0.45)',
    border: 'rgba(129, 211, 224, 0.55)',
    icon: Layers,
    brief: 'High-performance PDF utility suite powered by a local Rust engine for merging, splitting, compressing, digital signing, and stream redaction.',
    features: ['Merge & Split', 'AES-256 Protection', 'Stream Redaction', 'Lossless Compress'],
  },
  {
    id: 'study',
    code: '02',
    serial: 'MOD-02',
    title: 'Study Focus',
    tag: 'BOTANICAL SAGE // ACADEMIC',
    archetype: 'Botanical Sage',
    accent: '#8DDBB0',
    onAccent: '#072A18',
    glow: 'rgba(141, 219, 176, 0.45)',
    border: 'rgba(141, 219, 176, 0.55)',
    icon: GraduationCap,
    brief: 'Distraction-free environment engineered for legal research and coursework with hierarchical subject trees, Pomodoro focus, and split-document compare.',
    features: ['Subject Trees', 'Pomodoro Timer', 'Split Compare', 'Contextual Search'],
  },
  {
    id: 'reader',
    code: '03',
    serial: 'MOD-03',
    title: 'Zen Reader',
    tag: 'BIBLIOPHILE AMBER // BOOKS & COMICS',
    archetype: 'Bibliophile Amber',
    accent: '#EAA558',
    onAccent: '#291402',
    glow: 'rgba(234, 165, 88, 0.45)',
    border: 'rgba(234, 165, 88, 0.55)',
    icon: BookOpen,
    brief: 'Zen reading environment tailored for EPUB books, CBZ/CBR graphic novel archives, continuous dual spreads, and Circadian warm paper tones.',
    features: ['EPUB Reader', 'CBZ / CBR Comics', 'Dual Spreads', 'Circadian Tones'],
  },
];

export default function FirstPage({ 
  onEnterWorkspace, 
  currentMode = 'editor',
  onSelectMode,
}: FirstPageProps) {
  const [internalMode, setInternalMode] = useState<AppMode>(currentMode || 'editor');
  const activeMode = onSelectMode && currentMode ? currentMode : internalMode;

  const handleSelectMode = (mode: AppMode) => {
    if (onSelectMode) {
      onSelectMode(mode);
    } else {
      setInternalMode(mode);
    }
  };

  const activeModeConfig = WORKFLOW_MODES.find(m => m.id === activeMode) || WORKFLOW_MODES[0];

  // Hotkeys: ⌘↵ / Ctrl+Enter to launch, 1/2/3 to switch modes, ⌘O to open file
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onEnterWorkspace(activeMode);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        onEnterWorkspace(activeMode);
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') handleSelectMode('editor');
        if (e.key === '2') handleSelectMode('study');
        if (e.key === '3') handleSelectMode('reader');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, onEnterWorkspace]);

  return (
    <div 
      data-mode={activeMode} 
      className="relative w-full h-full max-h-screen overflow-hidden bg-[#0d1012] text-zinc-100 flex flex-col justify-between select-none transition-colors duration-200"
    >
      
      {/* 1. Cyberpunk Coordinate Grid & Diagonal Hatch Watermarks */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Atmospheric Mode-Tinted Watermark Glow */}
      <div 
        className="absolute top-10 right-24 w-48 h-32 pointer-events-none opacity-[0.06] hidden lg:block transition-all duration-300"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${activeModeConfig.accent} 0, ${activeModeConfig.accent} 2px, transparent 0, transparent 8px)`,
        }}
      />

      {/* Cyber Reticles on Intersections */}
      <div 
        className="absolute top-8 left-16 font-mono text-[9px] pointer-events-none hidden md:block transition-colors duration-200"
        style={{ color: `${activeModeConfig.accent}80` }}
      >
        +
      </div>
      <div 
        className="absolute top-8 right-44 font-mono text-[9px] pointer-events-none hidden md:block transition-colors duration-200"
        style={{ color: `${activeModeConfig.accent}80` }}
      >
        +
      </div>
      <div 
        className="absolute bottom-24 left-24 font-mono text-[9px] pointer-events-none hidden md:block transition-colors duration-200"
        style={{ color: `${activeModeConfig.accent}80` }}
      >
        +
      </div>
      <div 
        className="absolute bottom-20 right-28 font-mono text-[9px] pointer-events-none hidden md:block transition-colors duration-200"
        style={{ color: `${activeModeConfig.accent}80` }}
      >
        +
      </div>

      {/* Vertical Caliper Measurement Rail with Dynamic Color Theory Accent */}
      <div className="absolute left-3 top-20 bottom-20 w-3 hidden xl:flex flex-col items-center pointer-events-none z-20">
        <div className="w-2.5 h-[1.5px] transition-colors duration-200" style={{ backgroundColor: activeModeConfig.accent }} />
        <div 
          className="w-[1px] flex-1 relative flex items-center justify-center my-0.5 transition-colors duration-200"
          style={{ backgroundColor: `${activeModeConfig.accent}40` }}
        >
          <div 
            className="w-2.5 h-2.5 rotate-45 transition-all duration-200"
            style={{ 
              backgroundColor: activeModeConfig.accent,
              boxShadow: `0 0 10px ${activeModeConfig.glow}` 
            }} 
          />
        </div>
        <div className="w-2.5 h-[1.5px] transition-colors duration-200" style={{ backgroundColor: activeModeConfig.accent }} />
      </div>

      {/* 2. Top Navigation Bar — Constrained by VIEWPORT_CONSTRAINTS & FIRST_PAGE_CONSTRAINTS */}
      <header 
        style={{ 
          maxWidth: `${FIRST_PAGE_CONSTRAINTS.MAX_CONTAINER_WIDTH_PX}px`,
          minHeight: `${VIEWPORT_CONSTRAINTS.HEADER_HEIGHT_PX}px`,
        }}
        className="relative z-20 w-full mx-auto px-5 sm:px-8 py-2.5 flex items-center justify-between shrink-0"
      >
        
        {/* Brand Insignia & Digital Barcode Ticker */}
        <div className="flex items-center gap-3">
          
          {/* Logo Insignia: Color Theory Accent with High-Contrast On-Accent */}
          <div 
            className="h-7 w-7 flex items-center justify-center font-black [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)] transition-all duration-200"
            style={{ 
              backgroundColor: activeModeConfig.accent,
              color: activeModeConfig.onAccent,
              boxShadow: `0 0 16px ${activeModeConfig.glow}`
            }}
          >
            <span className="font-mono text-sm leading-none font-black">✛</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black tracking-tight text-white font-sans uppercase">
              InkVault
            </span>

            {/* Barcode / Binary Ticker */}
            <div className="hidden sm:flex items-center gap-1 opacity-90 pl-1">
              <span className="w-2.5 h-1.5 bg-white" />
              <span className="w-1 h-1.5 bg-white" />
              <span className="w-1 h-1.5 bg-white" />
              <span className="w-3.5 h-1.5 bg-white" />
              <span className="w-1.5 h-1.5 bg-white" />
              <span className="w-2.5 h-1.5 bg-white" />
              <span className="w-1 h-1.5 bg-white" />
              <span className="w-4 h-1.5 bg-white" />
            </div>

            <span 
              className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 bg-white/5 border-l-2 tracking-wider uppercase hidden md:inline-block transition-colors duration-200"
              style={{ 
                borderLeftColor: activeModeConfig.accent,
                color: activeModeConfig.accent 
              }}
            >
              AIR-GAPPED DESKTOP
            </span>
          </div>
        </div>

        {/* Right Keyboard Quick Hints & Mecha Action Button */}
        <div className="flex items-center gap-2.5 font-mono text-[9.5px]">
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-[#14181a] border border-white/10 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)] text-zinc-400">
            <span>MODES</span>
            <span className="font-bold text-white">[1] [2] [3]</span>
          </div>
          
          <button
            type="button"
            onClick={() => onEnterWorkspace(activeMode)}
            className="group flex items-center gap-1.5 px-4 py-1.5 font-mono font-black [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,10px_100%,0_calc(100%-10px))] cursor-pointer active:translate-y-0.5 transition-all duration-200"
            style={{
              backgroundColor: activeModeConfig.accent,
              color: activeModeConfig.onAccent,
              boxShadow: `0 0 16px ${activeModeConfig.glow}`,
            }}
          >
            <span>LAUNCH</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* 3. Main Mecha Interface Bay — Aligned strictly via FIRST_PAGE_CONSTRAINTS */}
      <main 
        style={{ 
          maxWidth: `${FIRST_PAGE_CONSTRAINTS.MAX_CONTAINER_WIDTH_PX}px`,
          gap: `${FIRST_PAGE_CONSTRAINTS.GAP_RESPONSIVE_PX}px`,
        }}
        className="relative z-10 w-full mx-auto px-5 sm:px-8 py-3 sm:py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 items-stretch overflow-hidden min-h-0"
      >
        
        {/* =========================================================================
            LEFT COLUMN (7 COLS): Headline, Color Theory Mode Cards & Action Bay
            ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3 min-h-0">
          
          {/* Bold Confident Headline with Mode Color Accent */}
          <div className="space-y-2 shrink-0 pt-1">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black tracking-tight text-white leading-[1.03] uppercase font-sans">
              Precision.<br />
              Air-Gapped.<br />
              <span 
                className="transition-colors duration-200"
                style={{ color: activeModeConfig.accent }}
              >
                Local-First.
              </span>
            </h1>

            <p 
              className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed font-sans border-l-2 pl-3 py-0.5 transition-colors duration-200"
              style={{ borderLeftColor: `${activeModeConfig.accent}80` }}
            >
              Engineered for confidential legal contracts, academic coursework, and personal reading.
              All document parsing, cryptographic operations, and annotations execute 100% locally on your hardware.
            </p>
          </div>

          {/* Mode Selector Placards (Each card respects MODE_CARD_MIN_HEIGHT_PX) */}
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="font-black transition-colors duration-200" style={{ color: activeModeConfig.accent }}>▶</span>
                SELECT WORKSPACE DOMAIN
              </span>
              <span className="text-zinc-500 text-[8.5px]">
                PRESS [1] [2] [3]
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {WORKFLOW_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = activeMode === mode.id;

                return (
                  <div
                    key={mode.id}
                    onClick={() => {
                      if (activeMode === mode.id) {
                        onEnterWorkspace(mode.id);
                      } else {
                        handleSelectMode(mode.id);
                      }
                    }}
                    onDoubleClick={() => onEnterWorkspace(mode.id)}
                    className="mecha-stepped-card transition-all duration-150 cursor-pointer active:translate-y-0.5"
                    style={{
                      padding: isSelected ? '1.5px' : '1px',
                      backgroundColor: isSelected ? mode.accent : 'rgba(255, 255, 255, 0.1)',
                      boxShadow: isSelected ? `0 0 24px ${mode.glow}` : 'none',
                      minHeight: `${FIRST_PAGE_CONSTRAINTS.MODE_CARD_MIN_HEIGHT_PX}px`,
                    }}
                  >
                    <div 
                      className="w-full h-full mecha-stepped-card p-3 flex flex-col justify-between transition-colors duration-150"
                      style={{
                        backgroundColor: isSelected ? mode.accent : '#121619',
                        color: isSelected ? mode.onAccent : '#e0e3e4',
                        minHeight: `${FIRST_PAGE_CONSTRAINTS.MODE_CARD_MIN_HEIGHT_PX}px`,
                      }}
                    >
                      
                      {/* Top Row: Chamfered Icon & Sharp Serial Badge with Inset Spacing */}
                      <div className="flex items-center justify-between w-full mb-2">
                        <div 
                          className="h-6 w-6 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)] flex items-center justify-center font-bold text-xs"
                          style={{
                            backgroundColor: isSelected 
                              ? (mode.id === 'editor' ? '#00363d' : mode.id === 'study' ? '#072a18' : '#291402')
                              : 'rgba(255, 255, 255, 0.06)',
                            color: isSelected ? mode.accent : mode.accent,
                          }}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                        
                        {/* Serial Badge with Inset */}
                        <div 
                          className="p-[1px] [clip-path:polygon(0_0,calc(100%-5px)_0,100%_5px,100%_100%,0_100%)] mr-1"
                          style={{ backgroundColor: isSelected ? `${mode.onAccent}40` : 'rgba(255, 255, 255, 0.15)' }}
                        >
                          <span 
                            className="px-1.5 py-0.5 font-mono text-[8.5px] font-black [clip-path:polygon(0_0,calc(100%-5px)_0,100%_5px,100%_100%,0_100%)] block"
                            style={{
                              backgroundColor: isSelected 
                                ? (mode.id === 'editor' ? '#00363d' : mode.id === 'study' ? '#072a18' : '#291402')
                                : '#0f1316',
                              color: isSelected ? mode.accent : '#bec8ca',
                            }}
                          >
                            {mode.code}
                          </span>
                        </div>
                      </div>

                      {/* Mode Title & Tag */}
                      <div className="space-y-0.5">
                        <span className="text-sm font-black font-sans block leading-tight uppercase tracking-tight">
                          {mode.title}
                        </span>
                        <span 
                          className="text-[8.5px] font-mono block tracking-wider uppercase font-bold"
                          style={{
                            color: isSelected ? `${mode.onAccent}cc` : mode.accent,
                          }}
                        >
                          {mode.tag}
                        </span>
                      </div>

                      {/* Diagonal Hazard Stripes & Serial Tag with Inset Spacing */}
                      <div className="pt-2 flex items-center justify-between font-mono text-[8px] opacity-80 px-0.5">
                        <span className="tracking-tighter font-black">///////</span>
                        <span className="tracking-widest uppercase font-semibold">{mode.serial}</span>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row: Mecha Beveled Launch & Open Plates */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-0.5 shrink-0">
            
            {/* Primary Launch Plate driven by Color Theory Accent */}
            <div 
              className="flex-1 p-[1.5px] [clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)] transition-all duration-200"
              style={{
                backgroundColor: activeModeConfig.accent,
                boxShadow: `0 4px 24px ${activeModeConfig.glow}`,
              }}
            >
              <button
                type="button"
                onClick={() => onEnterWorkspace(activeMode)}
                className="w-full h-full [clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)] px-5 py-3 flex items-center justify-between font-black active:translate-y-0.5 cursor-pointer group transition-all duration-200"
                style={{
                  backgroundColor: activeModeConfig.accent,
                  color: activeModeConfig.onAccent,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  <div className="text-left font-mono">
                    <div 
                      className="text-[8px] uppercase tracking-widest leading-none font-bold"
                      style={{ color: `${activeModeConfig.onAccent}bb` }}
                    >
                      EXECUTE WORKSPACE
                    </div>
                    <div className="text-xs font-black tracking-tight leading-tight mt-0.5 font-sans uppercase">
                      Launch {activeModeConfig.title} ➔
                    </div>
                  </div>
                </div>

                <div 
                  className="p-[1px] [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)]"
                  style={{ backgroundColor: `${activeModeConfig.onAccent}30` }}
                >
                  <span 
                    className="text-[9.5px] font-mono font-black px-2 py-0.5 [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)] block"
                    style={{
                      backgroundColor: `${activeModeConfig.onAccent}25`,
                      color: activeModeConfig.onAccent,
                    }}
                  >
                    ⌘↵
                  </span>
                </div>
              </button>
            </div>

            {/* Secondary Open File Button (Beveled Slate Plate) */}
            <div className="p-[1px] bg-white/10 hover:bg-white/25 [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] transition-colors">
              <button
                type="button"
                onClick={() => onEnterWorkspace(activeMode)}
                className="w-full h-full [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] bg-[#14181a] hover:bg-[#1a1f22] text-zinc-200 hover:text-white px-4 py-3 flex items-center justify-center gap-2 font-mono text-xs font-bold mecha-bevel-dark active:translate-y-0.5 cursor-pointer transition-all"
              >
                <FolderOpen 
                  className="h-3.5 w-3.5 transition-colors duration-200" 
                  style={{ color: activeModeConfig.accent }} 
                />
                <span>OPEN LOCAL PDF</span>
                <span className="text-[8.5px] text-zinc-500 font-mono ml-0.5">[⌘O]</span>
              </button>
            </div>

          </div>

        </div>

        {/* =========================================================================
            RIGHT COLUMN (5 COLS): Specification Placard & Color Theory Detailing
            Constrained by HARDWARE_BAY_MAX_WIDTH_PX to prevent unbounded widening
            ========================================================================= */}
        <div 
          style={{ maxWidth: `${FIRST_PAGE_CONSTRAINTS.HARDWARE_BAY_MAX_WIDTH_PX}px` }}
          className="lg:col-span-5 w-full flex flex-col justify-between gap-3 min-h-0"
        >
          
          {/* TOP PLACARD: Harmonized Dark Specification Enclosure */}
          <div 
            className="flex-1 p-[1.5px] mecha-stepped-panel shadow-2xl flex flex-col min-h-0 transition-all duration-200"
            style={{
              backgroundColor: activeModeConfig.border,
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.7)`,
            }}
          >
            <div 
              className="w-full h-full mecha-stepped-panel bg-[#11151a] text-zinc-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-200"
              style={{
                boxShadow: `inset 1px 1px 0 rgba(255, 255, 255, 0.08), inset -1px -1px 0 rgba(0, 0, 0, 0.7)`,
              }}
            >
              
              {/* Corner Engineering Caliper Marks with Mode Accent */}
              <div 
                className="absolute top-2.5 left-3 font-mono text-[9px] pointer-events-none transition-colors duration-200"
                style={{ color: `${activeModeConfig.accent}80` }}
              >
                ┌
              </div>
              <div 
                className="absolute top-2.5 right-6 font-mono text-[9px] pointer-events-none transition-colors duration-200"
                style={{ color: `${activeModeConfig.accent}80` }}
              >
                ┐
              </div>
              <div 
                className="absolute bottom-3 left-7 font-mono text-[9px] pointer-events-none transition-colors duration-200"
                style={{ color: `${activeModeConfig.accent}80` }}
              >
                └
              </div>
              <div 
                className="absolute bottom-3 right-7 font-mono text-[9px] pointer-events-none transition-colors duration-200"
                style={{ color: `${activeModeConfig.accent}80` }}
              >
                ┘
              </div>

              {/* Placard Header: Inset pr-7 so AIR-GAPPED badge NEVER touches top-right chamfer */}
              <div className="flex items-center justify-between pl-4 pr-7 pt-3 pb-2 border-b border-white/10 font-mono">
                <div className="flex items-center gap-2">
                  <span 
                    className="font-mono text-sm font-black transition-colors duration-200"
                    style={{ color: activeModeConfig.accent }}
                  >
                    ✛
                  </span>
                  <span className="font-black text-[11px] tracking-wider uppercase text-white">
                    SPECIFICATION // ISO 32000-2
                  </span>
                </div>

                {/* AIR-GAPPED Badge: Stylized with Mode Accent */}
                <div 
                  className="px-2 py-0.5 font-mono font-black text-[8px] tracking-wider [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] transition-colors duration-200"
                  style={{
                    backgroundColor: `${activeModeConfig.accent}20`,
                    color: activeModeConfig.accent,
                    border: `1px solid ${activeModeConfig.accent}40`,
                  }}
                >
                  AIR-GAPPED
                </div>
              </div>

              {/* Clean Blueprint Document Graphic: Constraint-aligned SVG drawing box */}
              <div className="my-auto py-2 flex flex-col items-center justify-center">
                <div className="relative w-56 h-36 flex items-center justify-center">
                  <svg className="w-full h-full text-zinc-300" viewBox="0 0 220 130" fill="none">
                    
                    {/* Corner Caliper Brackets */}
                    <path d="M 28 14 L 20 14 L 20 22" stroke={activeModeConfig.accent} strokeOpacity="0.4" strokeWidth="1.5" />
                    <path d="M 192 14 L 200 14 L 200 22" stroke={activeModeConfig.accent} strokeOpacity="0.4" strokeWidth="1.5" />
                    <path d="M 28 116 L 20 116 L 20 108" stroke={activeModeConfig.accent} strokeOpacity="0.4" strokeWidth="1.5" />
                    <path d="M 192 116 L 200 116 L 200 108" stroke={activeModeConfig.accent} strokeOpacity="0.4" strokeWidth="1.5" />

                    {/* Complete Document Outline (Full rectangle - NO slanted cuts on document) */}
                    <rect 
                      x="40" 
                      y="16" 
                      width="140" 
                      height="96" 
                      rx="2" 
                      stroke={activeModeConfig.accent} 
                      strokeWidth="1.5" 
                      strokeOpacity="0.6"
                      fill={activeModeConfig.accent} 
                      fillOpacity="0.04" 
                    />

                    {/* Precision Vector Drafting Lines */}
                    <line x1="58" y1="36" x2="128" y2="36" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
                    <line x1="58" y1="48" x2="162" y2="48" stroke="white" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="58" y1="60" x2="162" y2="60" stroke="white" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="58" y1="72" x2="120" y2="72" stroke="white" strokeWidth="1" strokeOpacity="0.4" />

                    {/* Color Theory Vector Anchor Node (Dynamically reflects active mode) */}
                    <rect 
                      x="55" 
                      y="87" 
                      width="6" 
                      height="6" 
                      fill={activeModeConfig.accent} 
                      transform="rotate(45 58 90)" 
                    />
                    <line 
                      x1="64" 
                      y1="90" 
                      x2="152" 
                      y2="90" 
                      stroke={activeModeConfig.accent} 
                      strokeWidth="1.5" 
                    />

                    {/* Technical Dimensional Coordinate Text */}
                    <text 
                      x="64" 
                      y="101" 
                      fill={activeModeConfig.accent} 
                      fontSize="6.5" 
                      fontFamily="monospace" 
                      fontWeight="bold" 
                      opacity="0.85"
                    >
                      {activeModeConfig.archetype.toUpperCase()} // ISO 32000-2
                    </text>
                  </svg>
                </div>

                <div 
                  className="font-mono text-[9px] text-center font-black tracking-widest uppercase mt-1 transition-colors duration-200"
                  style={{ color: activeModeConfig.accent }}
                >
                  AIR-GAPPED VECTOR BLUEPRINT
                </div>
              </div>

              {/* Bottom Specification Badges */}
              <div className="pt-2.5 pb-2.5 border-t border-white/10 flex items-center justify-between font-mono text-[8px] text-zinc-400 px-8">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <ShieldCheck 
                    className="h-3.5 w-3.5 transition-colors duration-200" 
                    style={{ color: activeModeConfig.accent }} 
                  />
                  LOCAL EXECUTION
                </span>
                <span className="font-semibold text-zinc-500">ZERO EGRESS</span>
                <span 
                  className="font-black transition-colors duration-200"
                  style={{ color: activeModeConfig.accent }}
                >
                  TAURI 2.0 / RUST
                </span>
              </div>

            </div>
          </div>

          {/* BOTTOM PLACARD: Mecha Feature Bay with 3 Exhaust Slots */}
          <div className="p-[1px] bg-white/10 [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)] shadow-xl shrink-0">
            <div className="w-full h-full [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)] bg-[#121518] p-3.5 flex flex-col justify-between gap-2.5 text-zinc-100 mecha-bevel-dark">
              
              {/* Header: Mode Serial & Exhaust Lines */}
              <div className="flex items-center justify-between font-mono text-[9px] pr-5">
                <div className="flex items-center gap-2">
                  <span 
                    className="h-1.5 w-1.5 rotate-45 transition-all duration-200"
                    style={{ 
                      backgroundColor: activeModeConfig.accent,
                      boxShadow: `0 0 8px ${activeModeConfig.glow}` 
                    }} 
                  />
                  <span className="text-white font-black tracking-wider uppercase">
                    {activeModeConfig.serial} // {activeModeConfig.title}
                  </span>
                </div>

                {/* Reference Image 3 Exhaust Lines */}
                <div className="flex flex-col gap-0.5 items-end">
                  <div className="flex items-center">
                    <span className="w-8 h-[1.5px] bg-white/80" />
                    <span className="w-2 h-1.5 bg-white/80 [clip-path:polygon(0_0,100%_0,100%_100%,45%_100%)] ml-0.5" />
                  </div>
                  <div className="flex items-center">
                    <span className="w-5 h-[1.5px] bg-white/80" />
                    <span className="w-2 h-1.5 bg-white/80 [clip-path:polygon(0_0,100%_0,100%_100%,45%_100%)] ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Feature Chips with Chamfered Corners and Mode Accent */}
              <div className="flex flex-wrap gap-1.5">
                {activeModeConfig.features.map((feature, idx) => (
                  <div key={idx} className="p-[1px] bg-white/10 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)]">
                    <span className="px-2 py-0.5 bg-[#181d22] font-mono text-[8.5px] text-zinc-300 flex items-center gap-1 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)]">
                      <CornerDownRight 
                        className="h-2.5 w-2.5 transition-colors duration-200" 
                        style={{ color: activeModeConfig.accent }} 
                      />
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom Guidance Prompt */}
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between font-mono text-[8.5px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <FileText 
                    className="h-3 w-3 transition-colors duration-200" 
                    style={{ color: activeModeConfig.accent }} 
                  />
                  <span>Double-click or press ⌘↵ to enter workspace</span>
                </span>
                
                <span 
                  className="px-2 py-0.5 font-mono font-black text-[7.5px] tracking-wider [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] transition-colors duration-200"
                  style={{
                    backgroundColor: activeModeConfig.accent,
                    color: activeModeConfig.onAccent,
                  }}
                >
                  READY
                </span>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* 4. Bottom Chassis Base: Technical Metadata Ribbon Constrained by FIRST_PAGE_CONSTRAINTS */}
      <footer 
        style={{ 
          maxWidth: `${FIRST_PAGE_CONSTRAINTS.MAX_CONTAINER_WIDTH_PX}px`,
        }}
        className="relative z-20 w-full mx-auto px-5 sm:px-8 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between text-[8.5px] font-mono text-zinc-500 gap-2 shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 font-bold">
            LOCAL ENGINE // TAURI 2.0 / RUST 1.84
          </span>
          <span className="text-zinc-700">/</span>
          <span>ISO 32000-2 CONFORMANCE</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-zinc-500 hidden md:inline">NO TELEMETRY • NO CLOUD EGRESS</span>
          <span className="text-zinc-700 hidden sm:inline">/</span>
          <div 
            className="px-2 py-0.5 font-mono font-black text-[8px] [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)] transition-colors duration-200"
            style={{
              backgroundColor: activeModeConfig.accent,
              color: activeModeConfig.onAccent,
            }}
          >
            /////// {activeModeConfig.archetype.toUpperCase()}
          </div>
        </div>
      </footer>

    </div>
  );
}
