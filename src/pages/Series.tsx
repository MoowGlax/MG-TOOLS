import { useState, useEffect } from 'react';
import { Plus, Search, X, Loader2, Trash2, Clapperboard, Calendar, Settings, Star, RefreshCw, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TmdbService } from '../services/tmdb';
import type { TMDBShow, TMDBDetails } from '../services/tmdb';
import { SeriesService } from '../services/series';

// Helper de traduction des statuts
const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    'Ended': 'Terminée',
    'Returning Series': 'En cours',
    'Canceled': 'Annulée',
    'In Production': 'En production',
    'Pilot': 'Pilote',
    'Planned': 'Programmée'
  };
  return map[status] || status;
};

// Filtres disponibles
type FilterType = 'all' | 'ended' | 'returning' | 'planned';
const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Toutes' },
    { id: 'returning', label: 'En cours' },
    { id: 'ended', label: 'Terminées' },
    { id: 'planned', label: 'Programmées' },
];

export function Series() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<TMDBDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  
  // Nouveaux états
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedSeries, setSelectedSeries] = useState<TMDBDetails | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFavorites = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setIsRefreshing(true);

    try {
        await TmdbService.init();
        const key = await window.electronAPI.getCredentials('tmdb_apikey');
        
        if (!key) {
            setHasApiKey(false);
            setLoading(false);
            setIsRefreshing(false);
            return;
        }
        setHasApiKey(true);

        const data = await SeriesService.getFavoritesDetails();
        setFavorites(data);
    } catch (e) {
        toast.error('Erreur lors du chargement des séries');
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    // Marquer les notifications comme lues
    SeriesService.clearUpdates();
  }, []);

  const handleRemove = async (id: number, name: string) => {
    if (confirm(`Supprimer ${name} des favoris ?`)) {
      await SeriesService.removeFavorite(id);
      setFavorites(prev => prev.filter(s => s.id !== id));
      toast.success(`${name} retiré des favoris`);
      if (selectedSeries?.id === id) setSelectedSeries(null);
    }
  };

  // Filtrage
  const filteredSeries = favorites.filter(s => {
      if (filter === 'all') return true;
      if (filter === 'ended') return s.status === 'Ended' || s.status === 'Canceled';
      if (filter === 'returning') return s.status === 'Returning Series';
      if (filter === 'planned') return s.status === 'Planned' || s.status === 'In Production';
      return true;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header avec Filtres et Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clapperboard className="h-6 w-6" />
                Mes Séries
            </h1>
            <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground">
                {favorites.length}
            </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <div className="flex bg-muted p-1 rounded-lg mr-2">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                            filter === f.id 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <button
                onClick={() => loadFavorites(false)}
                disabled={isRefreshing}
                className={`p-2 rounded-md hover:bg-muted transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                title="Rafraîchir"
            >
                <RefreshCw className="h-4 w-4" />
            </button>

            <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
            >
                <Plus className="h-4 w-4" /> Ajouter
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : hasApiKey === false ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4">
                <Clapperboard className="h-16 w-16 opacity-20" />
                <p>La clé API TMDB n'est pas configurée.</p>
                <button
                  onClick={() => navigate('/settings', { state: { section: 'tmdb' } })}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Settings className="h-4 w-4" /> Configurer TMDB
                </button>
            </div>
        ) : filteredSeries.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4">
                <Clapperboard className="h-16 w-16 opacity-20" />
                <p>
                    {favorites.length === 0 
                        ? "Aucune série suivie pour le moment." 
                        : "Aucune série ne correspond à ce filtre."}
                </p>
                {favorites.length === 0 && (
                    <button
                    onClick={() => setIsSearchOpen(true)}
                    className="text-primary hover:underline"
                    >
                    Ajouter ma première série
                    </button>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredSeries.map(show => (
                    <div 
                        key={show.id} 
                        onClick={() => setSelectedSeries(show)}
                        className="group relative aspect-[2/3] bg-muted rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-primary/50"
                    >
                        {show.poster_path ? (
                            <img 
                                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`} 
                                alt={show.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                <Clapperboard className="h-12 w-12" />
                            </div>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <h3 className="text-white font-bold truncate">{show.name}</h3>
                            <div className="text-white/80 text-xs flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                    <span>{show.vote_average.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    <span>{translateStatus(show.status)}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Badge de statut rapide */}
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white">
                            {show.next_episode_to_air ? 'Nouveau' : translateStatus(show.status)}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Modals */}
      {isSearchOpen && (
        <SearchModal 
            onClose={() => setIsSearchOpen(false)} 
            onAdd={async (show) => {
                await SeriesService.addFavorite(show.id);
                loadFavorites(false);
                setIsSearchOpen(false);
                toast.success(`${show.name} ajouté aux favoris`);
            }}
        />
      )}

      {selectedSeries && (
          <DetailsModal 
            show={selectedSeries} 
            onClose={() => setSelectedSeries(null)}
            onRemove={() => handleRemove(selectedSeries.id, selectedSeries.name)}
          />
      )}
    </div>
  );
}

