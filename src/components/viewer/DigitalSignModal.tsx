import React, { useState, useRef } from 'react';
import { 
  X, 
  Award, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  Download, 
  ArrowRight 
} from 'lucide-react';
import { LoadedPDF } from '../../types';
import { nativeSignPDF } from '../../utils/nativePdfBridge';

interface DigitalSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: LoadedPDF;
  currentPage: number;
  onDocumentUpdated?: (newDoc: LoadedPDF) => void;
}

export default function DigitalSignModal({
  isOpen,
  onClose,
  doc,
  currentPage,
  onDocumentUpdated,
}: DigitalSignModalProps) {
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('I approve this document');
  const [location, setLocation] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [targetPage, setTargetPage] = useState<number>(currentPage || 1);
  const [signaturePosition, setSignaturePosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'invisible'>('bottom-right');
  const [signing, setSigning] = useState<boolean>(false);
  const [signedDoc, setSignedDoc] = useState<LoadedPDF | null>(null);

  const certInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCertFile(files[0]);
    }
  };

  const getPositionRect = (): [number, number, number, number] | undefined => {
    if (signaturePosition === 'invisible') return undefined;
    switch (signaturePosition) {
      case 'bottom-right':
        return [360, 40, 560, 100];
      case 'bottom-left':
        return [40, 40, 240, 100];
      case 'top-right':
        return [360, 680, 560, 740];
      default:
        return [360, 40, 560, 100];
    }
  };

  const handleSign = async () => {
    if (!certFile) {
      alert('Please upload a PKCS #12 certificate (.p12 / .pfx).');
      return;
    }

    setSigning(true);
    try {
      const rect = getPositionRect();
      const outputBytes = await nativeSignPDF(
        doc.file,
        doc.name,
        {
          certFile,
          certPassword,
          page: Math.max(0, targetPage - 1),
          rect,
          reason: reason || undefined,
          location: location || undefined,
          contact: contact || undefined,
        },
        doc.filePath
      );

      if (!outputBytes) {
        throw new Error('Signing returned no output. Check certificate credentials.');
      }

      const blob = new Blob([outputBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = doc.name.replace(/\.pdf$/i, '') + '_Signed.pdf';

      const updated: LoadedPDF = {
        id: `${Date.now()}-${outputName}`,
        name: outputName,
        size: (outputBytes.length / (1024 * 1024)).toFixed(1) + ' MB',
        rawSize: outputBytes.length,
        blobUrl,
        file: new File([blob], outputName, { type: 'application/pdf' }),
        loadedAt: new Date(),
        pageCount: doc.pageCount,
        currentPage: targetPage,
      };

      setSignedDoc(updated);
      if (onDocumentUpdated) {
        onDocumentUpdated(updated);
      }
    } catch (err) {
      console.error('Digital signing error:', err);
      alert(`Digital signing failed: ${err instanceof Error ? err.message : 'Please check certificate passphrase.'}`);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <input
        ref={certInputRef}
        type="file"
        accept=".p12,.pfx,application/x-pkcs12"
        onChange={handleCertChange}
        className="hidden"
      />

      <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Digital Sign Document</h3>
              <p className="text-[10px] font-mono text-zinc-400">PAdES B-B Certificate Signing (ISO 32000-2)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg hover:bg-card text-zinc-400 hover:text-zinc-600 transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          
          {!signedDoc ? (
            <>
              {/* Step 1: Certificate */}
              <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    1. Certificate Key (.p12 / .pfx)
                  </span>
                  <button
                    type="button"
                    onClick={() => certInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-border bg-card hover:bg-surface flex items-center gap-1.5 transition-colors"
                  >
                    <KeyRound className="h-3 w-3 text-accent" />
                    <span>{certFile ? 'Change File' : 'Select Certificate'}</span>
                  </button>
                </div>

                {certFile && (
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span className="truncate">{certFile.name}</span>
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="Enter certificate password..."
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 2: Metadata */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Reason for Signing
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. I approve this document"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. New York, NY"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Contact / Email (Optional)
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="e.g. legal@example.com"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Target Page
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetPage}
                      onChange={(e) => setTargetPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Signature Appearance
                    </label>
                    <select
                      value={signaturePosition}
                      onChange={(e) => setSignaturePosition(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="invisible">Invisible Stamp</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSign}
                disabled={signing || !certFile}
                className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-bold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-40"
              >
                {signing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Signing with PAdES B-B...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Sign Document</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Signed Success */
            <div className="flex flex-col gap-4 text-center py-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Document Cryptographically Sealed</h4>
                <p className="text-xs text-zinc-500 font-mono mt-1">PAdES B-B detached signature created successfully</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = signedDoc.blobUrl;
                    a.download = signedDoc.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>Continue in Viewer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
