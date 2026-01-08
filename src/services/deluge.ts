export interface DelugeTorrent {
  id: string;
  name: string;
  progress: number;
  state: string; // 'Downloading', 'Seeding', 'Paused', etc.
  download_payload_rate: number; // Bytes/s
  upload_payload_rate: number;   // Bytes/s
  eta: number; // Seconds
  total_size: number; // Bytes
  save_path: string;
}

export interface DelugeStats {
  downloadSpeed: number;
  uploadSpeed: number;
  activeTorrents: number;
  pausedTorrents: number;
}

interface DelugeRpcResponse {
  result?: any;
  error?: {
    message?: string;
    code?: number;
  };
  id?: number;
}

let sessionCookie: string | null = null;
let currentUrl: string | null = null;
let currentId = 1;

const getNextId = () => currentId++;

export const DelugeService = {
  login: async (url: string, password: string): Promise<boolean> => {
    try {
      console.log(`Connecting to Deluge at ${url}`);
      currentUrl = url;
      
      const payload = {
        method: 'auth.login',
        params: [password],
        id: getNextId()
      };

      const response = await window.electronAPI.proxyRequest(`${url}/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = response.data as DelugeRpcResponse;

      if (response.ok && data && !data.error && data.result) {
         // Récupération du cookie
         // Le header peut être 'set-cookie' ou 'Set-Cookie'
         if (response.headers) {
            const cookie = response.headers['set-cookie'] || response.headers['Set-Cookie'];
            if (cookie) {
                // On prend juste la valeur du cookie session
                sessionCookie = cookie.split(';')[0];
            }
         }
         return true;
      }
      
      return false;
    } catch (e) {
      console.error('Deluge login error:', e);
      return false;
    }
  },

  checkConnection: async (): Promise<boolean> => {
      if (!sessionCookie) {
          // Tenter de récupérer les credentials stockés
          const url = await window.electronAPI.getCredentials('deluge_url');
          const password = await window.electronAPI.getCredentials('deluge_password');
          if (url && password) {
              return DelugeService.login(url, password);
          }
          return false;
      }
      return true;
  },

  invoke: async (method: string, params: any[] = []) => {
      if (!currentUrl) {
          const url = await window.electronAPI.getCredentials('deluge_url');
          if (url) currentUrl = url;
          else throw new Error('Deluge not configured');
      }

      // Reconnexion automatique si besoin
      if (!sessionCookie) {
          await DelugeService.checkConnection();
      }

      const payload = {
          method,
          params,
          id: getNextId()
      };

      const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      };
      
      if (sessionCookie) {
          headers['Cookie'] = sessionCookie;
      }

      const response = await window.electronAPI.proxyRequest(`${currentUrl}/json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
      });

      const data = response.data as DelugeRpcResponse;

      if (data && data.error) {
          // Si erreur session invalide, on pourrait réessayer login
          throw new Error(data.error.message || 'RPC Error');
      }

      return data?.result;
  },

  getStats: async (): Promise<DelugeStats> => {
    try {
        const torrents = await DelugeService.getTorrents();
        
        let downloadSpeed = 0;
        let uploadSpeed = 0;
        let active = 0;
        let paused = 0;

        torrents.forEach(t => {
            downloadSpeed += t.download_payload_rate;
            uploadSpeed += t.upload_payload_rate;
            if (t.state === 'Paused') paused++;
            else active++;
        });

        // Convert to KB/s for the interface expected format (historically)
        // But better to keep bytes and format in UI. 
        // For compatibility with current UI:
        return {
            downloadSpeed: Math.floor(downloadSpeed / 1024),
            uploadSpeed: Math.floor(uploadSpeed / 1024),
            activeTorrents: active,
            pausedTorrents: paused
        };
    } catch (e) {
        console.error(e);
        return { downloadSpeed: 0, uploadSpeed: 0, activeTorrents: 0, pausedTorrents: 0 };
    }
  },

  getTorrents: async (): Promise<DelugeTorrent[]> => {
      try {
          // web.update_ui ou core.get_torrents_status
          // web.update_ui est plus efficace pour la WebUI
          const keys = [
              'name', 'total_size', 'state', 'progress', 
              'download_payload_rate', 'upload_payload_rate', 'eta', 'save_path'
          ];
          
          const response = await DelugeService.invoke('web.update_ui', [keys, {}]);
          
          if (response && response.torrents) {
              return Object.entries(response.torrents).map(([id, data]: [string, any]) => ({
                  id,
                  name: data.name,
                  total_size: data.total_size,
                  state: data.state,
                  progress: data.progress,
                  download_payload_rate: data.download_payload_rate,
                  upload_payload_rate: data.upload_payload_rate,
                  eta: data.eta,
                  save_path: data.save_path
              }));
          }
          return [];
      } catch (e) {
          console.error('Error fetching torrents:', e);
          return [];
      }
  },
  
  addMagnet: async (magnetLink: string): Promise<boolean> => {
    try {
      if (!currentUrl) throw new Error('Not connected');
      await DelugeService.invoke('core.add_torrent_magnet', [magnetLink, {}]);
      return true;
    } catch (e) {
      console.error('Failed to add magnet', e);
      return false;
    }
  },

  addTorrentFile: async (filename: string, base64Content: string): Promise<boolean> => {
    try {
      if (!currentUrl) throw new Error('Not connected');
      // core.add_torrent_file(filename, filedump, options)
      await DelugeService.invoke('core.add_torrent_file', [filename, base64Content, {}]);
      return true;
    } catch (e) {
      console.error('Failed to add torrent file', e);
      return false;
    }
  },

  removeTorrent: async (id: string, removeData: boolean = false): Promise<boolean> => {
      try {
          await DelugeService.invoke('core.remove_torrent', [id, removeData]);
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  },
  
  pauseTorrent: async (id: string): Promise<boolean> => {
      try {
          await DelugeService.invoke('core.pause_torrent', [[id]]);
          return true;
      } catch (e) { return false; }
  },

  resumeTorrent: async (id: string): Promise<boolean> => {
      try {
          await DelugeService.invoke('core.resume_torrent', [[id]]);
          return true;
      } catch (e) { return false; }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
        return await DelugeService.checkConnection();
    } catch { return false; }
  }
};
