import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ToolHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge = 'ISO 32000-2',
  actions,
}) => {
  return (
    <div className="h-11 border-b border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-2xs flex-shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 truncate flex items-center gap-1.5 font-sans">
              <span className="text-accent font-black text-[9px]">▶</span>
              <span>{title}</span>
            </h2>
            {badge && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-black/[0.04] dark:bg-white/[0.06] border border-border text-zinc-500 rounded hidden md:inline">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:block truncate">
            // {description}
          </p>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 font-mono">
          {actions}
        </div>
      )}
    </div>
  );
};

export default ToolHeader;