// --- Sub-components ---

function DetailsModal({ show, onClose, onRemove }: { show: TMDBDetails, onClose: () => void, onRemove: () => void }) {
    const navigate = useNavigate();

    const handleProwlarrSearch = () => {
        navigate('/prowlarr', { state: { search: show.name } });
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card border shadow-2xl rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header avec Backdrop */}
                <div className="relative h-48 md:h-64 bg-muted shrink-0">
                    {show.backdrop_path ? (
                        <img 
                            src={`https://image.tmdb.org/t/p/original${show.backdrop_path}`} 
                            alt="" 
                            className="w-full h-full object-cover opacity-50"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-0 left-0 p-6 flex items-end gap-6 w-full">
                        <div className="hidden md:block w-32 aspect-[2/3] rounded-lg overflow-hidden shadow-lg border-2 border-card bg-muted shrink-0 translate-y-8">
                            {show.poster_path && (
                                <img 
                                    src={`https://image.tmdb.org/t/p/w500${show.poster_path}`} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                            <h2 className="text-3xl font-bold truncate text-foreground shadow-black drop-shadow-md">{show.name}</h2>
                            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    {show.vote_average.toFixed(1)}
                                </span>
                                <span>•</span>
                                <span>{show.first_air_date.split('-')[0]}</span>
                                <span>•</span>
                                <span className={show.status === 'Ended' ? 'text-red-500' : 'text-green-500'}>
                                    {translateStatus(show.status)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 pt-10 md:pt-6">
                    <div className="grid md:grid-cols-[1fr_300px] gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Synopsis</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {show.overview || "Aucun résumé disponible en français."}
                                </p>
                            </div>

                            {show.next_episode_to_air && (
                                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-start gap-4">
                                    <div className="p-2 bg-primary/10 rounded-full shrink-0">
                                        <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-primary">Prochain épisode</h4>
                                        <p className="text-sm mt-1">
                                            S{show.next_episode_to_air.season_number}E{show.next_episode_to_air.episode_number} : {show.next_episode_to_air.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Diffusé le {new Date(show.next_episode_to_air.air_date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-lg text-center">
                                    <div className="text-2xl font-bold">{show.number_of_seasons}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Saisons</div>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg text-center">
                                    <div className="text-2xl font-bold">{show.number_of_episodes}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Épisodes</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button 
                                onClick={handleProwlarrSearch}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                <Search className="h-4 w-4" />
                                Rechercher sur Prowlarr
                            </button>

                            <a 
                                href={`https://www.themoviedb.org/tv/${show.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-muted text-foreground py-3 px-4 rounded-lg font-medium hover:bg-muted/80 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Voir sur TMDB
                            </a>

                            <button 
                                onClick={onRemove}
                                className="w-full flex items-center justify-center gap-2 border border-destructive/30 text-destructive hover:bg-destructive/10 py-3 px-4 rounded-lg font-medium transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                Retirer des favoris
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SearchModal({ onClose, onAdd }: { onClose: () => void, onAdd: (show: TMDBShow) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TMDBShow[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setSearching(true);
        const data = await TmdbService.search(query);
        setResults(data);
        setSearching(false);
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border shadow-lg rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex items-center gap-4">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <form onSubmit={handleSearch} className="flex-1">
                        <input 
                            type="text" 
                            placeholder="Rechercher une série..." 
                            className="w-full bg-transparent outline-none text-lg"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </form>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                    {searching ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            Recherche...
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {results.map(show => (
                                <div key={show.id} className="flex items-center gap-4 p-2 hover:bg-muted rounded-lg transition-colors group">
                                    <div className="h-16 w-12 bg-muted rounded overflow-hidden flex-shrink-0">
                                        {show.poster_path ? (
                                            <img src={`https://image.tmdb.org/t/p/w92${show.poster_path}`} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-muted-foreground/20">
                                                <Clapperboard className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate">{show.name}</h4>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {show.first_air_date?.split('-')[0]} • Note: {show.vote_average?.toFixed(1)}/10
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => onAdd(show)}
                                        className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Ajouter
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground">
                            {query ? "Aucun résultat trouvé" : "Recherchez une série pour l'ajouter"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
