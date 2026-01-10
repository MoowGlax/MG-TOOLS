import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  saveCredentials: (key: string, value: string) => ipcRenderer.invoke('save-credentials', key, value),
  getCredentials: (key: string) => ipcRenderer.invoke('get-credentials', key),
  saveData: (key: string, value: any) => ipcRenderer.invoke('save-data', key, value),
  getData: (key: string) => ipcRenderer.invoke('get-data', key),
  proxyRequest: (url: string, options: RequestInit) => ipcRenderer.invoke('proxy-request', url, options),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  downloadFile: (url: string, filename: string, id: string, options?: any) => ipcRenderer.invoke('download-file', url, filename, id, options),
  copyLocalFile: (sourcePath: string, filename: string, id: string) => ipcRenderer.invoke('copy-local-file', sourcePath, filename, id),
  onDownloadProgress: (callback: (data: { id: string, progress: number, total: number, downloaded: number }) => void) => {
      const wrapper = (_event: any, data: any) => callback(data);
      ipcRenderer.on('download-progress', wrapper);
      return () => ipcRenderer.removeListener('download-progress', wrapper);
  },
  
  // Update API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  notify: (title: string, body: string) => ipcRenderer.invoke('app:notify', title, body),
  log: (level: string, message: string) => ipcRenderer.invoke('log', level, message),
  onUpdateStatus: (callback: (status: string, message?: string) => void) => {
      const wrapper = (_event: any, status: string, message?: string) => callback(status, message);
      ipcRenderer.on('update-status', wrapper);
      return () => ipcRenderer.removeListener('update-status', wrapper);
  },
  onUpdateProgress: (callback: (percent: number) => void) => {
      const wrapper = (_event: any, percent: number) => callback(percent);
      ipcRenderer.on('update-download-progress', wrapper);
      return () => ipcRenderer.removeListener('update-download-progress', wrapper);
  },
  removeUpdateListeners: () => {
      ipcRenderer.removeAllListeners('update-status');
      ipcRenderer.removeAllListeners('update-download-progress');
  },

  // Youtube API
  youtube: {
      checkBinaries: () => ipcRenderer.invoke('youtube:check-binaries'),
      getBinariesPath: () => ipcRenderer.invoke('youtube:get-binaries-path'),
      getInfo: (url: string) => ipcRenderer.invoke('youtube:get-info', url),
      download: (url: string, options: any, id?: string) => ipcRenderer.invoke('youtube:download', url, options, id),
      cancel: (id?: string) => ipcRenderer.invoke('youtube:cancel', id),
      openDownloads: () => ipcRenderer.invoke('youtube:open-downloads'),
      onBinaryProgress: (callback: (status: string) => void) => {
          const wrapper = (_event: any, status: string) => callback(status);
          ipcRenderer.on('youtube:binary-progress', wrapper);
          return () => ipcRenderer.removeListener('youtube:binary-progress', wrapper);
      },
      onDownloadProgress: (callback: (data: any) => void) => {
          const wrapper = (_event: any, data: any) => callback(data);
          ipcRenderer.on('youtube:download-progress', wrapper);
          return () => ipcRenderer.removeListener('youtube:download-progress', wrapper);
      }
  },

  // Synology API
  synology: {
      login: (url: string, user: string, pass: string) => ipcRenderer.invoke('synology:login', url, user, pass),
      getSystemData: () => ipcRenderer.invoke('synology:get-system-data'),
      executeAction: (action: string) => ipcRenderer.invoke('synology:execute-action', action),
  }
});
