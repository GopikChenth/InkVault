import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ToolHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  icon: Icon,
  title,
  description: _description,
  badge = 'ISO 32000-2',
  actions,
}) => {
  return (
    <div className="h-10 border-b border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 flex-shrink-0 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate font-sans">
            {title}
          </h2>
          {badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-surface border border-border text-zinc-500 rounded hidden md:inline">
              {badge}
            </span>
          )}
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
