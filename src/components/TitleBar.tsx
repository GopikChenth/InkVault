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
  FileCheck2
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
      className="h-8 w-full bg-surface/85 dark:bg-[#101415]/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-2 select-none z-50 text-xs text-zinc-700 dark:text-zinc-300 flex-shrink-0"
    >
      {/* 1. Left: Brand & Menu Items */}
      <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
        
        {/* App Icon */}
        <div 
          onClick={onReturnToCover}
          className="h-5 w-5 rounded-md bg-accent text-accent-on flex items-center justify-center font-black text-[9px] shadow-xs cursor-pointer hover:bg-accent-hover transition-colors mr-1"
          title="Ink Vault Home"
        >
          IV
        </div>

        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] mr-1 hidden sm:inline">
          {title}
        </span>

        {/* Menu 1: File */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'file' 
                ? 'bg-surface-container text-on-surface font-semibold' 
                : 'hover:bg-surface-container/60 text-on-surface-variant'
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
            className={`px-2 py-0.5 rounded text-[11px] font-medium outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'edit' 
                ? 'bg-surface-container text-on-surface font-semibold' 
                : 'hover:bg-surface-container/60 text-on-surface-variant'
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
            className={`px-2 py-0.5 rounded text-[11px] font-medium outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'view' 
                ? 'bg-surface-container text-on-surface font-semibold' 
                : 'hover:bg-surface-container/60 text-on-surface-variant'
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
            className={`px-2 py-0.5 rounded text-[11px] font-medium outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'window' 
                ? 'bg-surface-container text-on-surface font-semibold' 
                : 'hover:bg-surface-container/60 text-on-surface-variant'
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
            className={`px-2 py-0.5 rounded text-[11px] font-medium outline-none focus:outline-none select-none transition-colors ${
              activeMenu === 'help' 
                ? 'bg-surface-container text-on-surface font-semibold' 
                : 'hover:bg-surface-container/60 text-on-surface-variant'
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

      {/* 2. Center: Active Document Title */}
      <div 
        className="hidden md:flex flex-1 items-center justify-center min-w-0 px-4 h-full cursor-default pointer-events-none select-none"
      >
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-sm lg:max-w-md font-medium">
          {activeDocName ? (
            <>
              {activeDocName.includes('/') ? (
                <span className="text-zinc-400 dark:text-zinc-500 truncate">
                  {activeDocName.substring(0, activeDocName.lastIndexOf('/'))} /
                </span>
              ) : null}
              <span className="text-zinc-800 dark:text-zinc-200 truncate font-semibold">
                {activeDocName.split('/').pop() || activeDocName}
              </span>
            </>
          ) : (
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{title}</span>
          )}
        </div>
      </div>

      {/* 3. Right: Quick Mode Switcher, Theme & Fullscreen */}
      <div className="flex items-center gap-1.5 h-full flex-shrink-0">

        {/* 3-Mode Segmented Control */}
        {onSelectMode && (
          <div className="flex items-center gap-0.5 bg-surface-container dark:bg-[#181c1d] border border-border p-0.5 rounded-full text-[10px] font-medium mr-1.5 shadow-2xs">
            <button
              onClick={() => onSelectMode('editor')}
              title="Studio Editor (⌘1)"
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full transition-all ${
                currentMode === 'editor'
                  ? 'bg-accent text-accent-on font-bold shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span className="hidden sm:inline">Studio</span>
            </button>
            <button
              onClick={() => onSelectMode('study')}
              title="Study Mode (⌘2)"
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full transition-all ${
                currentMode === 'study'
                  ? 'bg-accent text-accent-on font-bold shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              <span className="hidden sm:inline">Study</span>
            </button>
            <button
              onClick={() => onSelectMode('reader')}
              title="Books & Comics (⌘3)"
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full transition-all ${
                currentMode === 'reader'
                  ? 'bg-accent text-accent-on font-bold shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <BookOpen className="h-3 w-3" />
              <span className="hidden sm:inline">Reader</span>
            </button>
          </div>
        )}
        
        {/* Quick Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to Light Mode (⌘T)' : 'Switch to Dark Mode (⌘T)'}
          className="h-6 w-6 rounded hover:bg-surface dark:hover:bg-surface flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-600" />}
        </button>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen (F11)"
            className="h-6 w-6 rounded hover:bg-surface dark:hover:bg-surface flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors hidden sm:flex"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        )}

      </div>

    </div>
  );
}
