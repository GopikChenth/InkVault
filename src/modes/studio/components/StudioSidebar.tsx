import React from 'react';
import { 
  Plus, 
  Layers, 
  Combine, 
  Scissors, 
  Minimize2, 
  Stamp, 
  Lock 
} from 'lucide-react';
import { StudioToolItem } from '../types';

export const STUDIO_TOOL_ITEMS: StudioToolItem[] = [
  { id: 'merge', label: 'Merge PDF', icon: Combine, description: 'Combine documents in order' },
  { id: 'split', label: 'Split PDF', icon: Scissors, description: 'Extract or burst pages' },
  { id: 'compress', label: 'Compress PDF', icon: Minimize2, description: 'Reduce file footprint' },
  { id: 'watermark', label: 'Watermark', icon: Stamp, description: 'Apply text or stamp mark' },
  { id: 'protect', label: 'Protect / Lock', icon: Lock, description: 'Encrypt or set passwords' },
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
    <div className="flex flex-col gap-6">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onOpenDocument}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm group active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Open Document</span>
        </span>
        <span className="text-[10px] font-mono opacity-60 bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded">
          ⌘O
        </span>
      </button>

      {/* Main Workspace Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
          Workspace
        </span>

        {/* Studio Viewer */}
        <button
          type="button"
          onClick={() => onSelectTab('viewer')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'viewer'
              ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="h-4 w-4" />
            <span>Studio Viewer</span>
          </span>
          {openDocsCount > 0 && (
            <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
              {openDocsCount}
            </span>
          )}
        </button>

        {/* Recent Documents */}
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'recent'
              ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="h-4 w-4" />
            <span>Recent Documents</span>
          </span>
          {recentDocsCount > 0 && (
            <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
              {recentDocsCount}
            </span>
          )}
        </button>
      </div>

      {/* Offline Tools Navigation */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
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
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-zinc-500 group-hover:text-accent" />
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
