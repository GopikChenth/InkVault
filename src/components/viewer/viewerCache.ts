/**
 * InkVault High-Performance Document & Page Cache System
 * 
 * Centralized, non-blocking cache and prioritized render queue for PDF/comic viewers.
 * Features:
 * 1. globalPageBitmapCache: In-memory pre-rendered high-res pages for 0ms instantaneous page turns.
 * 2. thumbnailBitmapCache: Rendered thumbnail ImageBitmaps for instant sidebar preview rendering.
 * 3. ThumbnailRenderQueue: Prioritized, non-blocking single-concurrency thumbnail queue.
 * 4. Main Page Priority Coordinator: Automatically yields thumbnail rendering when main viewport renders.
 * 5. Automatic VRAM recycling: Strict LRU pruning with .close() on evicted ImageBitmaps.
 */

export interface CachedPageBitmap {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  pageNum: number;
  renderKey: string;
}

// 1. High-Resolution Main View Page Cache (keyed by `${docKey}_${pageNum}_${rotation}_${scale}`)
export const globalPageBitmapCache = new Map<string, CachedPageBitmap>();

// 2. Navigation Sidebar Thumbnail Bitmap Cache (keyed by `${docKey}_${pageNum}_${rotation}`)
export const thumbnailBitmapCache = new Map<string, ImageBitmap>();

// 3. Main Viewer Rendering Lock / Priority Coordinator
let _isMainViewerRendering = false;
const _mainViewerWaiters: Array<() => void> = [];

export function isMainViewerRendering(): boolean {
  return _isMainViewerRendering;
}

export function setMainViewerRendering(isRendering: boolean) {
  _isMainViewerRendering = isRendering;
  if (!isRendering) {
    while (_mainViewerWaiters.length > 0) {
      const resolve = _mainViewerWaiters.shift();
      resolve?.();
    }
  }
}

export function waitForMainViewer(): Promise<void> {
  if (!_isMainViewerRendering) return Promise.resolve();
  return new Promise((resolve) => {
    _mainViewerWaiters.push(resolve);
  });
}

// 4. Cache Key Helpers
export function getPageRenderKey(docKey: string, pageNum: number, rotation: number, scale: number): string {
  return `${docKey}_${pageNum}_${rotation}_${scale}`;
}

export function getThumbnailCacheKey(docKey: string, pageNum: number, rotation: number): string {
  return `${docKey}_${pageNum}_${rotation}`;
}

export function getThumbnailBitmap(key: string): ImageBitmap | undefined {
  return thumbnailBitmapCache.get(key);
}

export function storeThumbnailBitmap(key: string, bmp: ImageBitmap) {
  if (thumbnailBitmapCache.size > 120) {
    const oldest = thumbnailBitmapCache.keys().next().value;
    if (oldest) {
      const oldBmp = thumbnailBitmapCache.get(oldest);
      try { oldBmp?.close(); } catch {}
      thumbnailBitmapCache.delete(oldest);
    }
  }
  thumbnailBitmapCache.set(key, bmp);
}

// 5. Automatic Sharing between Main View and Thumbnail Cache
export function shareCanvasAsThumbnail(
  docKey: string, 
  pageNum: number, 
  rotation: number, 
  sourceCanvas: HTMLCanvasElement
) {
  const thumbKey = getThumbnailCacheKey(docKey, pageNum, rotation);
  if (thumbnailBitmapCache.has(thumbKey) || sourceCanvas.width < 10) return;

  try {
    const thumbW = 180;
    const thumbH = Math.max(10, Math.round((thumbW * sourceCanvas.height) / sourceCanvas.width));
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const tctx = thumbCanvas.getContext('2d');
    if (tctx) {
      tctx.drawImage(sourceCanvas, 0, 0, thumbW, thumbH);
      if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
        window.createImageBitmap(thumbCanvas).then((bmp) => {
          storeThumbnailBitmap(thumbKey, bmp);
        }).catch(() => {});
      }
    }
  } catch {}
}

