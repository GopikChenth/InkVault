import React from 'react';
import { 
  Plus, 
  BookMarked 
} from 'lucide-react';

export interface ReaderSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onTriggerOpenFile: () => void;
  openDocsCount: number;
  recentDocsCount: number;
}

export const ReaderSidebar: React.FC<ReaderSidebarProps> = ({
  activeTab,
  onSelectTab,
  onTriggerOpenFile,
  openDocsCount,
  recentDocsCount,
}) => {
  const totalCount = recentDocsCount > 0 ? recentDocsCount : openDocsCount;

  return (
    <div className="flex flex-col gap-6">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onTriggerOpenFile}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-white text-xs font-semibold bg-rose-600 hover:bg-rose-500 shadow-sm group"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Book / Comic</span>
        </span>
        <span className="text-[10px] font-mono opacity-60 bg-black/20 px-1.5 py-0.5 rounded">
          ⌘O
        </span>
      </button>

      {/* Bookshelf Navigation - Single item */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
          Bookshelf
        </span>

        {/* Single item: Books & Comics */}
        <button
          type="button"
          onClick={() => onSelectTab('recent')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
            activeTab === 'recent' || activeTab === 'viewer'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-card hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <BookMarked className="h-4 w-4" />
            <span>Books & Comics</span>
          </span>
          {totalCount > 0 && (
            <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
              {totalCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReaderSidebar;
