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

  notify: (title: string, body: string) => Promise<void>;

  // Youtube API
  youtube: {
      checkBinaries: () => Promise<void>;
      getInfo: (url: string) => Promise<any>;
      download: (url: string, options: DownloadOptions) => Promise<{ success: boolean }>;
      cancel: () => Promise<boolean>;
      openDownloads: () => Promise<string>;
      onBinaryProgress: (callback: (status: string) => void) => () => void;
      onDownloadProgress: (callback: (data: ProgressData) => void) => () => void;
  };
}

interface DownloadOptions {
  format: 'mp3' | 'mp4';
  quality: string;
}

interface ProgressData {
    percent: number;
    current?: number;
    total?: number;
    eta?: string;
  }

interface Window {
  electronAPI: IElectronAPI;
}
