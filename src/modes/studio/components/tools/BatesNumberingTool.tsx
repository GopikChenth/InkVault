import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Hash, 
  FolderOpen, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { LoadedPDF } from '../../../../types';
import EmptyState from '../../../../components/EmptyState';
import { nativeAddHeaderFooter } from '../../../../utils/nativePdfBridge';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface BatesNumberingToolProps {
  initialDoc: LoadedPDF | null;
  onOpenBatesDoc: (doc: LoadedPDF) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BatesNumberingTool({ initialDoc, onOpenBatesDoc }: BatesNumberingToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [activeSlot, setActiveSlot] = useState<number>(4); // default Footer Center
  
  // 6 text slots: [Header Left, Header Center, Header Right, Footer Left, Footer Center, Footer Right]
  const [slots, setSlots] = useState<[string, string, string, string, string, string]>([
    '', '', '<<yyyy-mm-dd>>',
    '', '<<Page 1 of n>>', ''
  ]);

  // Bates Number builder
  const [batesPrefix, setBatesPrefix] = useState<string>('DOC-');
  const [batesDigits, setBatesDigits] = useState<number>(6);
  const [batesStart, setBatesStart] = useState<number>(1);
  const [batesSuffix, setBatesSuffix] = useState<string>('');

  // Typography & Styling
  const [fontSize, setFontSize] = useState<number>(9);
  const [colorHex, setColorHex] = useState<string>('#000000');
  const [underline, setUnderline] = useState<boolean>(false);

  // Margins in points (72 pt = 1 inch, 36 pt = 0.5 inch)
  const [marginTop, setMarginTop] = useState<number>(36);
  const [marginBottom, setMarginBottom] = useState<number>(36);
  const [marginLeft, setMarginLeft] = useState<number>(54);
  const [marginRight, setMarginRight] = useState<number>(54);

  // Options
  const [shrinkContent, setShrinkContent] = useState<boolean>(true);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customPages, setCustomPages] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(1);

  // Execution state
  const [applying, setApplying] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [pageScale, setPageScale] = useState<number>(1.0);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // Helper to expand tokens for live preview
  const expandTokensForPreview = useCallback((template: string, pageNum: number, count: number): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();

    let result = template;
    result = result.replace(/<<1>>/g, String(pageNum));
    result = result.replace(/<<n>>/g, String(count));
    result = result.replace(/<<1 of n>>/g, `${pageNum} of ${count}`);
    result = result.replace(/<<1\/n>>/g, `${pageNum}/${count}`);
    result = result.replace(/<<Page 1>>/g, `Page ${pageNum}`);
    result = result.replace(/<<Page 1 of n>>/g, `Page ${pageNum} of ${count}`);
    result = result.replace(/<<m\/d>>/g, `${m}/${d}`);
    result = result.replace(/<<m\/d\/yy>>/g, `${m}/${d}/${String(y).slice(-2)}`);
    result = result.replace(/<<m\/d\/yyyy>>/g, `${m}/${d}/${y}`);
    result = result.replace(/<<mm\/dd\/yy>>/g, `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${String(y).slice(-2)}`);
    result = result.replace(/<<mm\/dd\/yyyy>>/g, `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`);
    result = result.replace(/<<d\/m\/yy>>/g, `${d}/${m}/${String(y).slice(-2)}`);
    result = result.replace(/<<d\/m\/yyyy>>/g, `${d}/${m}/${y}`);
    result = result.replace(/<<dd\/mm\/yyyy>>/g, `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`);
    result = result.replace(/<<yyyy-mm-dd>>/g, `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    result = result.replace(/<<mmmm d, yyyy>>/g, `${MONTHS[m - 1]} ${d}, ${y}`);

    // Bates token: <<Bates Number#digits#start#prefix#suffix>>
    result = result.replace(/<<Bates Number#(\d+)#(\d+)#([^#]*)#([^>]*)>>/g, (_, digits, start, prefix, suffix) => {
      const dig = Math.min(15, Math.max(1, parseInt(digits, 10) || 6));
      const curNum = (parseInt(start, 10) || 1) + (pageNum - 1);
      return `${prefix || ''}${String(curNum).padStart(dig, '0')}${suffix || ''}`;
    });

    return result;
  }, []);

  // 1. Render Base PDF Page 1 ONCE when document is loaded
  useEffect(() => {
    if (!doc || !baseCanvasRef.current) return;
    let isCancelled = false;
    setPageLoading(true);

    const renderBasePage = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(doc.blobUrl);
        const pdf = await loadingTask.promise;
        setTotalPages(pdf.numPages);
        const page = await pdf.getPage(1);
        const pixelRatio = window.devicePixelRatio || 1;
        const targetWidth = 380 * pixelRatio;
        const baseVp = page.getViewport({ scale: 1.0 });
        const calculatedScale = targetWidth / baseVp.width;
        const viewport = page.getViewport({ scale: calculatedScale });

        const baseCanvas = baseCanvasRef.current;
        if (!baseCanvas || isCancelled) return;

        baseCanvas.width = viewport.width;
        baseCanvas.height = viewport.height;

        const ctx = baseCanvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        await page.render({ canvasContext: ctx, viewport, canvas: baseCanvas }).promise;

        if (!isCancelled) {
          setPageScale(calculatedScale);
          setCanvasSize({ width: viewport.width, height: viewport.height });
          setPageLoading(false);
        }
      } catch (err) {
        console.error('Error rendering base PDF preview:', err);
        if (!isCancelled) setPageLoading(false);
      }
    };

    renderBasePage();
    return () => {
      isCancelled = true;
    };
  }, [doc]);

  // 2. Real-Time Overlay Drawing for Headers, Footers, and Bates numbers
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Margins in canvas coordinates
    const scale = pageScale;
    const topPx = marginTop * scale;
    const bottomPx = marginBottom * scale;
    const leftPx = marginLeft * scale;
    const rightPx = marginRight * scale;

    // Draw subtle guide lines for margins
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    // Header band line
    ctx.beginPath();
    ctx.moveTo(leftPx, topPx + (fontSize * 1.2 * scale));
    ctx.lineTo(canvas.width - rightPx, topPx + (fontSize * 1.2 * scale));
    // Footer band line
    ctx.moveTo(leftPx, canvas.height - bottomPx - (fontSize * 1.2 * scale));
    ctx.lineTo(canvas.width - rightPx, canvas.height - bottomPx - (fontSize * 1.2 * scale));
    ctx.stroke();
    ctx.restore();

    // Text styling
    const scaledFont = Math.max(8, fontSize * scale);
    ctx.font = `${scaledFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    ctx.fillStyle = colorHex;
    ctx.textBaseline = 'top';

    const slotTitles = slots.map((s) => expandTokensForPreview(s, 1, totalPages));

    // Slots: 0=HL, 1=HC, 2=HR, 3=FL, 4=FC, 5=FR
    slotTitles.forEach((text, idx) => {
      if (!text.trim()) return;

      const isHeader = idx < 3;
      const pos = idx % 3; // 0=left, 1=center, 2=right

      let x = leftPx;
      let align: CanvasTextAlign = 'left';
      if (pos === 1) {
        x = canvas.width / 2;
        align = 'center';
      } else if (pos === 2) {
        x = canvas.width - rightPx;
        align = 'right';
      }

      ctx.textAlign = align;

      // In PDF, headers hang below top margin; footers sit above bottom margin
      const y = isHeader ? topPx : canvas.height - bottomPx - scaledFont;

      ctx.fillText(text, x, y);

      if (underline) {
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        let lineX = x;
        if (align === 'center') lineX = x - textWidth / 2;
        else if (align === 'right') lineX = x - textWidth;

        ctx.beginPath();
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = Math.max(1, scaledFont * 0.08);
        ctx.moveTo(lineX, y + scaledFont + 1);
        ctx.lineTo(lineX + textWidth, y + scaledFont + 1);
        ctx.stroke();
      }
    });
  }, [
    canvasSize,
    pageScale,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    fontSize,
    colorHex,
    underline,
    slots,
    totalPages,
    expandTokensForPreview,
  ]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const insertToken = (token: string) => {
    setSlots((prev) => {
      const next = [...prev] as [string, string, string, string, string, string];
      next[activeSlot] = next[activeSlot] ? `${next[activeSlot]} ${token}` : token;
      return next;
    });
  };

  const insertBatesToken = () => {
    const token = `<<Bates Number#${batesDigits}#${batesStart}#${batesPrefix}#${batesSuffix}>>`;
    insertToken(token);
  };

  const handleApply = async () => {
    if (!doc) return;
    setApplying(true);

    try {
      // Parse custom pages if selected
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

      // Convert hex color to [r, g, b] 0.0..1.0
      const hexClean = colorHex.replace('#', '');
      const r = parseInt(hexClean.slice(0, 2), 16) / 255;
      const g = parseInt(hexClean.slice(2, 4), 16) / 255;
      const b = parseInt(hexClean.slice(4, 6), 16) / 255;

      // 1. Try Native Rust Engine
      const nativeBytes = await nativeAddHeaderFooter(
        doc.file,
        doc.name,
        {
          text: slots,
          pages: selectedPages,
          fontSize,
          colorRgb: [r, g, b],
          underline,
          margins: [marginTop, marginBottom, marginLeft, marginRight],
          startNumber: 1,
          shrink: shrinkContent,
          replace: replaceExisting,
        },
        doc.filePath
      );

      let resultBytes: Uint8Array;

      if (nativeBytes) {
        resultBytes = nativeBytes;
      } else {
        // Fallback: Client-side pdf-lib processing
        const arrayBuffer = await doc.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const rgbColor = rgb(r, g, b);

        const targetPageIndices = selectedPages ?? pages.map((_, i) => i);

        for (const idx of targetPageIndices) {
          if (idx >= pages.length) continue;
          const page = pages[idx];
          const { width, height } = page.getSize();
          const pageNum = idx + 1;

          // Render slots
          for (let s = 0; s < 6; s++) {
            const template = slots[s];
            if (!template.trim()) continue;

            const text = expandTokensForPreview(template, pageNum, pages.length);
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const isHeader = s < 3;
            const pos = s % 3;

            let x = marginLeft;
            if (pos === 1) x = (width - textWidth) / 2;
            else if (pos === 2) x = width - marginRight - textWidth;

            const y = isHeader ? height - marginTop - fontSize : marginBottom;

            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgbColor,
            });

            if (underline) {
              page.drawLine({
                start: { x, y: y - 1 },
                end: { x: x + textWidth, y: y - 1 },
                thickness: Math.max(0.5, fontSize * 0.06),
                color: rgbColor,
              });
            }
          }
        }

        resultBytes = await pdfDoc.save();
      }

      const resultBlob = new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const resultUrl = URL.createObjectURL(resultBlob);
      const outputFileName = doc.name.replace(/\.pdf$/i, '') + '-bates.pdf';
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

      onOpenBatesDoc(updatedDoc);
    } catch (err) {
      console.error('Failed to apply headers, footers & Bates numbers:', err);
      alert('Failed to apply: ' + String(err));
    } finally {
      setApplying(false);
    }
  };

  const slotLabels = [
    'Header Left', 'Header Center', 'Header Right',
    'Footer Left', 'Footer Center', 'Footer Right'
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-surface dark:bg-surface overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Bates Numbering & Header / Footer
            </h1>
            <p className="text-xs text-muted">
              Add legal numbering, sequential bates stamps, dates, and headers/footers with content scaling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {doc && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-card/70 transition-colors flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Change File
              </button>
              <button
                type="button"
                disabled={applying || slots.every((s) => !s.trim())}
                onClick={handleApply}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent hover:text-accent-on transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {applying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Apply & Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

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
            icon={Hash}
            title="No PDF document selected"
            description="Choose a PDF to add legal Bates numbers, headers, and pagination"
            actionLabel="Select Document"
            onAction={() => fileInputRef.current?.click()}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Controls Column */}
          <div className="w-96 border-r border-border bg-card flex flex-col h-full overflow-y-auto p-5 gap-5 select-none">
            {/* 1. Slot Selector & Text Inputs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Header & Footer Positions
                </label>
                <span className="text-[10px] text-muted font-mono">
                  Active: {slotLabels[activeSlot]}
                </span>
              </div>

              {/* 3x2 Grid for choosing slot */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-lg bg-surface border border-border mb-3">
                {slotLabels.map((lbl, idx) => {
                  const hasContent = !!slots[idx].trim();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlot(idx)}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium transition-colors text-center relative ${
                        activeSlot === idx
                          ? 'bg-accent text-accent-on font-semibold shadow-xs'
                          : hasContent
                          ? 'bg-card text-zinc-900 dark:text-zinc-100 border border-border'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-card/50'
                      }`}
                    >
                      {lbl.split(' ')[1]}
                      {hasContent && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Current Slot Input */}
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  value={slots[activeSlot]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSlots((prev) => {
                      const next = [...prev] as [string, string, string, string, string, string];
                      next[activeSlot] = val;
                      return next;
                    });
                  }}
                  placeholder={`Enter text or tokens for ${slotLabels[activeSlot]}...`}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* 2. Quick Insert Tokens */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Quick Insert Tokens
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => insertToken('<<1 of n>>')}
                  className="px-2 py-1 rounded bg-surface border border-border text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-accent/10 hover:border-accent/40 transition-colors"
                >
                  Page 1 of N
                </button>
                <button
                  type="button"
                  onClick={() => insertToken('<<1>>')}
                  className="px-2 py-1 rounded bg-surface border border-border text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-accent/10 hover:border-accent/40 transition-colors"
                >
                  Number (1)
                </button>
                <button
                  type="button"
                  onClick={() => insertToken('<<Page 1>>')}
                  className="px-2 py-1 rounded bg-surface border border-border text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-accent/10 hover:border-accent/40 transition-colors"
                >
                  Page 1
                </button>
                <button
                  type="button"
                  onClick={() => insertToken('<<yyyy-mm-dd>>')}
                  className="px-2 py-1 rounded bg-surface border border-border text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-accent/10 hover:border-accent/40 transition-colors"
                >
                  ISO Date
                </button>
                <button
                  type="button"
                  onClick={() => insertToken('<<mm/dd/yyyy>>')}
                  className="px-2 py-1 rounded bg-surface border border-border text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-accent/10 hover:border-accent/40 transition-colors"
                >
                  US Date
                </button>
              </div>
            </div>

            {/* 3. Legal Bates Numbering Preset */}
            <div className="p-3.5 rounded-lg border border-border bg-surface/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-accent" />
                  Legal Bates Stamp
                </span>
                <button
                  type="button"
                  onClick={insertBatesToken}
                  className="px-2.5 py-1 rounded bg-accent text-accent-on text-[11px] font-medium hover:opacity-90 transition-opacity shadow-xs"
                >
                  Insert Bates
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-muted">Prefix</label>
                  <input
                    type="text"
                    value={batesPrefix}
                    onChange={(e) => setBatesPrefix(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-border bg-surface text-xs"
                    placeholder="e.g. DOC-"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted">Suffix</label>
                  <input
                    type="text"
                    value={batesSuffix}
                    onChange={(e) => setBatesSuffix(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-border bg-surface text-xs"
                    placeholder="e.g. -CONF"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted">Digits (Padding)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={batesDigits}
                    onChange={(e) => setBatesDigits(parseInt(e.target.value, 10) || 6)}
                    className="w-full px-2 py-1 rounded border border-border bg-surface text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted">Start Number</label>
                  <input
                    type="number"
                    min={1}
                    value={batesStart}
                    onChange={(e) => setBatesStart(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2 py-1 rounded border border-border bg-surface text-xs"
                  />
                </div>
              </div>

              <div className="text-[11px] text-muted font-mono bg-card px-2 py-1 rounded border border-border truncate">
                Preview: {batesPrefix}{String(batesStart).padStart(batesDigits, '0')}{batesSuffix}
              </div>
            </div>

            {/* 4. Typography & Appearance */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Typography & Style
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted">Font Size</span>
                    <span className="font-mono">{fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={20}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-accent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted">Color</span>
                    <span className="font-mono uppercase text-[10px]">{colorHex}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                    {['#000000', '#475569', '#e11d48', '#2563eb'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColorHex(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border ${
                          colorHex.toLowerCase() === c.toLowerCase() ? 'border-accent scale-110' : 'border-black/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={underline}
                  onChange={(e) => setUnderline(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span className="text-xs text-zinc-700 dark:text-zinc-300">
                  Underline header & footer lines
                </span>
              </label>
            </div>

            {/* 5. Margins in Points */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Page Margins (Points)
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Top</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={marginTop}
                    onChange={(e) => setMarginTop(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-1.5 py-1 text-center rounded border border-border bg-surface text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Bottom</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={marginBottom}
                    onChange={(e) => setMarginBottom(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-1.5 py-1 text-center rounded border border-border bg-surface text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Left</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={marginLeft}
                    onChange={(e) => setMarginLeft(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-1.5 py-1 text-center rounded border border-border bg-surface text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Right</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={marginRight}
                    onChange={(e) => setMarginRight(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-1.5 py-1 text-center rounded border border-border bg-surface text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 6. Page Range */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Page Range
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
                  placeholder="e.g. 1-5, 8, 11-14"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-surface text-zinc-900 dark:text-zinc-100"
                />
              )}
            </div>

            {/* 7. Advanced Options */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shrinkContent}
                  onChange={(e) => setShrinkContent(e.target.checked)}
                  className="rounded text-accent focus:ring-accent mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Shrink content to fit margins
                  </span>
                  <span className="text-[10px] text-muted">
                    Scales document pages slightly to prevent text collision
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded text-accent focus:ring-accent mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Replace existing headers & footers
                  </span>
                  <span className="text-[10px] text-muted">
                    Cleans previous mark streams before writing new ones
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Live Preview Viewport */}
          <div className="flex-1 bg-zinc-100/70 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-auto">
            <div className="relative shadow-2xl rounded-sm border border-border bg-white flex items-center justify-center">
              {pageLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex items-center justify-center z-20">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* Base PDF Canvas */}
              <canvas ref={baseCanvasRef} className="block" />
              {/* Real-time Overlay Canvas */}
              <canvas ref={overlayCanvasRef} className="absolute inset-0 pointer-events-none" />
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-muted font-mono">
              <span>Previewing Page 1 of {totalPages}</span>
              <span>•</span>
              <span>Blue dashed guides show active margin boundaries</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
