import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  FolderOpen, 
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  Lock
} from 'lucide-react';
import { LoadedPDF } from '../../../../types';
import EmptyState from '../../../../components/EmptyState';
import ToolHeader from './ToolHeader';
import { nativeFlattenPDF } from '../../../../utils/nativePdfBridge';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface FlattenToolProps {
  initialDoc: LoadedPDF | null;
  onOpenFlattenedDoc: (doc: LoadedPDF) => void;
}

export default function FlattenTool({ initialDoc, onOpenFlattenedDoc }: FlattenToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [flattenForms, setFlattenForms] = useState<boolean>(true);
  const [flattenAnnotations, setFlattenAnnotations] = useState<boolean>(true);
  const [incremental, setIncremental] = useState<boolean>(false);

  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customPages, setCustomPages] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(1);

  const [applying, setApplying] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

  // Render Base PDF Preview
  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let isCancelled = false;
    setPageLoading(true);

    const renderPreview = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(doc.blobUrl);
        const pdf = await loadingTask.promise;
        setTotalPages(pdf.numPages);
        const page = await pdf.getPage(1);
        const pixelRatio = window.devicePixelRatio || 1;
        const targetWidth = 380 * pixelRatio;
        const baseVp = page.getViewport({ scale: 1.0 });
        const scale = targetWidth / baseVp.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        if (!isCancelled) {
          setPageLoading(false);
        }
      } catch (err) {
        console.error('Error rendering preview:', err);
        if (!isCancelled) setPageLoading(false);
      }
    };

    renderPreview();
    return () => {
      isCancelled = true;
    };
  }, [doc]);

  const handleFlatten = async () => {
    if (!doc || (!flattenForms && !flattenAnnotations)) return;
    setApplying(true);

    try {
      let selectedPages: number[] | undefined = undefined;
      if (pageRangeMode === 'custom' && customPages.trim()) {
        const pagesSet = new Set<number>();
        const parts = customPages.split(',');
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes('-')) {
            const [startStr, endStr] = trimmed.split('-');
            const s = parseInt(startStr, 10);
            const e = parseInt(endStr, 10);
            if (!isNaN(s) && !isNaN(e)) {
              for (let p = Math.min(s, e); p <= Math.max(s, e); p++) {
                if (p >= 1 && p <= totalPages) pagesSet.add(p - 1);
              }
            }
          } else {
            const p = parseInt(trimmed, 10);
            if (!isNaN(p) && p >= 1 && p <= totalPages) pagesSet.add(p - 1);
          }
        }
        if (pagesSet.size > 0) {
          selectedPages = Array.from(pagesSet).sort((a, b) => a - b);
        }
      }

      // 1. Native Rust Engine Flatten
      const nativeBytes = await nativeFlattenPDF(
        doc.file,
        doc.name,
        {
          pages: selectedPages,
          flattenAnnotations,
          flattenForms,
          incremental,
        },
        doc.filePath
      );

      let resultBytes: Uint8Array;

      if (nativeBytes) {
        resultBytes = nativeBytes;
      } else {
        // Fallback: Client-side pdf-lib form flatten
        const arrayBuffer = await doc.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();
        if (flattenForms) {
          form.flatten();
        }
        resultBytes = await pdfDoc.save();
      }

      const resultBlob = new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const resultUrl = URL.createObjectURL(resultBlob);
      const outputFileName = doc.name.replace(/\.pdf$/i, '') + '-flattened.pdf';
      const newFile = new File([resultBlob], outputFileName, { type: 'application/pdf' });

      const updatedDoc: LoadedPDF = {
        id: `${Date.now()}-${outputFileName}`,
        name: outputFileName,
        size: formatSize(resultBytes.length),
        rawSize: resultBytes.length,
        blobUrl: resultUrl,
        file: newFile,
        loadedAt: new Date(),
      };

      onOpenFlattenedDoc(updatedDoc);
    } catch (err) {
      console.error('Failed to flatten document:', err);
      alert('Failed to flatten: ' + String(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface dark:bg-surface overflow-hidden">
      {/* Top Header — Chamfered Mecha Layout */}
      <ToolHeader
        icon={FileCheck2}
        title="Flatten PDF Document"
        description="Convert interactive forms, signatures, and annotations into permanent, immutable page content"
        actions={
          doc && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 flex items-center gap-1.5 px-3 rounded-md bg-card border border-border hover:bg-black/5 dark:hover:bg-white/10 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
              <button
                type="button"
                disabled={applying || (!flattenForms && !flattenAnnotations)}
                onClick={handleFlatten}
                className="h-7 flex items-center gap-1.5 px-3.5 rounded-md bg-accent hover:opacity-90 active:translate-y-0.5 text-accent-on font-mono font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                {applying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Flattening...</span>
                  </>
                ) : (
                  <>
                    <span>Flatten & Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Content Area */}
      {!doc ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            icon={FileCheck2}
            title="No PDF document selected"
            description="Choose a PDF to permanently bake form values, highlights, and annotations into page content"
            actionLabel="Select Document"
            onAction={() => fileInputRef.current?.click()}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Controls Column */}
          <div className="w-96 border-r border-border bg-card flex flex-col h-full overflow-y-auto p-5 gap-5 select-none">
            {/* 1. Flatten Scope */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Flatten Elements
              </span>

              <label className="p-3 rounded-lg border border-border bg-surface/60 flex items-start gap-3 cursor-pointer hover:bg-surface transition-colors">
                <input
                  type="checkbox"
                  checked={flattenForms}
                  onChange={(e) => setFlattenForms(e.target.checked)}
                  className="rounded text-accent focus:ring-accent mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Interactive Form Fields
                  </span>
                  <span className="text-[11px] text-muted leading-relaxed mt-0.5">
                    Bakes text boxes, checkboxes, dropdowns, and button appearances into the PDF page streams and clears interactive widgets.
                  </span>
                </div>
              </label>

              <label className="p-3 rounded-lg border border-border bg-surface/60 flex items-start gap-3 cursor-pointer hover:bg-surface transition-colors">
                <input
                  type="checkbox"
                  checked={flattenAnnotations}
                  onChange={(e) => setFlattenAnnotations(e.target.checked)}
                  className="rounded text-accent focus:ring-accent mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Comments & Annotations
                  </span>
                  <span className="text-[11px] text-muted leading-relaxed mt-0.5">
                    Merges text highlights, sticky notes, drawn ink strokes, shapes, and stamps permanently into the page canvas.
                  </span>
                </div>
              </label>
            </div>

            {/* 2. Persistence Mode */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                Persistence Strategy
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface border border-border">
                <button
                  type="button"
                  onClick={() => setIncremental(false)}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors text-center ${
                    !incremental
                      ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-xs border border-border font-semibold'
                      : 'text-muted hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Full Rewrite (Compacted)
                </button>
                <button
                  type="button"
                  onClick={() => setIncremental(true)}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors text-center ${
                    incremental
                      ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-xs border border-border font-semibold'
                      : 'text-muted hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Incremental Append
                </button>
              </div>
              <p className="text-[10px] text-muted leading-relaxed mt-0.5">
                {incremental 
                  ? 'Appends updates without touching original byte offsets; preserves prior digital certificates and revisions.'
                  : 'Compacts and purges unreferenced streams for minimum file size.'}
              </p>
            </div>

            {/* 3. Page Range */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Page Scope
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface border border-border">
                <button
                  type="button"
                  onClick={() => setPageRangeMode('all')}
                  className={`py-1 rounded text-xs font-medium transition-colors ${
                    pageRangeMode === 'all'
                      ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-xs border border-border'
                      : 'text-muted hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  All ({totalPages} {totalPages === 1 ? 'page' : 'pages'})
                </button>
                <button
                  type="button"
                  onClick={() => setPageRangeMode('custom')}
                  className={`py-1 rounded text-xs font-medium transition-colors ${
                    pageRangeMode === 'custom'
                      ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-xs border border-border'
                      : 'text-muted hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {pageRangeMode === 'custom' && (
                <input
                  type="text"
                  value={customPages}
                  onChange={(e) => setCustomPages(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-surface text-zinc-900 dark:text-zinc-100"
                />
              )}
            </div>

            {/* Notice Callout */}
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs mt-auto">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold block mb-0.5">Permanent Transformation</span>
                Once flattened, annotations and form inputs cannot be edited again by PDF viewers. A new file will be produced.
              </div>
            </div>
          </div>

          {/* Preview Viewport */}
          <div className="flex-1 bg-zinc-100/70 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-auto">
            <div className="relative shadow-2xl rounded-sm border border-border bg-white flex items-center justify-center">
              {pageLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex items-center justify-center z-20">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <canvas ref={canvasRef} className="block" />
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-muted font-mono">
              <span>Previewing Document Page 1</span>
              <span>•</span>
              <span>ISO 32000-2 §12.5.5 Native Content Merging</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
