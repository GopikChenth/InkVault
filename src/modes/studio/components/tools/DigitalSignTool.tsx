import React, { useState, useRef, useCallback } from 'react';
import { 
  Award, 
  FolderOpen, 
  Download, 
  Check, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { LoadedPDF } from '../../../../types';
import EmptyState from '../../../../components/EmptyState';
import { nativeSignPDF } from '../../../../utils/nativePdfBridge';

interface DigitalSignToolProps {
  initialDoc: LoadedPDF | null;
  onOpenSignedDoc: (doc: LoadedPDF) => void;
}

export default function DigitalSignTool({ initialDoc, onOpenSignedDoc }: DigitalSignToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('I approve this document');
  const [location, setLocation] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [targetPage, setTargetPage] = useState<number>(1);
  const [signaturePosition, setSignaturePosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'invisible'>('bottom-right');
  const [signing, setSigning] = useState<boolean>(false);
  const [signedResult, setSignedResult] = useState<LoadedPDF | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSignedResult(null);
    }
  };

  const handleCertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCertFile(files[0]);
    }
  };

  const getPositionRect = (): [number, number, number, number] | undefined => {
    if (signaturePosition === 'invisible') return undefined;
    // Standard signature block is ~200 pt wide by 60 pt tall
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

  const handleSign = useCallback(async () => {
    if (!doc) return;
    if (!certFile) {
      alert('Please upload a PKCS #12 certificate file (.p12 or .pfx).');
      return;
    }

    setSigning(true);
    try {
      const rect = getPositionRect();
      const nativeResult = await nativeSignPDF(
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

      if (!nativeResult) {
        throw new Error('Digital signing returned no bytes. Verify certificate password.');
      }

      const blob = new Blob([nativeResult.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = doc.name.replace(/\.pdf$/i, '') + '_Signed.pdf';

      const result: LoadedPDF = {
        id: `${Date.now()}-${outputName}`,
        name: outputName,
        size: formatSize(nativeResult.length),
        rawSize: nativeResult.length,
        blobUrl,
        file: new File([blob], outputName, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      setSignedResult(result);
    } catch (err) {
      console.error('Error in digital signing:', err);
      alert(`Digital signing failed: ${err instanceof Error ? err.message : 'Please check certificate password and format.'}`);
    } finally {
      setSigning(false);
    }
  }, [doc, certFile, certPassword, targetPage, signaturePosition, reason, location, contact]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden">
      
      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleDocChange}
        className="hidden"
      />
      <input
        ref={certInputRef}
        type="file"
        accept=".p12,.pfx,application/x-pkcs12"
        onChange={handleCertChange}
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="h-12 border-b border-border bg-surface dark:bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <Award className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Digital Signatures</h2>
            <p className="text-[10px] font-mono text-zinc-400">
              PAdES B-B cryptographic signing with PKCS #12 (.p12 / .pfx) & X.509
            </p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-card border border-border hover:bg-card text-xs font-semibold transition-colors shadow-sm"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{doc ? 'Change File' : 'Select PDF'}</span>
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center">
        {!doc ? (
          <EmptyState
            icon={Award}
            title="Select a PDF to Digitally Sign"
            description="Apply legally compliant PAdES B-B digital signatures using private keys and digital certificates."
            actionLabel="Browse PDF"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="max-w-2xl w-full flex flex-col gap-6">
            
            {/* Active Document Info Card */}
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-sm">
                    {doc.name}
                  </h4>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                    File Size: <span className="font-bold text-zinc-700 dark:text-zinc-300">{doc.size}</span>
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2 py-1 rounded bg-surface border border-border text-zinc-500">
                PAdES B-B Ready
              </span>
            </div>

            {/* Certificate Upload Card */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    1. Digital Certificate (PKCS #12)
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    Select a .p12 or .pfx certificate file with your private signing key
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => certInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-card text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <KeyRound className="h-3.5 w-3.5 text-accent" />
                  <span>{certFile ? 'Change Certificate' : 'Choose .p12 / .pfx'}</span>
                </button>
              </div>

              {certFile && (
                <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{certFile.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0">{formatSize(certFile.size)}</span>
                </div>
              )}

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Certificate Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="Enter passphrase to unlock private key..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Signature Metadata Card */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                2. Signature Metadata & Intent
              </h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Reason for Signing
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. I approve this document"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    'I approve this document',
                    'I am the author of this document',
                    'Contract Review & Acceptance',
                    'Verified Authentic Copy'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border hover:border-accent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Signing Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Contact / Email (Optional)
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. signer@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Page & Appearance Placement */}
              <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Target Page (1-Indexed)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetPage}
                    onChange={(e) => setTargetPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Signature Appearance
                  </label>
                  <select
                    value={signaturePosition}
                    onChange={(e) => setSignaturePosition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  >
                    <option value="bottom-right">Visible: Bottom Right</option>
                    <option value="bottom-left">Visible: Bottom Left</option>
                    <option value="top-right">Visible: Top Right</option>
                    <option value="invisible">Invisible Certification</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Run Digital Sign Action Button */}
            {!signedResult && (
              <button
                onClick={handleSign}
                disabled={signing || !certFile}
                className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-bold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {signing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Signing document with PAdES B-B...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Cryptographically Sign & Seal Document</span>
                  </>
                )}
              </button>
            )}

            {/* Results Card */}
            {signedResult && (
              <div className="p-5 rounded-2xl bg-card border border-emerald-500/30 dark:border-emerald-500/20 shadow-md flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-xs font-bold">Document Signed & Sealed (PAdES B-B)</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    X.509 Cryptographic Stamp
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Document has been signed with SHA-256 CMS detached signature in compliance with ISO 32000-2 §12.8 and ETSI EN 319 142.
                </p>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = signedResult.blobUrl;
                      a.download = signedResult.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Signed PDF</span>
                  </button>

                  <button
                    onClick={() => onOpenSignedDoc(signedResult)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <span>Open in Viewer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
