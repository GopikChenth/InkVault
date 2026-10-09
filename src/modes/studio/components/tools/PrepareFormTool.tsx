import React, { useState, useRef, useCallback } from 'react';
import { 
  FormInput, 
  FolderOpen, 
  Download, 
  Plus, 
  Trash2, 
  FileText, 
  ArrowRight,
  Type,
  CheckSquare,
  CircleDot,
  Calendar,
  ChevronDown,
  Sparkles,
  Layers
} from 'lucide-react';
import { LoadedPDF } from '../../../../types';
import EmptyState from '../../../../components/EmptyState';
import { nativeCreateForms, FormFieldPayload } from '../../../../utils/nativePdfBridge';

interface PrepareFormToolProps {
  initialDoc: LoadedPDF | null;
  onOpenFormDoc: (doc: LoadedPDF) => void;
}

export default function PrepareFormTool({ initialDoc, onOpenFormDoc }: PrepareFormToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [fields, setFields] = useState<FormFieldPayload[]>([]);
  
  // New field draft state
  const [selectedKind, setSelectedKind] = useState<string>('text');
  const [fieldName, setFieldName] = useState<string>('Text_Field_1');
  const [targetPage, setTargetPage] = useState<number>(1);
  const [optionsStr, setOptionsStr] = useState<string>('Option 1, Option 2, Option 3');
  const [placementPreset, setPlacementPreset] = useState<'top' | 'middle' | 'bottom' | 'full'>('top');

  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedDoc, setGeneratedDoc] = useState<LoadedPDF | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
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
      setFields([]);
      setGeneratedDoc(null);
    }
  };

  const computeRect = (preset: 'top' | 'middle' | 'bottom' | 'full', kind: string): [number, number, number, number] => {
    const isCheckboxOrRadio = kind === 'checkbox' || kind === 'radio';
    if (isCheckboxOrRadio) {
      switch (preset) {
        case 'top': return [50, 700, 70, 720];
        case 'middle': return [50, 400, 70, 420];
        case 'bottom': return [50, 100, 70, 120];
        default: return [50, 700, 70, 720];
      }
    }
    const height = kind === 'multiline' ? 80 : 25;
    switch (preset) {
      case 'top': return [50, 680, 350, 680 + height];
      case 'middle': return [50, 380, 350, 380 + height];
      case 'bottom': return [50, 80, 350, 80 + height];
      case 'full': return [50, 300, 500, 300 + height];
    }
  };

  const handleAddField = () => {
    const pageIndex = Math.max(0, targetPage - 1);
    const rect = computeRect(placementPreset, selectedKind);
    const parsedOptions = selectedKind === 'dropdown'
      ? optionsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const newField: FormFieldPayload = {
      page: pageIndex,
      rect,
      kind: selectedKind,
      name: fieldName.trim() || `Field_${fields.length + 1}`,
      options: parsedOptions,
    };

    setFields((prev) => [...prev, newField]);

    // Advance default field name
    const nextIdx = fields.length + 2;
    setFieldName(`Field_${nextIdx}`);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateForms = useCallback(async () => {
    if (!doc) return;
    if (fields.length === 0) {
      alert('Please add at least 1 interactive form field to author.');
      return;
    }

    setGenerating(true);
    try {
      const outputBytes = await nativeCreateForms(
        doc.file,
        doc.name,
        fields,
        doc.filePath
      );

      if (!outputBytes) {
        throw new Error('AcroForm generation returned no bytes.');
      }

      const blob = new Blob([outputBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = doc.name.replace(/\.pdf$/i, '') + '_Form.pdf';

      const result: LoadedPDF = {
        id: `${Date.now()}-${outputName}`,
        name: outputName,
        size: formatSize(outputBytes.length),
        rawSize: outputBytes.length,
        blobUrl,
        file: new File([blob], outputName, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      setGeneratedDoc(result);
    } catch (err) {
      console.error('Error creating AcroForm fields:', err);
      alert('Failed to generate interactive form fields.');
    } finally {
      setGenerating(false);
    }
  }, [doc, fields]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden">
      
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleDocChange}
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="h-12 border-b border-border bg-surface dark:bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <FormInput className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Prepare Interactive Form</h2>
            <p className="text-[10px] font-mono text-zinc-400">
              AcroForm authoring palette with real field widgets & appearance regeneration
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center">
        {!doc ? (
          <EmptyState
            icon={FormInput}
            title="Select a PDF to Prepare Form Fields"
            description="Create interactive AcroForm text inputs, checkboxes, dropdowns, and buttons for fillable PDF documents."
            actionLabel="Browse PDF"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Authoring Palette */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Field Types Grid */}
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-3 shadow-sm">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Select Field Type to Author
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'text', label: 'Text Field', icon: Type, desc: 'Single-line' },
                    { id: 'multiline', label: 'Text Area', icon: FileText, desc: 'Multi-line' },
                    { id: 'checkbox', label: 'Checkbox', icon: CheckSquare, desc: 'Toggle box' },
                    { id: 'radio', label: 'Radio Button', icon: CircleDot, desc: 'Group select' },
                    { id: 'dropdown', label: 'Dropdown', icon: ChevronDown, desc: 'Combo list' },
                    { id: 'date', label: 'Date Field', icon: Calendar, desc: 'ISO Date' },
                  ].map((f) => {
                    const Icon = f.icon;
                    const isSelected = selectedKind === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedKind(f.id)}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/5 text-zinc-900 dark:text-zinc-100 ring-1 ring-accent'
                            : 'border-border bg-surface hover:border-zinc-400 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          <Icon className="h-3.5 w-3.5 text-accent" />
                          <span>{f.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field Properties Config */}
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-3 shadow-sm">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Field Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Field Name (Identifier)
                    </label>
                    <input
                      type="text"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      placeholder="e.g. Full_Name"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Page Placement
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetPage}
                      onChange={(e) => setTargetPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {selectedKind === 'dropdown' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Dropdown Options (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={optionsStr}
                      onChange={(e) => setOptionsStr(e.target.value)}
                      placeholder="Option A, Option B, Option C"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Position on Page
                  </label>
                  <select
                    value={placementPreset}
                    onChange={(e) => setPlacementPreset(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  >
                    <option value="top">Top Header Zone</option>
                    <option value="middle">Middle Form Body</option>
                    <option value="bottom">Bottom Footer Zone</option>
                    <option value="full">Full Width Center</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddField}
                  className="mt-1 py-2 rounded-lg bg-surface border border-border hover:bg-card text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5 text-accent" />
                  <span>Add Field to Document</span>
                </button>
              </div>

            </div>

            {/* Right Column: Queued Fields & Generate Action */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-3 shadow-sm min-h-[220px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Authored Fields ({fields.length})
                  </span>
                  {fields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFields([])}
                      className="text-[11px] text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {fields.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                    <Layers className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-semibold">No fields added yet</p>
                    <p className="text-[10px] font-mono mt-0.5">Use the palette on the left to add interactive inputs</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {fields.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono uppercase font-bold text-zinc-600 dark:text-zinc-300">
                            {f.kind}
                          </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {f.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-mono text-zinc-400">P.{f.page + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(idx)}
                            className="text-zinc-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!generatedDoc ? (
                <button
                  type="button"
                  onClick={handleGenerateForms}
                  disabled={generating || fields.length === 0}
                  className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-bold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-40"
                >
                  {generating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Generating AcroForm tree...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Bake & Generate AcroForm PDF</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-card border border-emerald-500/30 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-xs font-bold">Interactive Form Ready</span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ISO 32000-2 AcroForm
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = generatedDoc.blobUrl;
                        a.download = generatedDoc.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="flex-1 py-2 rounded-lg border border-border hover:bg-surface text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => onOpenFormDoc(generatedDoc)}
                      className="flex-1 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Open in Viewer</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}
      </div>

    </div>
  );
}
