import { invoke } from '@tauri-apps/api/core';

export interface PDFInputPayload {
  name: string;
  path?: string;
  bytes?: Uint8Array | number[];
}

/**
 * Checks if running inside the native Tauri desktop environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Resolves the absolute disk path of a File if available in the Tauri desktop environment
 */
export function resolveFilePath(file?: File, explicitPath?: string): string | undefined {
  if (explicitPath && typeof explicitPath === 'string' && explicitPath.trim().length > 0) {
    return explicitPath.trim();
  }
  if (file && 'path' in file && typeof (file as any).path === 'string' && (file as any).path.trim().length > 0) {
    return (file as any).path.trim();
  }
  return undefined;
}

/**
 * High-performance binary byte reader avoiding intermediate JS number array allocation
 */
export async function fileToBytes(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

function toUint8Array(output: ArrayBuffer | Uint8Array | number[]): Uint8Array {
  if (output instanceof Uint8Array) {
    return output;
  }
  if (output instanceof ArrayBuffer) {
    return new Uint8Array(output);
  }
  return new Uint8Array(output);
}

/**
 * High-performance Native Rust PDF Merge powered by ArcadeLabs InkVault Engine
 */
export async function nativeMergePDFs(
  files: { file: File; name: string; path?: string }[]
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const items: PDFInputPayload[] = [];
    for (const f of files) {
      const resolvedPath = resolveFilePath(f.file, f.path);
      const bytes = resolvedPath ? undefined : await fileToBytes(f.file);
      items.push({
        name: f.name,
        path: resolvedPath,
        bytes,
      });
    }
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_merge', { items });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native merge failed, falling back to client-side:', err);
    return null;
  }
}

/**
 * High-performance Native Rust PDF Split & Page Extractor
 */
export async function nativeSplitPDF(
  file: File,
  name: string,
  pageIndices: number[],
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_split', {
      item,
      pageIndices,
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native split failed, falling back to client-side:', err);
    return null;
  }
}

/**
 * Genuine Standard Security AES-256 PDF Encryption with User & Owner Passwords
 */
export async function nativeProtectPDF(
  file: File,
  name: string,
  userPassword?: string,
  ownerPassword?: string,
  allowPrint: boolean = true,
  allowCopy: boolean = true,
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_protect', {
      item,
      userPassword: userPassword || null,
      ownerPassword: ownerPassword || null,
      allowPrint,
      allowCopy,
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native protect failed, falling back to client-side:', err);
    return null;
  }
}

/**
 * Native PDF Optimization: Bicubic downsampling, Flate cleanup, and object stream compression
 */
export async function nativeCompressPDF(
  file: File,
  name: string,
  preset: 'lossless' | 'balanced' | 'extreme',
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_compress', {
      item,
      preset,
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native compress failed, falling back to client-side:', err);
    return null;
  }
}

/**
 * Native PDF Sanitization: Strips hidden metadata, private annotations, and scripts
 */
export async function nativeSanitizePDF(
  file: File,
  name: string,
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_sanitize', {
      item,
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native sanitize failed:', err);
    return null;
  }
}

export interface DigitalSignOptions {
  certFile: File;
  certPassword: string;
  certPath?: string;
  page?: number; // 0-based
  rect?: [number, number, number, number]; // [x0, y0, x1, y1]
  reason?: string;
  location?: string;
  contact?: string;
}

/**
 * PAdES B-B Digital Signing powered by native inkvault-sign engine
 */
export async function nativeSignPDF(
  file: File,
  name: string,
  options: DigitalSignOptions,
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const resolvedCertPath = resolveFilePath(options.certFile, options.certPath);
    const certBytes = resolvedCertPath ? undefined : await fileToBytes(options.certFile);
    const certPayload: PDFInputPayload = {
      name: options.certFile.name,
      path: resolvedCertPath,
      bytes: certBytes,
    };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_sign', {
      item,
      certPayload,
      certPassword: options.certPassword,
      page: options.page ?? 0,
      rect: options.rect ?? null,
      reason: options.reason || null,
      location: options.location || null,
      contact: options.contact || null,
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native sign failed:', err);
    return null;
  }
}

/**
 * True Stream Redaction: Permanently strips text glyphs, vectors, and image pixels via native inkvault-redact engine
 */
export async function nativeRedactPDF(
  file: File,
  name: string,
  page: number,
  rects: [number, number, number, number][],
  overlayText?: string,
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_redact', {
      item,
      page,
      rects,
      overlayText: overlayText || null,
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native redact failed:', err);
    return null;
  }
}

export interface FormFieldPayload {
  page: number;
  rect: [number, number, number, number];
  kind: string; // 'text' | 'multiline' | 'checkbox' | 'radio' | 'dropdown' | 'date' | 'button'
  name?: string;
  options?: string[];
  defaultValue?: string;
}

/**
 * AcroForm Interactive Forms: Author real form fields with appearance regeneration via native inkvault-forms engine
 */
export async function nativeCreateForms(
  file: File,
  name: string,
  fields: FormFieldPayload[],
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_create_forms', {
      item,
      fields: fields.map((f) => ({
        page: f.page,
        rect: f.rect,
        kind: f.kind,
        name: f.name || null,
        options: f.options || null,
        default_value: f.defaultValue || null,
      })),
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native create forms failed:', err);
    return null;
  }
}

export interface WatermarkOptions {
  text: string;
  pages?: number[];
  fontSize?: number;
  colorRgb?: [number, number, number];
  opacity?: number;
  rotation?: number;
  behind?: boolean;
  offset?: [number, number];
}

/**
 * High-performance Native Rust Watermarking powered by inkvault-edit engine
 */
export async function nativeWatermarkPDF(
  file: File,
  name: string,
  options: WatermarkOptions,
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_watermark', {
      item,
      wm: {
        text: options.text,
        pages: options.pages ?? null,
        font_size: options.fontSize ?? null,
        color_rgb: options.colorRgb ?? null,
        opacity: options.opacity ?? null,
        rotation: options.rotation ?? null,
        behind: options.behind ?? null,
        offset: options.offset ?? null,
      },
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native watermark failed:', err);
    return null;
  }
}

export interface PageOrganizeItem {
  pageIndex: number;
  rotationDelta?: number;
}

/**
 * High-performance Native Rust Page Organization (reorder, rotate, delete) powered by inkvault-organize
 */
export async function nativeOrganizePDF(
  file: File,
  name: string,
  actions: PageOrganizeItem[],
  path?: string
): Promise<Uint8Array | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const resolvedPath = resolveFilePath(file, path);
    const bytes = resolvedPath ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path: resolvedPath, bytes };
    const output = await invoke<ArrayBuffer | Uint8Array | number[]>('native_organize', {
      item,
      actions: actions.map((a) => ({
        page_index: a.pageIndex,
        rotation_delta: a.rotationDelta ?? null,
      })),
    });
    return toUint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native organize failed:', err);
    return null;
  }
}
