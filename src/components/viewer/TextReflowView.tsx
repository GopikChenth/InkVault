import { useState } from 'react';
import { 
  BookOpen, 
  Minus, 
  Plus, 
  X, 
  Copy, 
  Check,
  ArrowRight
} from 'lucide-react';
import { ReflowSettings } from '../../types';

interface PageTextData {
  pageNum: number;
  text: string;
}

interface TextReflowViewProps {
  isOpen: boolean;
  onClose: () => void;
  pagesText: PageTextData[];
  docTitle: string;
  currentPage: number;
  onNavigateToPage: (pageNum: number) => void;
}

export default function TextReflowView({
  isOpen,
  onClose,
  pagesText,
  docTitle,
  currentPage,
  onNavigateToPage,
}: TextReflowViewProps) {
  const [settings, setSettings] = useState<ReflowSettings>({
    fontSize: 16,
    lineHeight: 1.8,
    fontFamily: 'serif',
    maxWidth: 760,
  });

  const [copiedPage, setCopiedPage] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopyText = (text: string, pageNum: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPage(pageNum);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  const getFontFamilyClass = (family: 'sans' | 'serif' | 'mono') => {
    switch (family) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'sans':
      default:
        return 'font-sans';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-200 text-on-surface">
      
      {/* 1. Header with Reader Controls */}
      <header className="h-14 border-b border-outline/20 px-6 flex items-center justify-between gap-4 bg-surface/85 backdrop-blur-xl flex-shrink-0">
        
        {/* Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-xs flex-shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-on-surface truncate">{docTitle}</h3>
            <p className="text-[10px] font-mono text-zinc-400">Text-Reflow Responsive Reader Mode (Page {currentPage})</p>
          </div>
        </div>

        {/* Reader Typography Controls */}
        <div className="flex items-center gap-3">
          
          {/* Font Size */}
          <div className="flex items-center gap-1 bg-surface-container border border-outline/20 rounded-full p-1 text-xs">
            <button
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(12, s.fontSize - 2) }))}
              title="Decrease Font Size"
              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-surface-high transition-colors text-on-surface"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold text-on-surface">{settings.fontSize}px</span>
            <button
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(28, s.fontSize + 2) }))}
              title="Increase Font Size"
              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-surface-high transition-colors text-on-surface"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Font Family Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-surface-container border border-outline/20 rounded-full p-1 text-xs">
            <button
              onClick={() => setSettings((s) => ({ ...s, fontFamily: 'serif' }))}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ease-caelestia-decel ${settings.fontFamily === 'serif' ? 'bg-accent text-[#00363d] font-bold shadow-xs' : 'text-zinc-400 hover:text-on-surface'}`}
            >
              Serif
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, fontFamily: 'sans' }))}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ease-caelestia-decel ${settings.fontFamily === 'sans' ? 'bg-accent text-[#00363d] font-bold shadow-xs' : 'text-zinc-400 hover:text-on-surface'}`}
            >
              Sans
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, fontFamily: 'mono' }))}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ease-caelestia-decel ${settings.fontFamily === 'mono' ? 'bg-accent text-[#00363d] font-bold shadow-xs' : 'text-zinc-400 hover:text-on-surface'}`}
            >
              Mono
            </button>
          </div>

          {/* Column Width */}
          <div className="hidden md:flex items-center gap-1 bg-surface-container border border-outline/20 rounded-full p-1 text-xs">
            <button
              onClick={() => setSettings((s) => ({ ...s, maxWidth: 640 }))}
              title="Narrow Column"
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ease-caelestia-decel ${settings.maxWidth === 640 ? 'bg-accent text-[#00363d] font-bold shadow-xs' : 'text-zinc-400 hover:text-on-surface'}`}
            >
              Narrow
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, maxWidth: 760 }))}
              title="Standard Column"
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ease-caelestia-decel ${settings.maxWidth === 760 ? 'bg-accent text-[#00363d] font-bold shadow-xs' : 'text-zinc-400 hover:text-on-surface'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, maxWidth: 960 }))}
              title="Wide Column"
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ease-caelestia-decel ${settings.maxWidth === 960 ? 'bg-accent text-[#00363d] font-bold shadow-xs' : 'text-zinc-400 hover:text-on-surface'}`}
            >
              Wide
            </button>
          </div>

          {/* Close Reflow Mode */}
          <button
            onClick={onClose}
            title="Exit Reflow Mode (Esc)"
            className="h-8 px-4 rounded-full bg-surface-container hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 text-on-surface border border-outline/20 flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 ease-caelestia-decel shadow-xs"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close Reader</span>
          </button>
        </div>

      </header>

      {/* 2. Reader Body */}
      <div className="flex-1 overflow-y-auto py-12 px-6 flex justify-center bg-background">
        <div 
          style={{ 
            maxWidth: `${settings.maxWidth}px`,
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
          }}
          className={`w-full flex flex-col gap-12 ${getFontFamilyClass(settings.fontFamily)}`}
        >
          {pagesText.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              <p>Extracting text from PDF...</p>
            </div>
          ) : (
            pagesText.map((p) => (
              <article key={p.pageNum} className="flex flex-col gap-4 border-b border-border pb-10">
                {/* Page Breadcrumb Header */}
                <div className="flex items-center justify-between text-xs font-mono opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">PAGE {p.pageNum}</span>
                    <button
                      onClick={() => {
                        onNavigateToPage(p.pageNum);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-[11px] underline hover:opacity-100 transition-opacity"
                    >
                      <span>Jump to Canvas</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(p.text, p.pageNum)}
                      className="flex items-center gap-1 hover:opacity-100 transition-opacity"
                    >
                      {copiedPage === p.pageNum ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPage === p.pageNum ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Reflowed Text Content */}
                <div className="whitespace-pre-wrap leading-relaxed tracking-wide">
                  {p.text ? p.text : <span className="italic opacity-40">[No text found on this page or scanned bitmap image]</span>}
                </div>
              </article>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
