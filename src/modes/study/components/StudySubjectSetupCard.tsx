import { FolderUp, GraduationCap, Folder } from 'lucide-react';

interface StudySubjectSetupCardProps {
  onTriggerImportFolder: () => void;
}

export default function StudySubjectSetupCard({
  onTriggerImportFolder,
}: StudySubjectSetupCardProps) {
  return (
    <div className="flex-1 w-full h-full flex items-center justify-center p-6 sm:p-8">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-2xl border border-border bg-card shadow-sm flex flex-col items-center text-center select-none animate-in fade-in zoom-in-95 duration-200">
        
        {/* Badge Icon */}
        <div className="h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4 shadow-2xs">
          <GraduationCap className="h-8 w-8" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Import Subject Folder
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
          Select any folder from your computer (e.g. <span className="font-semibold text-zinc-700 dark:text-zinc-300">Physics</span>, <span className="font-semibold text-zinc-700 dark:text-zinc-300">Math</span>, <span className="font-semibold text-zinc-700 dark:text-zinc-300">Biology</span>). Ink Vault automatically preserves your folder name and organizes all study documents inside it.
        </p>

        {/* Primary Action Button */}
        <div className="mt-6 w-full flex justify-center">
          <button
            type="button"
            onClick={onTriggerImportFolder}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md active:scale-95 transition-all group"
          >
            <FolderUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Select Folder from Computer</span>
          </button>
        </div>

        {/* Drag & Drop Hint */}
        <div className="mt-6 pt-4 border-t border-border w-full flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-mono">
          <Folder className="h-3.5 w-3.5 text-accent" />
          <span>Or drag & drop any folder anywhere into the window</span>
        </div>
      </div>
    </div>
  );
}
