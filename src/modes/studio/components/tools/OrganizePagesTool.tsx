import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  LayoutGrid, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  FolderOpen, 
  Square, 
  CheckSquare, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { LoadedPDF } from '../../../../types';
import EmptyState from '../../../../components/EmptyState';
import { nativeOrganizePDF, PageOrganizeItem } from '../../../../utils/nativePdfBridge';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PageItem {
  id: string;
  originalIndex: number; // 0-indexed
  pageNumber: number; // 1-indexed for display
  rotationDelta: number; // in degrees (0, 90, 180, 270)
  thumbnailUrl: string | null;
  aspectRatio: number;
}

interface OrganizePagesToolProps {
  initialDoc: LoadedPDF | null;
  onOpenOrganizedDoc: (doc: LoadedPDF) => void;
}

export default function OrganizePagesTool({ initialDoc, onOpenOrganizedDoc }: OrganizePagesToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [outputName, setOutputName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Load document and render thumbnails
  useEffect(() => {
    if (!doc) {
      setPages([]);
      setSelectedIds(new Set());
      return;
    }

    setOutputName(doc.name.replace(/\.pdf$/i, '') + '_Organized.pdf');
    let isCancelled = false;
    setLoadingThumbnails(true);

    const loadPages = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: doc.blobUrl,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
        });
        const pdfDoc = await loadingTask.promise;
        const total = pdfDoc.numPages;

        const initialPages: PageItem[] = [];
        for (let i = 1; i <= total; i++) {
          initialPages.push({
            id: `p-${i}-${Date.now()}`,
            originalIndex: i - 1,
            pageNumber: i,
            rotationDelta: 0,
            thumbnailUrl: null,
            aspectRatio: 0.77,
          });
        }

        if (!isCancelled) {
          setPages(initialPages);
        }

        // Render thumbnails in chunks
        for (let i = 1; i <= total; i++) {
          if (isCancelled) break;
          try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.35 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (ctx) {
              await page.render({ canvasContext: ctx, canvas, viewport }).promise;
              const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);

              if (!isCancelled) {
                setPages((prev) =>
                  prev.map((p, idx) =>
                    idx === i - 1
                      ? {
                          ...p,
                          thumbnailUrl: thumbUrl,
                          aspectRatio: viewport.width / viewport.height,
                        }
                      : p
                  )
                );
              }
            }
          } catch (pageErr) {
            console.warn(`Failed to render thumbnail for page ${i}:`, pageErr);
          }
        }
      } catch (err) {
        console.error('Error loading PDF in OrganizePagesTool:', err);
      } finally {
        if (!isCancelled) setLoadingThumbnails(false);
      }
    };

    loadPages();
    return () => {
      isCancelled = true;
    };
  }, [doc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const blobUrl = URL.createObjectURL(file);
      setDoc({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: formatSize(file.size),
        rawSize: file.size,
        blobUrl,
        file,
        loadedAt: new Date(),
      });
    }
  };

  // Reorder operations
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  // Rotation operations
  const rotatePage = (id: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, rotationDelta: (p.rotationDelta + delta + 360) % 360 }
          : p
      )
    );
  };

  const rotateSelected = (delta: number) => {
    if (selectedIds.size === 0) return;
    setPages((prev) =>
      prev.map((p) =>
        selectedIds.has(p.id)
          ? { ...p, rotationDelta: (p.rotationDelta + delta + 360) % 360 }
          : p
      )
    );
  };

  // Deletion operations
  const deletePage = (id: string) => {
    if (pages.length <= 1) {
      alert('A document must have at least one page.');
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (pages.length - selectedIds.size < 1) {
      alert('Cannot delete all pages. A document must keep at least one page.');
      return;
    }
    setPages((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  };

  // Selection toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pages.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Reset to original sequence
  const resetToOriginal = () => {
    if (!doc) return;
    setPages((prev) => {
      const sorted = [...prev].sort((a, b) => a.originalIndex - b.originalIndex);
      return sorted.map((p) => ({ ...p, rotationDelta: 0 }));
    });
  };

  // Execute Native Organize & Save
  const handleSaveOrganized = useCallback(
    async (openDirectly: boolean = false) => {
      if (!doc || pages.length === 0) return;
      setSaving(true);

      try {
        const actions: PageOrganizeItem[] = pages.map((p) => ({
          pageIndex: p.originalIndex,
          rotationDelta: p.rotationDelta !== 0 ? p.rotationDelta : undefined,
        }));

        let pdfBytes: Uint8Array;
        const nativeResult = await nativeOrganizePDF(
          doc.file,
          doc.name,
          actions,
          doc.filePath
        );

        if (nativeResult) {
          pdfBytes = nativeResult;
        } else {
          throw new Error('Native page organization unavailable');
        }

        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
          type: 'application/pdf',
        });
        const blobUrl = URL.createObjectURL(blob);
        const cleanName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;

        const newDoc: LoadedPDF = {
          id: `${Date.now()}-${cleanName}`,
          name: cleanName,
          size: formatSize(pdfBytes.length),
          rawSize: pdfBytes.length,
          blobUrl,
          file: new File([blob], cleanName, { type: 'application/pdf' }),
          loadedAt: new Date(),
        };

        if (openDirectly) {
          onOpenOrganizedDoc(newDoc);
        } else {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = cleanName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          onOpenOrganizedDoc(newDoc);
        }
      } catch (err) {
        console.error('Failed to organize pages:', err);
        alert('Failed to organize pages: ' + String(err));
      } finally {
        setSaving(false);
      }
    },
    [doc, pages, outputName, onOpenOrganizedDoc]
  );

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden">
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Toolbar */}
      <div className="h-12 border-b border-border bg-surface dark:bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs flex-shrink-0">
            <LayoutGrid className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Organize Pages
            </h2>
            <p className="text-[10px] font-mono text-zinc-400 hidden sm:block truncate">
              Reorder, rotate, and prune pages atomically • ArcadeLabs Native Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-card border border-border hover:bg-card text-xs font-semibold transition-colors shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{doc ? 'Change PDF' : 'Select PDF'}</span>
          </button>

          {doc && pages.length > 0 && (
            <button
              type="button"
              onClick={() => handleSaveOrganized(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-40"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Save & Open</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!doc ? (
        <div className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center justify-center">
          <EmptyState
            icon={LayoutGrid}
            title="Organize Pages"
            description="Reorder, rotate, or remove pages."
            actionLabel="Browse PDF File"
            onAction={() => fileInputRef.current?.click()}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action Ribbon */}
          <div className="border-b border-border bg-card/60 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {pages.length} Pages
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-zinc-500">
                {selectedIds.size} Selected
              </span>
              {loadingThumbnails && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <div className="h-2.5 w-2.5 rounded-full border border-accent border-t-transparent animate-spin" />
                  <span>Loading previews...</span>
                </span>
              )}
            </div>

            {/* Batch Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={selectedIds.size === pages.length ? deselectAll : selectAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface hover:bg-surface-container border border-border transition-colors"
              >
                {selectedIds.size === pages.length ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-accent" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Select All</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => rotateSelected(90)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface hover:bg-surface-container border border-border transition-colors disabled:opacity-40"
                title="Rotate Selected 90° Clockwise"
              >
                <RotateCw className="h-3.5 w-3.5 text-accent" />
                <span className="hidden sm:inline">Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={() => rotateSelected(-90)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface hover:bg-surface-container border border-border transition-colors disabled:opacity-40"
                title="Rotate Selected 90° Counter-Clockwise"
              >
                <RotateCcw className="h-3.5 w-3.5 text-accent" />
                <span className="hidden sm:inline">Rotate -90°</span>
              </button>

              <button
                type="button"
                onClick={deleteSelected}
                disabled={selectedIds.size === 0 || pages.length <= selectedIds.size}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-40"
                title="Delete Selected Pages"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={resetToOriginal}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors ml-1"
                title="Reset to Original Order"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="hidden md:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Page Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {pages.map((p, index) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`group relative flex flex-col rounded-2xl border transition-all duration-200 select-none cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/30 shadow-md'
                        : 'border-border bg-card hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm'
                    }`}
                  >
                    {/* Top Page Header Bar */}
                    <div className="px-3 py-2 flex items-center justify-between text-xs font-mono text-zinc-500 border-b border-border bg-surface/50">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-accent focus:ring-accent"
                        />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          #{index + 1}
                        </span>
                      </div>
                      {p.rotationDelta !== 0 && (
                        <span className="text-[10px] font-semibold text-accent bg-accent/15 px-1.5 py-0.2 rounded-full">
                          {p.rotationDelta}°
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Viewport */}
                    <div className="p-3 flex items-center justify-center min-h-[160px] max-h-[220px] bg-zinc-100 dark:bg-zinc-900/50 relative overflow-hidden">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={`Page ${p.pageNumber}`}
                          style={{
                            transform: `rotate(${p.rotationDelta}deg)`,
                            transition: 'transform 0.2s ease',
                          }}
                          className="max-h-[160px] w-auto object-contain shadow-xs rounded border border-black/10 dark:border-white/10"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                          <FileText className="h-8 w-8 animate-pulse opacity-40" />
                          <span className="text-[10px] font-mono">Page {p.pageNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions (Reorder & Rotate & Delete) */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="px-2 py-1.5 bg-surface/80 border-t border-border flex items-center justify-between gap-1 text-zinc-500"
                    >
                      {/* Move buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => movePage(index, index - 1)}
                          disabled={index === 0}
                          title="Move Left"
                          className="p-1 rounded hover:bg-card disabled:opacity-20 transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePage(index, index + 1)}
                          disabled={index === pages.length - 1}
                          title="Move Right"
                          className="p-1 rounded hover:bg-card disabled:opacity-20 transition-colors"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Rotate & Delete buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => rotatePage(p.id, 90)}
                          title="Rotate 90° Clockwise"
                          className="p-1 rounded hover:bg-card text-zinc-600 dark:text-zinc-300 hover:text-accent transition-colors"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePage(p.id)}
                          disabled={pages.length <= 1}
                          title="Delete Page"
                          className="p-1 rounded hover:bg-card text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
