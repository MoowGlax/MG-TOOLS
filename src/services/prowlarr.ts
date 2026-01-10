export interface ProwlarrStats {
  indexerCount: number;
  enabledIndexerCount: number;
  latestReleaseCount: number;
}

export interface ProwlarrRelease {
  guid: string;
  indexerId: number;
  indexer: string;
  title: string;
  publishDate: string;
  size: number;
  downloadUrl: string | null;
  magnetUrl: string | null;
  protocol: string;
}

let currentUrl = '';
let currentApiKey = '';

// Cache simple avec localStorage pour la persistance
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

const getCached = (key: string) => {
  try {
    const item = localStorage.getItem(`prowlarr_${key}`);
    if (!item) return null;
    
    const cached = JSON.parse(item);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    // Clean expired
    localStorage.removeItem(`prowlarr_${key}`);
    return null;
  } catch (e) {
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(`prowlarr_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
};

export const ProwlarrService = {
  // ... (init and testConnection remain the same)
  init: async () => {
    const url = await window.electronAPI.getCredentials('prowlarr_url');
    const key = await window.electronAPI.getCredentials('prowlarr_apikey');
    currentUrl = url || '';
    currentApiKey = key || '';
  },

  testConnection: async (url: string, apiKey: string): Promise<boolean> => {
    try {
      const response = await window.electronAPI.proxyRequest(`${url}/api/v1/health`, {
        headers: { 'X-Api-Key': apiKey }
      });
      return response.ok;
    } catch (e) {
      console.error('Prowlarr connection test failed', e);
      return false;
    }
  },

  getNextUpdate: () => {
      // Find the key with the latest timestamp in localStorage
      let max = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('prowlarr_')) {
            try {
                const item = JSON.parse(localStorage.getItem(key) || '{}');
                if (item.timestamp > max) max = item.timestamp;
            } catch {}
        }
      }
      return max > 0 ? max + CACHE_DURATION : null;
  },

  checkHealth: async (): Promise<boolean> => {
    try {
        await ProwlarrService.init();
        if (!currentUrl || !currentApiKey) return false;
        const baseUrl = currentUrl.replace(/\/$/, '');
        const response = await window.electronAPI.proxyRequest(`${baseUrl}/api/v1/health`, {
            headers: { 'X-Api-Key': currentApiKey }
        });
        return response.ok;
    } catch { return false; }
  },

  getStats: async (forceRefresh = false): Promise<ProwlarrStats> => {
    await ProwlarrService.init();
    if (!currentUrl || !currentApiKey) return { indexerCount: 0, enabledIndexerCount: 0, latestReleaseCount: 0 };

    const baseUrl = currentUrl.replace(/\/$/, '');
    const cacheKey = `stats-${baseUrl}`;
    
    if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
    }

    try {
      const response = await window.electronAPI.proxyRequest(`${baseUrl}/api/v1/indexer`, {
        headers: { 
            'X-Api-Key': currentApiKey,
            'Accept': 'application/json'
        }
      });

      if (response.ok && Array.isArray(response.data)) {
        const indexers = response.data;
        const stats = {
          indexerCount: indexers.length,
          enabledIndexerCount: indexers.filter((i: { enable: boolean }) => i.enable).length,
          latestReleaseCount: 0 
        };
        setCache(cacheKey, stats);
        return stats;
      }
      return { indexerCount: 0, enabledIndexerCount: 0, latestReleaseCount: 0 };
    } catch (e) {
      console.error('Failed to get Prowlarr stats', e);
      return { indexerCount: 0, enabledIndexerCount: 0, latestReleaseCount: 0 };
    }
  },

  search: async (query: string = '', forceRefresh = false): Promise<ProwlarrRelease[]> => {
    // Re-init pour être sûr d'avoir les credentials à jour
    await ProwlarrService.init();
    
    // Vérification explicite
    if (!currentUrl || !currentApiKey) {
        console.warn('Prowlarr credentials missing', { currentUrl, hasKey: !!currentApiKey });
        return [];
    }

    const baseUrl = currentUrl.replace(/\/$/, '');
    const cacheKey = `search-${query}-${baseUrl}`;
    
    if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
    }

    try {
      // Construction manuelle EXACTE comme demandé
      // On encode quand même la query pour éviter de casser l'URL si recherche spéciale
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `${baseUrl}/api/v1/search?query=${encodedQuery}&type=search&limit=100&offset=0&apikey=${currentApiKey}`;
      
      console.log('Fetching Prowlarr (Direct URL):', searchUrl);
      
      const response = await window.electronAPI.proxyRequest(searchUrl, {
        method: 'GET',
        headers: { 
            'X-Api-Key': currentApiKey,
            'Accept': 'application/json'
        },
        timeout: 60000
      });
      
      console.log('Prowlarr Raw Response:', response);

      // Si la réponse n'est pas OK, on arrête tout et ON NE CACHE PAS
      if (!response || !response.ok) {
          console.error('Prowlarr API Error - Not OK:', response);
          return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let results: any[] = [];
      const data = response.data;

      if (Array.isArray(data)) {
        results = data;
      } else if (data && typeof data === 'object') {
         // Check for records array
         if ('records' in data && Array.isArray((data as any).records)) {
             results = (data as any).records;
         } else {
             // Fallback
             const possibleArray = Object.values(data).find(v => Array.isArray(v));
             if (possibleArray) {
                 results = possibleArray as any[];
             } else {
                 results = Object.values(data).filter((v: any) => v && v.guid);
             }
         }
      }

      console.log(`Parsed ${results.length} results`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const releases = results.map((item: any) => ({
        guid: item.guid,
        indexerId: item.indexerId,
        indexer: item.indexer,
        title: item.title,
        publishDate: item.publishDate || item.added || new Date().toISOString(),
        size: item.size,
        downloadUrl: item.downloadUrl,
        magnetUrl: item.magnetUrl,
        protocol: item.protocol,
        seeders: item.seeders,
        leechers: item.leechers
      }));
      
      // On ne met en cache que si on a réussi à parser une réponse valide (même vide)
      setCache(cacheKey, releases);
      return releases;
    } catch (e) {
      console.error('Prowlarr search failed', e);
      return [];
    }
  },

  // Récupère l'URL publique pour le bouton "Ouvrir Web UI"
  getPublicUrl: async (): Promise<string> => {
    if (!currentUrl) await ProwlarrService.init();
    return currentUrl;
  },

  downloadLocal: async (url: string, title: string) => {
    const { DownloadManagerService } = await import('../components/DownloadManager');
    const fileName = `${title.replace(/[^a-zA-Z0-9.-]/g, '_')}.torrent`;
    
    const downloadId = DownloadManagerService.add(fileName);

    try {
        const result = await window.electronAPI.downloadFile(url, fileName, downloadId);
        
        if (result.success) {
            DownloadManagerService.update(downloadId, { status: 'completed', progress: 100 });
            setTimeout(() => DownloadManagerService.remove(downloadId), 5000);
        } else {
            DownloadManagerService.update(downloadId, { status: 'error', error: result.error });
        }
    } catch (e: any) {
        DownloadManagerService.update(downloadId, { status: 'error', error: e.message });
    }
  }
};