// 6. VRAM Memory Reclamation / Pruning
export function prunePageBitmapCache(docKey: string, currentPage: number, keepRadius = 4) {
  for (const [key, cached] of globalPageBitmapCache.entries()) {
    if (key.startsWith(`${docKey}_`)) {
      if (Math.abs(cached.pageNum - currentPage) > keepRadius) {
        try {
          cached.bitmap.close();
        } catch {}
        globalPageBitmapCache.delete(key);
      }
    }
  }
}

export function clearDocumentBitmapCache(docKey?: string) {
  for (const [key, cached] of globalPageBitmapCache.entries()) {
    if (!docKey || key.startsWith(`${docKey}_`)) {
      try {
        cached.bitmap.close();
      } catch {}
      globalPageBitmapCache.delete(key);
    }
  }
  for (const [key, bmp] of thumbnailBitmapCache.entries()) {
    if (!docKey || key.startsWith(`${docKey}_`)) {
      try {
        bmp.close();
      } catch {}
      thumbnailBitmapCache.delete(key);
    }
  }
}

// 7. Prioritized, Non-Blocking Thumbnail Queue
export interface ThumbnailRenderTask {
  id: string; // thumbKey
  pageNum: number;
  docKey: string;
  pdfDoc: any;
  rotation: number;
  currentPage: number;
  cancelled: boolean;
  onSuccess: (bmp: ImageBitmap) => void;
  onError?: (err: any) => void;
}

class ThumbnailQueueManager {
  private queue: ThumbnailRenderTask[] = [];
  private isRunning = false;

  enqueue(task: ThumbnailRenderTask) {
    // If already in queue, update target callback & priority
    const existingIdx = this.queue.findIndex((t) => t.id === task.id);
    if (existingIdx !== -1) {
      this.queue[existingIdx] = task;
    } else {
      this.queue.push(task);
    }

    this.resort(task.currentPage);
    this.processNext();
  }

  cancel(taskId: string) {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this.queue[idx].cancelled = true;
      this.queue.splice(idx, 1);
    }
  }

  resort(currentPage: number) {
    this.queue.sort((a, b) => {
      const distA = Math.abs(a.pageNum - currentPage);
      const distB = Math.abs(b.pageNum - currentPage);
      return distA - distB;
    });
  }

  private async processNext() {
    if (this.isRunning) return;
    if (this.queue.length === 0) return;

    this.isRunning = true;

    while (this.queue.length > 0) {
      // 1. Yield completely if main page is currently rendering
      if (isMainViewerRendering()) {
        await waitForMainViewer();
      }

      const task = this.queue.shift();
      if (!task || task.cancelled) continue;

      // 2. Check if thumbnail was already populated in the meantime
      const cached = getThumbnailBitmap(task.id);
      if (cached) {
        task.onSuccess(cached);
        continue;
      }

      // 3. Render thumbnail with optimal 1.0 output scale to offscreen canvas
      try {
        const page = await task.pdfDoc.getPage(task.pageNum);
        if (task.cancelled) continue;

        const unscaledVp = page.getViewport({ scale: 1.0, rotation: task.rotation });
        const targetW = 180;
        const targetScale = targetW / Math.max(1, unscaledVp.width);
        const viewport = page.getViewport({ scale: targetScale, rotation: task.rotation });

        const offscreen = document.createElement('canvas');
        offscreen.width = Math.max(1, Math.round(viewport.width));
        offscreen.height = Math.max(1, Math.round(viewport.height));
        const ctx = offscreen.getContext('2d', { alpha: false });
        if (!ctx) continue;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas: offscreen,
        });

        await renderTask.promise;

        if (task.cancelled) continue;

        if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
          const bmp = await window.createImageBitmap(offscreen);
          storeThumbnailBitmap(task.id, bmp);
          task.onSuccess(bmp);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          task.onError?.(err);
        }
      }

      // Small cooperative pause so main thread stays 100% fluid
      await new Promise((r) => setTimeout(r, 8));
    }

    this.isRunning = false;
  }
}

export const thumbnailQueue = new ThumbnailQueueManager();
