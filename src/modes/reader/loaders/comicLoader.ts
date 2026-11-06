import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

/**
 * Sniff magic bytes of an image buffer to reliably detect its actual MIME type.
 * Protects against files incorrectly named (e.g. WebP saved with .jpg extension).
 */
function detectImageMimeType(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }
  return 'image/jpeg';
}

/**
 * Helper to convert an image Blob/bytes into a fast-loading JPEG or PNG Uint8Array using an offscreen canvas.
 * Preferring high-quality JPEG (0.92) for WebP/GIF/BMP dramatically accelerates pdf-lib embedding and cuts memory by ~80%.
 */
async function rasterizeImageBytes(
  bytes: Uint8Array,
  mimeType?: string,
  preferJpeg = true
): Promise<{ bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' }> {
  return new Promise((resolve, reject) => {
    const cleanBytes = (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength)
      ? bytes
      : bytes.slice();
    const type = mimeType || detectImageMimeType(cleanBytes);
    const blob = new Blob([cleanBytes as unknown as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create canvas context for comic image rasterization');
        }
        ctx.drawImage(img, 0, 0);

        const targetMime: 'image/jpeg' | 'image/png' = preferJpeg ? 'image/jpeg' : 'image/png';
        const quality = preferJpeg ? 0.92 : undefined;

        canvas.toBlob(async (outBlob) => {
          img.onload = null;
          img.onerror = null;
          img.src = '';
          canvas.width = 0;
          canvas.height = 0;
          if (!outBlob) {
            // Fallback to toDataURL if toBlob fails
            try {
              const dataUrl = canvas.toDataURL(targetMime, quality);
              const base64 = dataUrl.split(',')[1];
              const bin = atob(base64);
              const u8 = new Uint8Array(bin.length);
              for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);
              resolve({ bytes: u8, mime: targetMime });
              return;
            } catch (err2) {
              reject(new Error('Canvas toBlob and toDataURL failed'));
              return;
            }
          }
          const buf = await outBlob.arrayBuffer();
          resolve({ bytes: new Uint8Array(buf), mime: targetMime });
        }, targetMime, quality);
      } catch (err) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new Error(`Failed to load image in browser for rasterization (${type})`));
    };

    img.src = url;
  });
}

let cachedWasmBinary: ArrayBuffer | null = null;

/**
 * Loads unrar.wasm binary into memory for node-unrar-js.
 * Searches relative paths, web roots, and Tauri endpoints with aggressive caching.
 */
async function getUnrarWasmBinary(): Promise<ArrayBuffer | undefined> {
  if (cachedWasmBinary) return cachedWasmBinary;

  const candidateUrls = ['/unrar.wasm', './unrar.wasm'];
  if (typeof window !== 'undefined' && window.location) {
    try {
      candidateUrls.push(new URL('unrar.wasm', window.location.href).href);
    } catch {}
  }

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        cachedWasmBinary = await res.arrayBuffer();
        return cachedWasmBinary;
      }
    } catch {
      // Continue searching next candidate
    }
  }

  // If running in Tauri and HTTP fetch did not succeed, read directly via read_file_bytes
  const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke<ArrayBuffer | Uint8Array | number[]>('read_file_bytes', { path: 'public/unrar.wasm' });
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      cachedWasmBinary = (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength)
        ? (u8.buffer as ArrayBuffer)
        : (u8.slice().buffer as ArrayBuffer);
      return cachedWasmBinary;
    } catch {}
  }

  return undefined;
}

interface ComicImageEntry {
  name: string;
  getBytes: () => Promise<Uint8Array>;
}

/**
 * Loads a Comic Book Archive (.cbz, .cbr, .cbn, .zip) and converts it into a PDF Document buffer.
 * Transparently supports both ZIP-compressed (CBZ) and RAR-compressed (CBR) archives.
 */
