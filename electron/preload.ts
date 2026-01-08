import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  saveCredentials: (key: string, value: string) => ipcRenderer.invoke('save-credentials', key, value),
  getCredentials: (key: string) => ipcRenderer.invoke('get-credentials', key),
  saveData: (key: string, value: any) => ipcRenderer.invoke('save-data', key, value),
  getData: (key: string) => ipcRenderer.invoke('get-data', key),
  proxyRequest: (url: string, options: RequestInit) => ipcRenderer.invoke('proxy-request', url, options),
  
  // Update API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
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
  }
});
