import { invoke } from '@tauri-apps/api/core';

export interface PDFInputPayload {
  name: string;
  path?: string;
  bytes?: number[];
}

/**
 * Checks if running inside the native Tauri desktop environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function fileToBytes(file: File): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
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
      const bytes = f.path ? undefined : await fileToBytes(f.file);
      items.push({
        name: f.name,
        path: f.path,
        bytes,
      });
    }
    const output = await invoke<number[]>('native_merge', { items });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const output = await invoke<number[]>('native_split', {
      item,
      pageIndices,
    });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const output = await invoke<number[]>('native_protect', {
      item,
      userPassword: userPassword || null,
      ownerPassword: ownerPassword || null,
      allowPrint,
      allowCopy,
    });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const output = await invoke<number[]>('native_compress', {
      item,
      preset,
    });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const output = await invoke<number[]>('native_sanitize', {
      item,
    });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const certBytes = options.certPath ? undefined : await fileToBytes(options.certFile);
    const certPayload: PDFInputPayload = {
      name: options.certFile.name,
      path: options.certPath,
      bytes: certBytes,
    };
    const output = await invoke<number[]>('native_sign', {
      item,
      certPayload,
      certPassword: options.certPassword,
      page: options.page ?? 0,
      rect: options.rect ?? null,
      reason: options.reason || null,
      location: options.location || null,
      contact: options.contact || null,
    });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const output = await invoke<number[]>('native_redact', {
      item,
      page,
      rects,
      overlayText: overlayText || null,
    });
    return new Uint8Array(output);
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
    const bytes = path ? undefined : await fileToBytes(file);
    const item: PDFInputPayload = { name, path, bytes };
    const output = await invoke<number[]>('native_create_forms', {
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
    return new Uint8Array(output);
  } catch (err) {
    console.warn('[InkVault Engine] Native create forms failed:', err);
    return null;
  }
}

