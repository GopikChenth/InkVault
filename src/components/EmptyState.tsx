import { LucideIcon, Plus, UploadCloud } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
  hintIcon?: LucideIcon;
  actionIcon?: LucideIcon;
  shortcut?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel = 'Browse Local Files',
  onAction,
  hint = 'Or drag & drop files here',
  hintIcon: HintIcon = UploadCloud,
  actionIcon: ActionIcon = Plus,
  shortcut,
}: EmptyStateProps) {
  return (
    <div className="flex-1 w-full h-full flex items-center justify-center p-6 sm:p-8">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-2xl border border-border bg-card shadow-sm flex flex-col items-center text-center select-none animate-in fade-in zoom-in-95 duration-200">
        {/* Uniform Icon Box */}
        <div className="h-16 w-16 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4 shadow-2xs">
          <Icon className="h-8 w-8" />
        </div>

        {/* Uniform Title */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h3>

        {/* Uniform Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed">
          {description}
        </p>

        {/* Uniform Action Button */}
        {actionLabel && onAction && (
          <div className="mt-6 w-full flex justify-center">
            <button
              type="button"
              onClick={onAction}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white dark:text-zinc-900 text-xs font-semibold shadow-md active:scale-95 transition-all group"
            >
              <ActionIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span>{actionLabel}</span>
              {shortcut && (
                <span className="text-[10px] font-mono opacity-70 bg-black/20 dark:bg-black/10 px-1.5 py-0.5 rounded ml-0.5">
                  {shortcut}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Divider & Drag and Drop Hint */}
        {hint && (
          <div className="mt-6 pt-4 border-t border-border w-full flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-mono">
            <HintIcon className="h-3.5 w-3.5 text-accent" />
            <span>{hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
