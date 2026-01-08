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

// Cache simple : Map<clé, {data, timestamp}>
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requestCache = new Map<string, { data: any; timestamp: number }>();

const getCached = (key: string) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  requestCache.set(key, { data, timestamp: Date.now() });
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
      // Find the key with the latest timestamp
      let max = 0;
      for (const val of requestCache.values()) {
          if (val.timestamp > max) max = val.timestamp;
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
  }
};
