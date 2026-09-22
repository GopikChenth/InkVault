import { Layers, GraduationCap, BookOpen, LucideIcon } from 'lucide-react';
import { AppMode } from '../types';

export * from './studio';
export * from './study';
export * from './reader';

export interface WorkflowModeConfig {
  id: AppMode;
  name: string;
  tag: string;
  icon: LucideIcon;
  shortcut: string;
  accentColor: string;
  headerLabel: string;
  actionLabel: string;
  description: string;
}

export const WORKFLOW_MODES: WorkflowModeConfig[] = [
  {
    id: 'editor',
    name: 'Studio Editor',
    tag: 'Suite',
    icon: Layers,
    shortcut: '⌘1',
    accentColor: '#6366f1',
    headerLabel: 'Open Studio',
    actionLabel: 'Launch Studio Editor',
    description: 'Next-generation offline document suite. Merge, split, compress, and protect complex multi-page PDF stacks with native vector rendering and zero cloud telemetry.',
  },
  {
    id: 'study',
    name: 'Study Mode',
    tag: 'Deep Focus',
    icon: GraduationCap,
    shortcut: '⌘2',
    accentColor: '#10b981',
    headerLabel: 'Open Study Mode',
    actionLabel: 'Launch Study Mode',
    description: 'Distraction-free academic and research reader with integrated Pomodoro timer, contextual search lookup, smart highlighter, and focused comprehension.',
  },
  {
    id: 'reader',
    name: 'Books & Comics',
    tag: 'Zen Reader',
    icon: BookOpen,
    shortcut: '⌘3',
    accentColor: '#e11d48',
    headerLabel: 'Open Books & Comics',
    actionLabel: 'Launch Books & Comics',
    description: 'Immersive reader tailored for EPUB books, CBZ and CBR comics, and graphic novels with dual-page spreads, soft eye-care paper tints, and distraction-free page turns.',
  },
];
