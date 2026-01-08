import { TmdbService } from './tmdb';
import type { TMDBDetails } from './tmdb';
import { NotificationsService } from './notifications';

const STORAGE_KEY = 'favorite_series';
const OLD_LOCAL_STORAGE_KEY = 'mg_tools_favorite_series';

export interface FavoriteSeries {
  id: number;
  lastStatus?: string;
  name?: string;
}

export const SeriesService = {
  getFavorites: async (): Promise<FavoriteSeries[]> => {
    // Try file storage first
    const data = await window.electronAPI.getData(STORAGE_KEY);
    let favorites: FavoriteSeries[] = Array.isArray(data) ? data : [];
    
    // Migration from localStorage if file storage is empty
    if (favorites.length === 0) {
      const localStored = localStorage.getItem(OLD_LOCAL_STORAGE_KEY);
      if (localStored) {
        try {
            favorites = JSON.parse(localStored);
            // Save to file to complete migration
            await SeriesService.saveFavorites(favorites);
        } catch {
            favorites = [];
        }
      } else {
          favorites = [];
      }
    }
    return favorites;
  },

  saveFavorites: async (favorites: FavoriteSeries[]) => {
    await window.electronAPI.saveData(STORAGE_KEY, favorites);
  },

  addFavorite: async (id: number) => {
    const favorites = await SeriesService.getFavorites();
    if (!favorites.find(f => f.id === id)) {
      favorites.push({ id });
      await SeriesService.saveFavorites(favorites);
    }
  },

  removeFavorite: async (id: number) => {
    const favorites = await SeriesService.getFavorites();
    const newFavorites = favorites.filter(f => f.id !== id);
    await SeriesService.saveFavorites(newFavorites);
  },

  getFavoritesDetails: async (): Promise<TMDBDetails[]> => {
    const favorites = await SeriesService.getFavorites();
    const promises = favorites.map(f => TmdbService.getDetails(f.id));
    const results = await Promise.all(promises);
    return results.filter((r): r is TMDBDetails => r !== null);
  },

  checkStatusChanges: async () => {
    const favorites = await SeriesService.getFavorites();
    let hasChanges = false;

    const updates = await Promise.all(favorites.map(async (fav) => {
      const details = await TmdbService.getDetails(fav.id);
      if (!details) return fav;

      // Initial status setting
      if (!fav.lastStatus) {
        if (fav.lastStatus !== details.status) {
             fav.lastStatus = details.status;
             fav.name = details.name;
             hasChanges = true;
        }
        return fav;
      }

      // Status change detection
      if (fav.lastStatus !== details.status) {
        await NotificationsService.sendNotification(
            `Changement de statut : ${details.name}`,
            `La série ${details.name} est passée de "${fav.lastStatus}" à "${details.status}".`
        );
        fav.lastStatus = details.status;
        fav.name = details.name;
        hasChanges = true;
      }
      
      // Update name if missing
      if (!fav.name) {
          fav.name = details.name;
          hasChanges = true;
      }

      return fav;
    }));

    if (hasChanges) {
      await SeriesService.saveFavorites(updates);
      localStorage.setItem('series_has_updates', 'true');
    }
    
    return hasChanges;
  },

  hasUpdates: (): boolean => {
      return localStorage.getItem('series_has_updates') === 'true';
  },

  clearUpdates: () => {
      localStorage.removeItem('series_has_updates');
  }
};
