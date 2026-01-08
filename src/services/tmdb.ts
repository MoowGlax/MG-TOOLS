
export interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
}

export interface TMDBDetails extends TMDBShow {
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  next_episode_to_air: {
    air_date: string;
    name: string;
    episode_number: number;
    season_number: number;
  } | null;
}

let apiKey = '';

export const TmdbService = {
  init: async () => {
    const key = await window.electronAPI.getCredentials('tmdb_apikey');
    apiKey = key || '';
  },

  testConnection: async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/authentication/token/new?api_key=${key}`);
      const data = await response.json();
      return data.success === true;
    } catch (e) {
      console.error('TMDB connection test failed', e);
      return false;
    }
  },

  search: async (query: string): Promise<TMDBShow[]> => {
    await TmdbService.init();
    if (!apiKey) return [];

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&language=fr-FR&query=${encodeURIComponent(query)}&page=1&include_adult=false`
      );
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error('TMDB search failed', e);
      return [];
    }
  },

  getDetails: async (id: number): Promise<TMDBDetails | null> => {
    await TmdbService.init();
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}&language=fr-FR`
      );
      return await response.json();
    } catch (e) {
      console.error('TMDB details failed', e);
      return null;
    }
  }
};
