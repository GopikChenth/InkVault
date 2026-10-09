import { LucideIcon } from 'lucide-react';

export type StudioToolId = 'merge' | 'split' | 'compress' | 'watermark' | 'protect' | 'sign' | 'forms';

export interface StudioToolItem {
  id: StudioToolId;
  label: string;
  icon: LucideIcon;
  description?: string;
}
