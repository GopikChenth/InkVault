import { LucideIcon } from 'lucide-react';

export type StudioToolId = 'merge' | 'split' | 'compress' | 'watermark' | 'protect';

export interface StudioToolItem {
  id: StudioToolId;
  label: string;
  icon: LucideIcon;
  description?: string;
}
