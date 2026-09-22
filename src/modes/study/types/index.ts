export interface StudySubject {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  icon?: string;
  folderPath?: string;
}

export type StudyExplorerView = 'tree' | 'cards';

export interface TauriFolderScanResult {
  folder_name: string;
  folder_path: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    bytes: number[];
  }>;
}

export type {
  PomodoroPhase,
  PomodoroSettings,
  PomodoroPrompt,
  PomodoroContextType,
} from '../context/PomodoroContext';