export async function loadComicBookArchive(file: File): Promise<{ pdfBytes: Uint8Array; pageCount: number; coverDataUrl?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const imageExtensions = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;
  let comicEntries: ComicImageEntry[] = [];

  // 1. Try unpacking as ZIP (standard CBZ, or CBR renamed from ZIP)
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const zipImageEntries = Object.values(zip.files).filter((entry) => {
      if (entry.dir) return false;
      const cleanName = entry.name.replace(/\\/g, '/');
      const filename = cleanName.split('/').pop() || '';
      if (cleanName.includes('__MACOSX/') || filename.startsWith('.')) return false;
      return imageExtensions.test(cleanName);
    });

    if (zipImageEntries.length > 0) {
      comicEntries = zipImageEntries.map((entry) => ({
        name: entry.name.replace(/\\/g, '/'),
        getBytes: async () => {
          const u8 = await entry.async('uint8array');
          return (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength) ? u8 : u8.slice();
        },
      }));
    }
  } catch {
    // Not a ZIP archive; fallback to RAR extraction below
  }

  // 2. If no entries found via ZIP, try unpacking as RAR (standard CBR)
  if (comicEntries.length === 0) {
    try {
      const { createExtractorFromData } = await import('node-unrar-js');
      const wasmBinary = await getUnrarWasmBinary();
      const extractor = await createExtractorFromData({
        wasmBinary,
        data: arrayBuffer.slice(0),
      });
      const extracted = extractor.extract();
      const extractedFiles = [...extracted.files];

      const rarImageEntries = extractedFiles.filter((f) => {
        if (f.fileHeader.flags.directory) return false;
        const name = f.fileHeader.name.replace(/\\/g, '/');
        const filename = name.split('/').pop() || '';
        if (name.includes('__MACOSX/') || filename.startsWith('.')) return false;
        return imageExtensions.test(name);
      });

      if (rarImageEntries.length > 0) {
        comicEntries = rarImageEntries.map((f) => {
          const raw = f.extraction as Uint8Array;
          const safeBytes = raw
            ? (raw.byteOffset === 0 && raw.byteLength === raw.buffer.byteLength ? raw.slice() : new Uint8Array(raw))
            : new Uint8Array();
          return {
            name: f.fileHeader.name.replace(/\\/g, '/'),
            getBytes: async () => safeBytes,
          };
        });
      }
    } catch (rarErr) {
      console.warn('RAR extraction failed:', rarErr);
    }
  }

  if (comicEntries.length === 0) {
    throw new Error(`No supported comic page images found inside "${file.name}".`);
  }

  // Natural alphanumeric sort for page order (page1, page2, page10, etc.)
  comicEntries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  const pdfDoc = await PDFDocument.create();
  let coverDataUrl: string | undefined = undefined;

  for (let i = 0; i < comicEntries.length; i++) {
    // Cooperative yielding every 6 entries to keep UI responsive on large archives
    if (i % 6 === 0 && i > 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
    const entry = comicEntries[i];
    const rawImageBytes = await entry.getBytes();
    const cleanBytes = (rawImageBytes.byteOffset === 0 && rawImageBytes.byteLength === rawImageBytes.buffer.byteLength)
      ? rawImageBytes
      : rawImageBytes.slice();

    const detectedMime = detectImageMimeType(cleanBytes);
    let embeddedImage;

    if (detectedMime === 'image/jpeg') {
      try {
        embeddedImage = await pdfDoc.embedJpg(cleanBytes);
      } catch {
        const raster = await rasterizeImageBytes(cleanBytes, 'image/jpeg', true);
        embeddedImage = await pdfDoc.embedJpg(raster.bytes);
      }
    } else if (detectedMime === 'image/png') {
      try {
        embeddedImage = await pdfDoc.embedPng(cleanBytes);
      } catch {
        const raster = await rasterizeImageBytes(cleanBytes, 'image/png', true);
        embeddedImage = (raster.mime === 'image/jpeg')
          ? await pdfDoc.embedJpg(raster.bytes)
          : await pdfDoc.embedPng(raster.bytes);
      }
    } else {
      // WebP, GIF, BMP, etc. — rasterize to high-quality JPEG for 10x smaller footprint and instant baking
      const raster = await rasterizeImageBytes(cleanBytes, detectedMime, true);
      embeddedImage = (raster.mime === 'image/jpeg')
        ? await pdfDoc.embedJpg(raster.bytes)
        : await pdfDoc.embedPng(raster.bytes);
    }

    const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height,
    });

    // Capture lightweight cover thumbnail directly on first page without re-reading bytes
    if (i === 0) {
      try {
        const blob = new Blob([cleanBytes as unknown as BlobPart], { type: detectedMime });
        coverDataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.onerror = () => res('');
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Could not extract comic cover thumbnail:', err);
      }
    }
  }

  // Fast serialization with useObjectStreams: false skips heavy JS xref stream encoding
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return {
    pdfBytes,
    pageCount: comicEntries.length,
    coverDataUrl,
  };
}
