import React from 'react';
import { 
  Plus, 
  Layers, 
  LayoutGrid,
  Combine, 
  Scissors, 
  Minimize2, 
  Stamp, 
  Lock,
  Award,
  FormInput,
  Hash,
  FileCheck2
} from 'lucide-react';
import { StudioToolItem } from '../types';

export const STUDIO_TOOL_ITEMS: StudioToolItem[] = [
  { id: 'organize', label: 'Organize Pages', icon: LayoutGrid, description: 'Reorder, rotate & delete' },
  { id: 'merge', label: 'Merge PDF', icon: Combine, description: 'Combine documents in order' },
  { id: 'split', label: 'Split PDF', icon: Scissors, description: 'Extract or burst pages' },
  { id: 'compress', label: 'Compress PDF', icon: Minimize2, description: 'Reduce file footprint' },
  { id: 'bates', label: 'Bates & Header', icon: Hash, description: 'Page numbers, dates & Bates' },
  { id: 'watermark', label: 'Watermark', icon: Stamp, description: 'Apply text or stamp mark' },
  { id: 'flatten', label: 'Flatten PDF', icon: FileCheck2, description: 'Bake forms & annotations' },
  { id: 'protect', label: 'Protect / Lock', icon: Lock, description: 'Encrypt or set passwords' },
  { id: 'sign', label: 'Digital Sign', icon: Award, description: 'PAdES certificate signing' },
  { id: 'forms', label: 'Prepare Form', icon: FormInput, description: 'AcroForm field authoring' },
];

export interface StudioSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenDocument: () => void;
  openDocsCount: number;
  recentDocsCount: number;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenDocument,
  openDocsCount,
  recentDocsCount,
}) => {
  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onOpenDocument}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-md bg-accent hover:opacity-95 text-accent-on font-mono font-bold text-xs uppercase tracking-wider shadow-xs active:translate-y-0.5 transition-all cursor-pointer group"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Open Document</span>
        </span>
        <span className="text-[9px] font-mono opacity-80 border px-1.5 py-0.5 rounded" style={{ borderColor: 'currentColor' }}>
          ⌘O
        </span>
      </button>

      {/* Main Workspace Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1">
          Workspace
        </span>

        {/* Studio Viewer */}
        <button
          type="button"
          onClick={() => onSelectTab('viewer')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold outline-none focus:outline-none select-none transition-all duration-100 rounded-md ${
            activeTab === 'viewer'
              ? 'bg-accent/15 text-accent border-l-2 border-accent shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-zinc-100 border-l-2 border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="h-4 w-4" />
            <span>Studio Viewer</span>
          </span>
          {openDocsCount > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'viewer' ? 'bg-accent/20 text-accent font-bold' : 'bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
            }`}>
              {openDocsCount}
            </span>
          )}
        </button>

        {/* Recent Documents */}
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold outline-none focus:outline-none select-none transition-all duration-100 rounded-md ${
            activeTab === 'recent'
              ? 'bg-accent/15 text-accent border-l-2 border-accent shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-zinc-100 border-l-2 border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="h-4 w-4" />
            <span>Recent Documents</span>
          </span>
          {recentDocsCount > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'recent' ? 'bg-accent/20 text-accent font-bold' : 'bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
            }`}>
              {recentDocsCount}
            </span>
          )}
        </button>
      </div>

      {/* Offline Tools Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1">
          Offline PDF Tools
        </span>
        {STUDIO_TOOL_ITEMS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTab === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTab(tool.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-medium outline-none focus:outline-none select-none transition-all duration-100 rounded-md ${
                isActive
                  ? 'bg-accent/15 text-accent font-bold border-l-2 border-accent shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-zinc-100 border-l-2 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-zinc-500'}`} />
                <span>{tool.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StudioSidebar;
