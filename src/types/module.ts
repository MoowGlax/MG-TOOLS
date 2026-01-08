import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  version: string;
  isEnabled: boolean;
}

export interface ModuleProps {
  config: ModuleConfig;
}

export interface IModule {
  config: ModuleConfig;
  component: ReactNode;
}
