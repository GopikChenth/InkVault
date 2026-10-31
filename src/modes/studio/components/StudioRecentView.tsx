import React from 'react';
import { 
  FileText, 
  Trash2, 
  Clock, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react';
import { LoadedPDF } from '../../../types';
import EmptyState from '../../../components/EmptyState';

export interface StudioRecentViewProps {
  docs: LoadedPDF[];
  activeDocId: string | null;
  onOpenDoc: (doc: LoadedPDF) => void;
  onRemoveDoc: (docId: string, e: React.MouseEvent) => void;
  onTriggerOpenFile: () => void;
}

export const StudioRecentView: React.FC<StudioRecentViewProps> = ({
  docs,
  activeDocId,
  onOpenDoc,
  onRemoveDoc,
  onTriggerOpenFile,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 w-full">
      {docs.length === 0 ? (
        <div className="h-[60vh] flex items-center justify-center">
          <EmptyState
            icon={FileText}
            title="No Recent Documents"
            description="Opened documents will appear here."
            actionLabel="Open a PDF Document"
            onAction={onTriggerOpenFile}
            hint="Or drag & drop files here"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-sans">
              Session Documents
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                {docs.length} {docs.length === 1 ? 'FILE' : 'FILES'}
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="flex flex-col gap-2">
            {docs.map((doc) => {
              const isCurrentlyActive = activeDocId === doc.id;
              const formattedTime = doc.loadedAt instanceof Date
                ? doc.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(doc.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className={`flex items-center justify-between p-3 rounded-lg bg-card border transition-all shadow-2xs cursor-pointer group [content-visibility:auto] ${
                    isCurrentlyActive 
                      ? 'border-accent/60 bg-accent/[0.04]' 
                      : 'border-border hover:border-accent/40 hover:bg-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                      isCurrentlyActive 
                        ? 'bg-accent text-accent-on' 
                        : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 group-hover:bg-rose-500/20'
                    }`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors truncate font-sans">
                          {doc.name}
                        </h4>
                        {isCurrentlyActive && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <button
                      type="button"
                      onClick={(e) => onRemoveDoc(doc.id, e)}
                      title="Remove from session"
                      className="h-7 w-7 rounded hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => onOpenDoc(doc)}
                      className="h-7 flex items-center gap-1 px-2.5 rounded-md bg-accent text-accent-on text-xs font-bold hover:opacity-90 active:translate-y-0.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <span>{isCurrentlyActive ? 'VIEW' : 'OPEN'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioRecentView;
