export const SynologyService = {
  login: async (url: string, user: string, pass: string) => {
    return window.electronAPI.synology.login(url, user, pass);
  },
  getSystemData: async () => {
    return window.electronAPI.synology.getSystemData();
  },
  executeAction: async (action: 'reboot' | 'shutdown') => {
    return window.electronAPI.synology.executeAction(action);
  }
};
