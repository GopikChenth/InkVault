import { LucideIcon } from 'lucide-react';

export type StudioToolId = 'organize' | 'merge' | 'split' | 'compress' | 'bates' | 'watermark' | 'flatten' | 'protect' | 'sign' | 'forms';

export interface StudioToolItem {
  id: StudioToolId;
  label: string;
  icon: LucideIcon;
  description?: string;
}
