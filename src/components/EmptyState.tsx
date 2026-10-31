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
    <div className="flex-1 w-full h-full flex items-center justify-center p-6 sm:p-8 relative select-none">
      {/* Subtle corner reticles in canvas */}
      <div className="absolute top-6 left-8 font-mono text-[9px] text-accent/30 pointer-events-none hidden md:block select-none">+</div>
      <div className="absolute top-6 right-8 font-mono text-[9px] text-accent/30 pointer-events-none hidden md:block select-none">+</div>
      <div className="absolute bottom-6 left-8 font-mono text-[9px] text-accent/30 pointer-events-none hidden md:block select-none">+</div>
      <div className="absolute bottom-6 right-8 font-mono text-[9px] text-accent/30 pointer-events-none hidden md:block select-none">+</div>

      <div className="max-w-md w-full p-7 sm:p-8 rounded-xl border border-border/80 bg-card/90 backdrop-blur-sm shadow-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Micro Tech Header matching FirstPage */}
        <div className="w-full flex items-center justify-between pb-3.5 mb-4 border-b border-border/60 font-mono text-[9px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="uppercase tracking-widest text-zinc-600 dark:text-zinc-400 font-bold">AIR-GAPPED BUFFER</span>
          </div>
          <span className="tracking-widest uppercase opacity-60">// ISO 32000-2</span>
        </div>

        {/* Icon Box */}
        <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/25 text-accent flex items-center justify-center mb-3.5 shadow-2xs">
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight font-sans">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed font-mono">
          {description}
        </p>

        {/* Action Button */}
        {actionLabel && onAction && (
          <div className="mt-5 w-full flex justify-center">
            <button
              type="button"
              onClick={onAction}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent hover:opacity-90 active:translate-y-0.5 text-accent-on font-mono font-bold text-xs shadow-sm transition-all group cursor-pointer"
            >
              <ActionIcon className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span>{actionLabel}</span>
              {(shortcut || '⌘O') && (
                <span className="text-[9px] font-mono opacity-80 border px-1.5 py-0.5 ml-1 rounded" style={{ borderColor: 'currentColor' }}>
                  {shortcut || '⌘O'}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Divider & Drag and Drop Hint */}
        {hint && (
          <div className="mt-5 pt-3.5 border-t border-border/60 w-full flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-mono">
            <HintIcon className="h-3 w-3 text-accent" />
            <span>{hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
