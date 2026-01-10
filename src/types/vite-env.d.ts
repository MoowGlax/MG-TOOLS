/// <reference types="vite/client" />

interface IElectronAPI {
  ping: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  saveCredentials: (key: string, value: string) => Promise<boolean>;
  getCredentials: (key: string) => Promise<string | null>;
  saveData: (key: string, value: unknown) => Promise<boolean>;
  getData: (key: string) => Promise<unknown>;
  
  // Advanced Settings
  openUserData: () => Promise<void>;
  resetConfig: () => Promise<boolean>;
  exportConfig: (mode?: 'clear' | 'encrypted') => Promise<boolean>;
  importConfig: () => Promise<boolean>;

  proxyRequest: (url: string, options: RequestInit & { timeout?: number }) => Promise<{ ok: boolean; status: number; data: unknown; headers?: Record<string, string>; error?: string }>;
  openExternal: (url: string) => Promise<void>;
  downloadFile: (url: string, filename: string, id: string, options?: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  copyLocalFile: (sourcePath: string, filename: string, id: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  onDownloadProgress: (callback: (data: { id: string, progress: number, total: number, downloaded: number, status?: string }) => void) => () => void;
  
  // Update API
  checkForUpdates: () => Promise<unknown>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (status: string, message?: string) => void) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;
  removeUpdateListeners: () => void;

  notify: (title: string, body: string) => Promise<void>;
  log: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;

  // Youtube API
  youtube: {
      checkBinaries: () => Promise<void>;
      getBinariesPath: () => Promise<string>;
      getInfo: (url: string) => Promise<any>;
      download: (url: string, options: DownloadOptions, id?: string) => Promise<{ success: boolean }>;
      cancel: (id?: string) => Promise<boolean>;
      openDownloads: () => Promise<string>;
      onBinaryProgress: (callback: (status: string) => void) => () => void;
      onDownloadProgress: (callback: (data: ProgressData) => void) => () => void;
  };

  // Synology API
  synology: {
      login: (url: string, user: string, pass: string) => Promise<boolean>;
    getSystemData: () => Promise<any>;
    executeAction: (action: 'reboot' | 'shutdown') => Promise<boolean>;
    openSsh: (user: string, host: string) => Promise<void>;
  };

  // SSH API
  ssh: {
    connect: (sessionId: string, config: { host: string; port?: number; username: string; password?: string; privateKey?: string }) => Promise<void>;
    write: (sessionId: string, data: string) => Promise<void>;
    resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
    disconnect: (sessionId: string) => Promise<void>;
    onData: (callback: (sessionId: string, data: string) => void) => () => void;
    onStatus: (callback: (sessionId: string, status: string) => void) => () => void;
    onError: (callback: (sessionId: string, error: string) => void) => () => void;
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
