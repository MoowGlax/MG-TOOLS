/// <reference types="vite/client" />

interface IElectronAPI {
  ping: () => Promise<string>;
  saveCredentials: (key: string, value: string) => Promise<boolean>;
  getCredentials: (key: string) => Promise<string | null>;
  saveData: (key: string, value: unknown) => Promise<boolean>;
  getData: (key: string) => Promise<unknown>;
  proxyRequest: (url: string, options: RequestInit & { timeout?: number }) => Promise<{ ok: boolean; status: number; data: unknown; headers?: Record<string, string>; error?: string }>;
  
  // Update API
  checkForUpdates: () => Promise<unknown>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (status: string, message?: string) => void) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;
  removeUpdateListeners: () => void;
}

interface Window {
  electronAPI: IElectronAPI;
}
