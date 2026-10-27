import { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  FileText,
  FolderOpen, 
  Layers, 
  Combine, 
  Scissors, 
  Minimize2, 
  Stamp, 
  Lock, 
  Maximize2,
  Plus,
  GraduationCap,
  BookOpen,
  LayoutGrid,
  Award,
  FormInput,
  Hash,
  FileCheck2,
  ArrowRight
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppMode } from '../types';

interface TitleBarProps {
  title?: string;
  activeDocName?: string | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDocument?: () => void;
  onSelectTab?: (tab: string) => void;
  onReturnToCover?: () => void;
  onToggleFullscreen?: () => void;
  currentMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
  isCoverView?: boolean;
  onLaunchWorkspace?: () => void;
}

export default function TitleBar({
  title = 'Ink Vault',
  activeDocName,
  darkMode,
  onToggleDarkMode,
  onOpenDocument,
  onSelectTab,
  onReturnToCover,
  onToggleFullscreen,
  currentMode = 'editor',
  onSelectMode,
  isCoverView = false,
  onLaunchWorkspace,
}: TitleBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isTauri, setIsTauri] = useState<boolean>(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Detect Tauri Environment
  useEffect(() => {
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      setIsTauri(true);
      try {
        const appWindow = getCurrentWindow();
        appWindow.isMaximized().then(setIsMaximized).catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Close menus on outside click or Esc (registered only while a menu is open)
  useEffect(() => {
    if (!activeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  // Window Actions
  const handleMinimize = async () => {
    if (isTauri) {
      try {
        await getCurrentWindow().minimize();
      } catch {
        /* ignore */
      }
    }
  };

  const handleMaximize = async () => {
    if (isTauri) {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
        setIsMaximized(await appWindow.isMaximized());
      } catch {
        /* ignore */
      }
    } else if (onToggleFullscreen) {
      onToggleFullscreen();
    }
  };

  const handleClose = async () => {
    if (isTauri) {
      try {
        await getCurrentWindow().close();
      } catch {
        /* ignore */
      }
    } else if (window.confirm('Close Ink Vault application?')) {
      window.close();
    }
  };

  const toggleMenu = (menuName: string) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleMenuHover = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  const handleAction = (action: () => void) => {
    setActiveMenu(null);
    action();
  };

  return (
    <div 
      ref={menuContainerRef}
      className="h-10 w-full bg-surface/95 dark:bg-[#0e1417]/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-3 sm:px-4 select-none z-50 text-xs text-zinc-900 dark:text-zinc-100 flex-shrink-0 transition-colors duration-200"
    >
      {/* 1. Left: Brand & Menu Items */}
      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
        
        {/* Chamfered Insignia matching FirstPage */}
        <div 
          onClick={onReturnToCover}
          className="h-7 w-7 flex items-center justify-center font-black [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)] bg-accent text-accent-on cursor-pointer hover:opacity-90 active:translate-y-0.5 transition-all mr-1 shadow-xs flex-shrink-0"
          title="Ink Vault Cover / Return (⌘↵)"
        >
          <span className="font-mono text-xs leading-none font-black">✛</span>
        </div>

        <div className="flex items-center gap-1.5 mr-2">
          <span className="font-black text-zinc-950 dark:text-zinc-50 text-xs tracking-tight uppercase font-sans hidden sm:inline">
            {title}
          </span>

          {/* Barcode Ticker directly matching FirstPage */}
          <div className="hidden md:flex items-center gap-0.5 opacity-90 pl-0.5">
            <span className="w-2 h-1.5 bg-zinc-900 dark:bg-white" />
            <span className="w-0.5 h-1.5 bg-zinc-900 dark:bg-white" />
            <span className="w-0.5 h-1.5 bg-zinc-900 dark:bg-white" />
            <span className="w-2.5 h-1.5 bg-zinc-900 dark:bg-white" />
            <span className="w-1 h-1.5 bg-zinc-900 dark:bg-white" />
            <span className="w-1.5 h-1.5 bg-zinc-900 dark:bg-white" />
          </div>

          {/* Chamfered Air-Gapped Chip */}
          <span className="text-[8px] font-mono font-black px-1.5 py-0.5 bg-accent/15 border-l-2 border-accent text-accent tracking-wider uppercase hidden lg:inline-block">
            AIR-GAPPED
          </span>
        </div>

        {/* Menu 1: File */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`h-7 px-2.5 flex items-center rounded text-xs font-bold outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'file' 
                ? 'bg-accent/15 text-accent' 
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white'
            }`}
          >
            File
          </button>

          {activeMenu === 'file' && (
            <div
              className="absolute top-full left-0 mt-1 w-56 rounded-2xl caelestia-glass shadow-2xl py-1.5 z-50 text-[11px] flex flex-col ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {onOpenDocument && (
                <>
                  <button
                    onClick={() => handleAction(onOpenDocument)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" /> New Tab...
                    </span>
                    <span className="text-[9px] font-mono opacity-60">⌘T</span>
                  </button>

                  <button
                    onClick={() => handleAction(onOpenDocument)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-3.5 w-3.5" /> Open Document...
                    </span>
                    <span className="text-[9px] font-mono opacity-60">⌘O</span>
                  </button>
                </>
              )}

              {onSelectTab && (
                <button
                  onClick={() => handleAction(() => onSelectTab('recent'))}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" /> Recent Documents
                  </span>
                </button>
              )}

              {currentMode === 'editor' && onSelectTab && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => handleAction(() => onSelectTab('organize'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Organize Pages
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('merge'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Combine className="h-3.5 w-3.5" /> Merge PDF
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('split'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Scissors className="h-3.5 w-3.5" /> Split & Extract
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('compress'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Minimize2 className="h-3.5 w-3.5" /> Compress PDF
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('bates'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Hash className="h-3.5 w-3.5" /> Bates & Header
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('watermark'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Stamp className="h-3.5 w-3.5" /> Watermark
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('flatten'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" /> Flatten PDF
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('protect'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Lock className="h-3.5 w-3.5" /> Protect & Unlock
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('sign'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <Award className="h-3.5 w-3.5" /> Digital Sign
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('forms'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                  >
                    <FormInput className="h-3.5 w-3.5" /> Prepare Form
                  </button>
                </>
              )}

              <div className="my-1 border-t border-border" />

              {onReturnToCover && (
                <button
                  onClick={() => handleAction(onReturnToCover)}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                >
                  <span>Presentation Cover</span>
                  <span className="text-[9px] font-mono opacity-60">⌘Enter</span>
                </button>
              )}

              <button
                onClick={() => handleAction(handleClose)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-500 hover:text-white transition-colors text-left text-rose-500"
              >
                <span>Exit Ink Vault</span>
                <span className="text-[9px] font-mono opacity-60">⌘Q</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 2: Edit */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
            className={`h-7 px-2.5 flex items-center rounded text-xs font-bold outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'edit' 
                ? 'bg-accent/15 text-accent' 
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white'
            }`}
          >
            Edit
          </button>

          {activeMenu === 'edit' && (
            <div
              className="absolute top-full left-0 mt-1 w-52 rounded-2xl caelestia-glass shadow-2xl py-1.5 z-50 text-[11px] flex flex-col ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleAction(() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, metaKey: true }));
                })}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span>Select All Pages</span>
                <span className="text-[9px] font-mono opacity-60">⌘A</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 3: View */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('view')}
            onMouseEnter={() => handleMenuHover('view')}
            className={`h-7 px-2.5 flex items-center rounded text-xs font-bold outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'view' 
                ? 'bg-accent/15 text-accent' 
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white'
            }`}
          >
            View
          </button>

          {activeMenu === 'view' && (
            <div
              className="absolute top-full left-0 mt-1 w-52 rounded-2xl caelestia-glass shadow-2xl py-1.5 z-50 text-[11px] flex flex-col ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleAction(onToggleDarkMode)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘T</span>
              </button>

              {onSelectTab && (
                <button
                  onClick={() => handleAction(() => onSelectTab('viewer'))}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
                >
                  <FileText className="h-3.5 w-3.5" /> PDF Viewer
                </button>
              )}

              <div className="my-1 border-t border-border" />

              <div className="px-3 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Workflow Mode
              </div>
              <button
                onClick={() => handleAction(() => onSelectMode && onSelectMode('editor'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{currentMode === 'editor' ? '✓ Studio Editor' : '  Studio Editor'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘1</span>
              </button>
              <button
                onClick={() => handleAction(() => onSelectMode && onSelectMode('study'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>{currentMode === 'study' ? '✓ Study Mode' : '  Study Mode'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘2</span>
              </button>
              <button
                onClick={() => handleAction(() => onSelectMode && onSelectMode('reader'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{currentMode === 'reader' ? '✓ Books & Comics' : '  Books & Comics'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘3</span>
              </button>

              <div className="my-1 border-t border-border" />

              <button
                onClick={() => handleAction(handleMaximize)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span>Toggle Fullscreen</span>
                <span className="text-[9px] font-mono opacity-60">F11</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 4: Window */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('window')}
            onMouseEnter={() => handleMenuHover('window')}
            className={`h-7 px-2.5 flex items-center rounded text-xs font-bold outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'window' 
                ? 'bg-accent/15 text-accent' 
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white'
            }`}
          >
            Window
          </button>

          {activeMenu === 'window' && (
            <div
              className="absolute top-full left-0 mt-1 w-48 rounded-2xl caelestia-glass shadow-2xl py-1.5 z-50 text-[11px] flex flex-col ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleAction(handleMinimize)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span>Minimize</span>
                <span className="text-[9px] font-mono opacity-60">⌘M</span>
              </button>

              <button
                onClick={() => handleAction(handleMaximize)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-on font-medium transition-colors text-left"
              >
                <span>{isMaximized ? 'Restore' : 'Maximize'}</span>
              </button>

              <div className="my-1 border-t border-border" />

              <button
                onClick={() => handleAction(handleClose)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-red-500 hover:text-white transition-colors text-left text-red-500"
              >
                <span>Close Window</span>
                <span className="text-[9px] font-mono opacity-60">⌘W</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 5: Help */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('help')}
            onMouseEnter={() => handleMenuHover('help')}
            className={`h-7 px-2.5 flex items-center rounded text-xs font-bold outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'help' 
                ? 'bg-accent/15 text-accent' 
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white'
            }`}
          >
            Help
          </button>

          {activeMenu === 'help' && (
            <div
              className="absolute top-full left-0 mt-1 w-64 rounded-2xl caelestia-glass shadow-2xl py-1.5 z-50 text-[11px] flex flex-col ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3.5 py-2 border-b border-border flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-50">Ink Vault</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/25">v2.0 Core</span>
              </div>
              <div className="px-3.5 py-2.5 flex flex-col gap-2 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse" />
                  <span>100% In-Memory Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary flex-shrink-0" />
                  <span>Hardware Vector Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary flex-shrink-0" />
                  <span>Zero Cloud Telemetry</span>
                </div>
              </div>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => handleAction(onReturnToCover || (() => {}))}
                className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-accent hover:text-accent-on font-medium text-zinc-700 dark:text-zinc-300 transition-colors text-left font-sans"
              >
                <span>Documentation & Cover</span>
                <span className="text-[10px] font-mono opacity-60">⌘↵</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 2. Center: Active Document Title or Air-Gapped Status — Single line, unified h-7 size */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-3 h-full cursor-default select-none"
      >
        {activeDocName ? (
          <div className="h-7 flex items-center gap-1.5 px-3 rounded border border-border/80 bg-black/[0.04] dark:bg-white/[0.04] max-w-sm shadow-2xs whitespace-nowrap overflow-hidden">
            <span className="font-mono text-xs font-black text-accent shrink-0">✛</span>
            <span className="text-zinc-950 dark:text-zinc-50 truncate font-bold font-mono text-xs">
              {activeDocName.split('/').pop() || activeDocName}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-semibold shrink-0">
              // ISO 32000-2
            </span>
          </div>
        ) : (
          <div className="h-7 flex items-center gap-1.5 px-2.5 rounded border border-border/60 bg-black/[0.02] dark:bg-white/[0.03] text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest whitespace-nowrap">
            <span className="text-accent">✛</span> AIR-GAPPED // LOCAL WORKSPACE
          </div>
        )}
      </div>

      {/* 3. Right: Quick Mode Switcher, Launch, Theme & Fullscreen — All unified to h-7 size */}
      <div className="flex items-center gap-2 h-full flex-shrink-0">

        {/* FirstPage-style Chamfered Mode Segmented Control */}
        {onSelectMode && (
          <div className="h-7 flex items-center gap-0.5 p-0.5 bg-black/[0.04] dark:bg-white/[0.06] border border-border [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)] text-xs font-mono font-bold shadow-2xs">
            <button
              onClick={() => onSelectMode('editor')}
              title="Studio Editor (⌘1)"
              className={`h-full flex items-center gap-1.5 px-2.5 transition-all [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] ${
                currentMode === 'editor'
                  ? 'bg-accent text-accent-on font-black shadow-xs'
                  : 'text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Studio</span>
              <span className="text-[9px] opacity-75 font-mono ml-0.5 hidden md:inline">01</span>
            </button>
            <button
              onClick={() => onSelectMode('study')}
              title="Study Mode (⌘2)"
              className={`h-full flex items-center gap-1.5 px-2.5 transition-all [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] ${
                currentMode === 'study'
                  ? 'bg-accent text-accent-on font-black shadow-xs'
                  : 'text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Study</span>
              <span className="text-[9px] opacity-75 font-mono ml-0.5 hidden md:inline">02</span>
            </button>
            <button
              onClick={() => onSelectMode('reader')}
              title="Books & Comics (⌘3)"
              className={`h-full flex items-center gap-1.5 px-2.5 transition-all [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] ${
                currentMode === 'reader'
                  ? 'bg-accent text-accent-on font-black shadow-xs'
                  : 'text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reader</span>
              <span className="text-[9px] opacity-75 font-mono ml-0.5 hidden md:inline">03</span>
            </button>
          </div>
        )}

        {/* If on Cover View, integrate the direct LAUNCH action button! */}
        {isCoverView && onLaunchWorkspace && (
          <button
            type="button"
            onClick={onLaunchWorkspace}
            className="h-7 hidden sm:flex items-center gap-1.5 px-3 font-mono font-black text-xs [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))] cursor-pointer active:translate-y-0.5 transition-all duration-200 bg-accent text-accent-on shadow-xs shrink-0"
            title="Launch Workspace (⌘↵)"
          >
            <span>LAUNCH</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Quick Theme Toggle — Chamfered Mecha Button */}
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to Light Mode (⌘T)' : 'Switch to Dark Mode (⌘T)'}
          className="h-7 w-7 [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] bg-black/[0.04] dark:bg-white/[0.06] border border-border hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-zinc-950 dark:text-zinc-50 transition-colors shadow-2xs shrink-0"
        >
          {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-950" />}
        </button>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen (F11)"
            className="h-7 w-7 [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)] bg-black/[0.04] dark:bg-white/[0.06] border border-border hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white transition-colors hidden sm:flex shadow-2xs shrink-0"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}

      </div>
    </div>
  );
}
