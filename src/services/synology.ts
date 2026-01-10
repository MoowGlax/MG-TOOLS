export const SynologyService = {
  login: async (url: string, user: string, pass: string) => {
    return window.electronAPI.synology.login(url, user, pass);
  },
  getSystemData: async () => {
    return window.electronAPI.synology.getSystemData();
  },
  executeAction: async (action: 'reboot' | 'shutdown') => {
    return window.electronAPI.synology.executeAction(action);
  },
  openSsh: async (user: string, host: string) => {
    return window.electronAPI.synology.openSsh(user, host);
  },
  checkHealth: async () => {
    try {
        await window.electronAPI.synology.getSystemData();
        return true;
    } catch {
        return false;
    }
  }
};
