import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Wifi, AlertCircle, ExternalLink, Search, Download, Calendar, Globe, X, Loader2, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ProwlarrService } from '../services/prowlarr';
import type { ProwlarrStats, ProwlarrRelease } from '../services/prowlarr';
import { DelugeService } from '../services/deluge';
import { useApp } from '../contexts/AppContext';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

const isFrenchOrMulti = (title: string) => {
    const upper = title.toUpperCase();
    // Regex pour détecter les tags de langue français/multi
    // \b assure qu'on matche des mots entiers (ex: "VF" ne matchera pas dans "DVF")
    return /\b(FRENCH|TRUEFRENCH|VFF|VF|VOSTFR|MULTI)\b/.test(upper);
};

// Extension de l'interface locale pour l'affichage (si l'API renvoie seeders/leechers)
interface DisplayRelease extends ProwlarrRelease {
  seeders?: number;
  leechers?: number;
}

export function Prowlarr() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<ProwlarrStats | null>(null);
  const [releases, setReleases] = useState<DisplayRelease[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [prowlarrUrl, setProwlarrUrl] = useState<string>('');
  const [nextUpdate, setNextUpdate] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DisplayRelease[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-search from navigation state
  useEffect(() => {
    const searchFromState = async () => {
        const state = location.state as { search?: string } | null;
        if (state?.search) {
            const query = state.search;
            setSearchQuery(query);
            setIsSearchOpen(true);
            setIsSearching(true);
            try {
                const results = await ProwlarrService.search(query, true);
                setSearchResults(results);
            } catch (error) {
                console.error('Auto search failed', error);
            } finally {
                setIsSearching(false);
                // Clear state to prevent re-search on refresh if possible, 
                // but replaceState is tricky with react-router.
                // We just rely on component mount.
            }
        }
    };
    searchFromState();
  }, []);

  // Filters
  const [filterIndexer, setFilterIndexer] = useState<string>('all');
  const [filterFrench, setFilterFrench] = useState<boolean>(false);
  
  // Search Filters
  const [searchFilterIndexer, setSearchFilterIndexer] = useState<string>('all');
  const [searchFilterFrench, setSearchFilterFrench] = useState<boolean>(false);

  const getFilteredList = (list: DisplayRelease[], indexer: string, frenchOnly: boolean) => {
    return list.filter(item => {
        if (indexer !== 'all' && item.indexer !== indexer) return false;
        if (frenchOnly && !isFrenchOrMulti(item.title)) return false;
        return true;
    });
  };

  const filteredReleases = getFilteredList(releases, filterIndexer, filterFrench);
  const filteredSearchResults = getFilteredList(searchResults, searchFilterIndexer, searchFilterFrench);

  const getAvailableIndexers = (list: DisplayRelease[]) => {
      return Array.from(new Set(list.map(r => r.indexer))).sort();
  };
  
  const releaseIndexers = getAvailableIndexers(releases);
  const searchIndexers = getAvailableIndexers(searchResults);

  useEffect(() => {
    const timer = setInterval(() => {
        if (!nextUpdate) {
            setTimeRemaining('');
            return;
        }
        const now = Date.now();
        const diff = nextUpdate - now;
        
        if (diff <= 0) {
            setTimeRemaining('Mise à jour...');
            loadData(true, true);
            return;
        }
        
        // Formatage plus sympa si > 1h (bien que le cache soit 1h)
        if (diff > 3600000) {
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeRemaining(`${minutes}m ${seconds}s`);
        }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [nextUpdate]);

  useEffect(() => {
    const checkConfig = async () => {
      const configured = await window.electronAPI.getCredentials('prowlarr_configured');
      const url = await window.electronAPI.getCredentials('prowlarr_url');
      if (url) setProwlarrUrl(url);

      if (!configured) {
        setIsConfigured(false);
        setTimeout(() => {
          navigate('/settings', { state: { section: 'prowlarr' } });
        }, 2000);
      } else {
        setIsConfigured(true);
        loadData();
      }
    };
    checkConfig();
  }, [navigate]);

  const loadData = async (forceRefresh = false, isAuto = false) => {
    setLoading(true);
    try {
      const statsData = await ProwlarrService.getStats(forceRefresh);
      setStats(statsData);
      // Empty query often fails or returns nothing on some Prowlarr setups depending on indexers
      // We rely on the service to handle empty query logic (type=search)
      const releasesData = await ProwlarrService.search('', forceRefresh); 
      setReleases(releasesData);
      
      const next = ProwlarrService.getNextUpdate();
      setNextUpdate(next);

      if (isAuto && forceRefresh) {
        notify('Prowlarr', {
          body: 'Actualisation terminée',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to load Prowlarr data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Force refresh for manual searches to ensure latest results
      const results = await ProwlarrService.search(searchQuery, true);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (release: ProwlarrRelease) => {
    const link = release.magnetUrl || release.downloadUrl;
    if (!link) {
        toast.error('Lien de téléchargement introuvable');
        return;
    }

    const toastId = toast.loading(`Ajout de "${release.title}"...`);

    if (link.startsWith('magnet:')) {
        const success = await DelugeService.addMagnet(link);
        if (success) {
            toast.success(`"${release.title}" ajouté avec succès`, { id: toastId });
        } else {
            toast.error('Échec de l\'ajout à Deluge', { id: toastId, description: 'Vérifiez que Deluge est connecté' });
        }
    } else {
        try {
            const response = await fetch(link);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const success = await DelugeService.addTorrentFile(`${release.title}.torrent`, base64);
                if (success) {
                    toast.success(`"${release.title}" ajouté avec succès`, { id: toastId });
                } else {
                    toast.error('Échec de l\'ajout à Deluge', { id: toastId });
                }
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error(e);
            toast.error('Impossible de télécharger le fichier torrent', { id: toastId, description: 'Le lien Magnet n\'est pas disponible.' });
        }
    }
  };

  const openWebUI = () => {
    if (prowlarrUrl) {
      window.open(prowlarrUrl, '_blank');
    }
  };

  if (isConfigured === false) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold">Module non configuré</h2>
            <p className="text-muted-foreground">Redirection vers les paramètres...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isConfigured === null) return <div>Chargement...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Prowlarr
        </h1>
        <div className="flex gap-2">
            <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
            <Search className="h-4 w-4" /> Rechercher
            </button>
            <button
            onClick={openWebUI}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
            <ExternalLink className="h-4 w-4" /> Interface Web
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-full">
                    <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">Indexeurs Totaux</div>
                    <div className="text-2xl font-bold">{stats.indexerCount}</div>
                </div>
            </div>
            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center gap-4">
                <div className="p-2 bg-green-500/10 rounded-full">
                    <Wifi className="h-6 w-6 text-green-500" />
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">Actifs</div>
                    <div className="text-2xl font-bold">{stats.enabledIndexerCount}</div>
                </div>
            </div>
             <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-full">
                    <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">Dernières Sorties</div>
                    <div className="text-2xl font-bold">{releases.length}</div>
                </div>
            </div>
        </div>
      )}

      {/* Latest Releases List */}
      <div className="flex-1 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    Dernières sorties
                </h2>
                <div className="flex items-center gap-2">
                    {timeRemaining && (
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                            Prochaine maj: {timeRemaining}
                        </span>
                    )}
                    <button 
                        onClick={() => loadData(true)} 
                        disabled={loading}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Filtres:</span>
                </div>
                
                <select 
                    value={filterIndexer} 
                    onChange={(e) => setFilterIndexer(e.target.value)}
                    className="bg-background border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                >
                    <option value="all">Tous les indexeurs</option>
                    {releaseIndexers.map(idx => (
                        <option key={idx} value={idx}>{idx}</option>
                    ))}
                </select>

                <label className="flex items-center gap-2 cursor-pointer select-none bg-muted/50 px-2 py-1 rounded hover:bg-muted transition-colors">
                    <input 
                        type="checkbox" 
                        checked={filterFrench}
                        onChange={(e) => setFilterFrench(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>🇫🇷 FR / Multi</span>
                </label>
                
                <div className="flex-1 text-right text-muted-foreground text-xs">
                    {filteredReleases.length} / {releases.length} résultat(s)
                </div>
              </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Titre</th>
                  <th className="px-4 py-3 text-left">Indexeur</th>
                  <th className="px-4 py-3 text-left">Taille</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReleases.map((release) => (
                  <tr key={release.guid} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                        <div className="truncate max-w-[300px]" title={release.title}>
                            {release.title}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{release.indexer}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(release.size)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(release.publishDate)}</td>
                    <td className="px-4 py-3 text-right">
                        <button
                            onClick={() => handleDownload(release)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            title="Télécharger avec Deluge"
                        >
                            <Download className="h-3 w-3" />
                            DL
                        </button>
                    </td>
                  </tr>
                ))}
                {filteredReleases.length === 0 && !loading && (
                    <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            {releases.length === 0 
                                ? "Aucune sortie récente trouvée. Vérifiez vos indexeurs."
                                : "Aucun résultat pour ces filtres."}
                        </td>
                    </tr>
                )}
                 {loading && (
                    <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            Chargement...
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border shadow-lg rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex items-center gap-4">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <form onSubmit={handleSearch} className="flex-1">
                        <input 
                            type="text" 
                            placeholder="Rechercher un film, une série..." 
                            className="w-full bg-transparent outline-none text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                        />
                    </form>
                    <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-muted rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search Filters */}
                <div className="px-4 py-2 border-b bg-muted/10 flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Filtres:</span>
                    </div>
                    
                    <select 
                        value={searchFilterIndexer} 
                        onChange={(e) => setSearchFilterIndexer(e.target.value)}
                        className="bg-background border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                    >
                        <option value="all">Tous les indexeurs</option>
                        {searchIndexers.map(idx => (
                            <option key={idx} value={idx}>{idx}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer select-none bg-muted/50 px-2 py-1 rounded hover:bg-muted transition-colors">
                        <input 
                            type="checkbox" 
                            checked={searchFilterFrench}
                            onChange={(e) => setSearchFilterFrench(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>🇫🇷 FR / Multi</span>
                    </label>
                     <div className="flex-1 text-right text-muted-foreground text-xs">
                        {filteredSearchResults.length} / {searchResults.length} résultat(s)
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-0">
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            Recherche en cours...
                        </div>
                    ) : filteredSearchResults.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground sticky top-0">
                                <tr>
                                <th className="px-4 py-3 text-left">Titre</th>
                                <th className="px-4 py-3 text-left">Indexeur</th>
                                <th className="px-4 py-3 text-left">Taille</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredSearchResults.map((release) => (
                                <tr key={release.guid} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-medium">
                                        <div className="truncate max-w-[400px]" title={release.title}>
                                            {release.title}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{release.indexer}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(release.size)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatDate(release.publishDate)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDownload(release)}
                                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            <Download className="h-3 w-3" />
                                            DL
                                        </button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground">
                            {searchQuery 
                                ? (searchResults.length > 0 
                                    ? "Aucun résultat pour ces filtres." 
                                    : "Aucun résultat trouvé")
                                : "Entrez un terme pour rechercher"}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
