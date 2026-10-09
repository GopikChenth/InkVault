import { useState } from 'react';
import { 
  ArrowRight, 
  FolderOpen,
  Layers,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import PaperStack from '../components/PaperStack';
import { AppMode } from '../types';

interface FirstPageProps {
  onEnterWorkspace: (mode?: AppMode) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  currentMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
}

interface ModeConfig {
  id: AppMode;
  title: string;
  tag: string;
  icon: typeof Layers;
  headerLabel: string;
  actionLabel: string;
}

const WORKFLOW_MODES: ModeConfig[] = [
  {
    id: 'editor',
    title: 'Studio Editor',
    tag: 'Suite',
    icon: Layers,
    headerLabel: 'Open Studio',
    actionLabel: 'Launch Studio Editor',
  },
  {
    id: 'study',
    title: 'Study Mode',
    tag: 'Deep Focus',
    icon: GraduationCap,
    headerLabel: 'Open Study Mode',
    actionLabel: 'Launch Study Mode',
  },
  {
    id: 'reader',
    title: 'Books & Comics',
    tag: 'Zen Reader',
    icon: BookOpen,
    headerLabel: 'Open Books & Comics',
    actionLabel: 'Launch Books & Comics',
  },
];

export default function FirstPage({ 
  onEnterWorkspace, 
  currentMode = 'editor',
  onSelectMode,
}: FirstPageProps) {
  const [internalMode, setInternalMode] = useState<AppMode>('editor');
  const activeMode = currentMode ?? internalMode;

  const handleSelectMode = (mode: AppMode) => {
    setInternalMode(mode);
    if (onSelectMode) onSelectMode(mode);
  };

  const activeModeConfig = WORKFLOW_MODES.find(m => m.id === activeMode) || WORKFLOW_MODES[0];

  return (
    <div className="relative w-full h-full min-h-full overflow-y-auto bg-background text-zinc-800 dark:text-zinc-200 flex flex-col justify-between overflow-x-hidden selection:bg-accent selection:text-white transition-colors duration-300">
      
      {/* Background Dot & Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,40rem)] h-[min(90vw,40rem)] bg-accent/10 dark:bg-accent/15 rounded-full blur-[160px] pointer-events-none" />

      {/* 1. Header Navigation */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between overflow-hidden">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-accent text-[#00363d] flex items-center justify-center font-extrabold text-sm tracking-tight shadow-md">
            IV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Ink Vault</span>
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-container border border-border text-on-surface-variant">
                v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Utilities */}
        <div className="flex items-center gap-3">
          {/* Direct CTA */}
          <button
            type="button"
            onClick={() => onEnterWorkspace(activeMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent hover:bg-accent-hover text-[#00363d] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer group flex-shrink-0"
          >
            <span>{activeModeConfig.headerLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* 2. Hero Body Section with Anime.js Paper Stack */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center overflow-hidden">
        
        {/* Left Column: Hero Content */}
        <div className="lg:col-span-7 xl:col-span-6 flex flex-col gap-6 text-left min-w-0">
          
          {/* Main Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.08]">
              Pure precision for <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-accent to-secondary dark:from-zinc-100 dark:via-accent dark:to-secondary">
                every document.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed pt-2 transition-all duration-200 min-h-[48px]">
              {activeMode === 'editor' && 'Next-generation offline document suite. Merge, split, compress, and protect complex multi-page PDF stacks with native vector rendering and zero cloud telemetry.'}
              {activeMode === 'study' && 'Distraction-free academic and research reader with integrated Pomodoro timer, contextual search lookup, smart highlighter, and focused comprehension.'}
              {activeMode === 'reader' && 'Immersive reader tailored for EPUB books, CBZ and CBR comics, and graphic novels with dual-page spreads, soft eye-care paper tints, and distraction-free page turns.'}
            </p>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Select Workflow Mode
              </span>
              <span className="text-[11px] font-mono font-semibold text-accent flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {activeModeConfig.tag} Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {WORKFLOW_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = activeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      if (activeMode === mode.id) {
                        onEnterWorkspace(mode.id);
                      } else {
                        handleSelectMode(mode.id);
                      }
                    }}
                    onDoubleClick={() => onEnterWorkspace(mode.id)}
                    className={`group relative flex flex-col p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'border-accent/60 bg-accent/[0.08] dark:bg-accent/[0.14] shadow-sm ring-1 ring-accent/40'
                        : 'border-border bg-card/60 hover:bg-card hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-accent text-[#00363d] shadow-sm font-bold' 
                          : 'bg-surface text-zinc-600 dark:text-zinc-400 group-hover:text-accent'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-accent/15 border-accent/30 text-accent'
                          : 'bg-surface border-border text-zinc-500'
                      }`}>
                        {mode.tag}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      {mode.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action Group */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onEnterWorkspace(activeMode)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-accent hover:bg-accent-hover text-[#00363d] text-sm font-bold transition-all shadow-lg hover:shadow-accent/25 active:scale-[0.98] cursor-pointer group"
            >
              <FolderOpen className="h-4 w-4" />
              <span>{activeModeConfig.actionLabel}</span>
              <span className="text-[11px] font-mono opacity-85 bg-black/10 dark:bg-black/20 px-2 py-0.5 rounded-full">
                ⌘↵
              </span>
            </button>
          </div>

        </div>

        {/* Right Column: 3D Paper Stack Showcase */}
        <div className="lg:col-span-5 xl:col-span-6 flex items-center justify-center relative py-4 lg:py-6 overflow-hidden w-full">
          <PaperStack />
        </div>

      </main>

    </div>
  );
}
