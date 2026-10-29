import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, Check, Sparkles } from 'lucide-react';
import { StudySubject } from '../../../types';

interface SubjectFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Omit<StudySubject, 'id' | 'createdAt'>) => void;
  existingSubjects?: StudySubject[];
}

const SUBJECT_PRESETS = [
  'Mathematics',
  'Physics',
  'Computer Science',
  'Biology',
  'Chemistry',
  'World History',
  'Literature',
  'Economics',
  'Law & Ethics',
  'Engineering',
  'Psychology',
  'Philosophy',
];

const COLOR_PALETTE = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Orange', value: '#f97316' },
];

export default function SubjectFolderModal({
  isOpen,
  onClose,
  onSave,
  existingSubjects = [],
}: SubjectFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      // Cycle to a default color not heavily used
      const usedColors = new Set(existingSubjects.map((s) => s.color));
      const unused = COLOR_PALETTE.find((c) => !usedColors.has(c.value));
      setSelectedColor(unused ? unused.value : COLOR_PALETTE[0].value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, existingSubjects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      color: selectedColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-card border border-border [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface/80">
          <div className="flex items-center gap-2.5">
            <div 
              className="h-8 w-8 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] flex items-center justify-center shadow-xs text-white"
              style={{ backgroundColor: selectedColor }}
            >
              <FolderPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 font-sans">
                <span className="text-accent font-black text-[9px]">▶</span>
                <span>Add Study Subject</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Subject Name Input */}
          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Subject Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Advanced Calculus, Machine Learning"
              className="w-full px-3 py-2 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] border border-border bg-surface dark:bg-background text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-accent"
              maxLength={40}
            />
          </div>

          {/* Quick Preset Suggestions */}
          <div className="space-y-1.5 font-mono">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent" /> Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {SUBJECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className={`text-[11px] px-2.5 py-1 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] border transition-all cursor-pointer ${
                    name === preset
                      ? 'border-accent bg-accent/15 text-accent font-bold'
                      : 'border-border bg-surface/60 hover:bg-surface text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
              Folder Color
            </label>
            <div className="flex items-center gap-2.5">
              {COLOR_PALETTE.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  title={col.name}
                  onClick={() => setSelectedColor(col.value)}
                  style={{ backgroundColor: col.value }}
                  className="h-6 w-6 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] flex items-center justify-center text-white transition-transform hover:scale-110 shadow-xs cursor-pointer"
                >
                  {selectedColor === col.value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)] text-xs font-bold hover:bg-surface border border-border transition-colors text-zinc-600 dark:text-zinc-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))] bg-accent text-accent-on text-xs font-bold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Save Subject</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
