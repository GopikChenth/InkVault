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
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-4xl mx-auto w-full">
      {docs.length === 0 ? (
        <div className="h-[60vh] flex items-center justify-center">
          <EmptyState
            icon={FileText}
            title="No recent documents yet"
            description="Documents opened in this session will appear here for fast access."
            actionLabel="Open a PDF Document"
            onAction={onTriggerOpenFile}
            hint="or drag and drop PDF anywhere"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Session Documents
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Locally loaded PDF documents stored in-memory.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">
                {docs.length} {docs.length === 1 ? 'Document' : 'Documents'}
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5">
            {docs.map((doc) => {
              const isCurrentlyActive = activeDocId === doc.id;
              const formattedTime = doc.loadedAt instanceof Date
                ? doc.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(doc.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className={`flex items-center justify-between p-4 rounded-xl bg-card border transition-all shadow-sm cursor-pointer group [content-visibility:auto] ${
                    isCurrentlyActive 
                      ? 'border-accent/60 bg-accent/[0.03]' 
                      : 'border-border hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                      isCurrentlyActive 
                        ? 'bg-accent text-white' 
                        : 'bg-surface text-zinc-700 dark:text-zinc-300 group-hover:bg-accent/10 group-hover:text-accent'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors truncate">
                          {doc.name}
                        </h4>
                        {isCurrentlyActive && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Active
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

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => onRemoveDoc(doc.id, e)}
                      title="Remove from session"
                      className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => onOpenDoc(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors"
                    >
                      <span>{isCurrentlyActive ? 'View' : 'Open'}</span>
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
