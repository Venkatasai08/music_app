// TuneFree Feed, Discovery, Genres, and Search State Store

import { create } from 'zustand';
import { Track, Artist, Playlist, Album } from '../types/music';
import { TuneFreeSection, UnifiedSearchResults } from '../types/engine';
import { tuneFreeApi } from '../api/tuneFreeApi';

export const TUNEFREE_GENRES = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'Jazz',
  'R&B',
  'Country',
  'Latin',
  'Indie',
  'Classical',
  'Metal',
  'Lofi',
  'Ambient',
  'EDM',
  'Bollywood',
];

interface TuneFreeState {
  homeSections: TuneFreeSection[];
  exploreSections: TuneFreeSection[];
  popularArtists: { id: string; name: string; image: string }[];
  newReleases: { title: string; items: Track[] }[];
  selectedGenre: string;
  genreTracks: Track[];
  isLoading: boolean;
  isGenreLoading: boolean;
  error: string | null;

  // Search state
  searchQuery: string;
  searchResults: UnifiedSearchResults;
  suggestions: string[];
  isSearching: boolean;

  // Actions
  fetchBrowseFeed: (forceRefresh?: boolean) => Promise<void>;
  fetchNewReleases: () => Promise<void>;
  selectGenre: (genre: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
}

export const useTuneFreeStore = create<TuneFreeState>((set, get) => ({
  homeSections: [],
  exploreSections: [],
  popularArtists: [],
  newReleases: [],
  selectedGenre: 'Pop',
  genreTracks: [],
  isLoading: false,
  isGenreLoading: false,
  error: null,

  searchQuery: '',
  searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
  suggestions: [],
  isSearching: false,

  fetchBrowseFeed: async (forceRefresh = false) => {
    const { homeSections, isLoading } = get();
    if (!forceRefresh && homeSections.length > 0) return;
    if (isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const [browseData, newReleasesData] = await Promise.allSettled([
        tuneFreeApi.getBrowseSections(),
        tuneFreeApi.getNewReleases(),
      ]);

      const browse = browseData.status === 'fulfilled' ? browseData.value : { homeSections: [], exploreSections: [], popularArtists: [] };
      const newReleases = newReleasesData.status === 'fulfilled' ? newReleasesData.value : [];

      set({
        homeSections: browse.homeSections,
        exploreSections: browse.exploreSections,
        popularArtists: browse.popularArtists,
        newReleases,
        isLoading: false,
      });

      // Also trigger initial genre tracks
      if (get().genreTracks.length === 0) {
        get().selectGenre(get().selectedGenre);
      }
    } catch (e: any) {
      console.warn('[TuneFreeStore] Feed error:', e);
      set({ isLoading: false, error: e?.message || 'Failed to load TuneFree feed' });
    }
  },

  fetchNewReleases: async () => {
    try {
      const newReleases = await tuneFreeApi.getNewReleases();
      set({ newReleases });
    } catch (e) {
      console.warn('[TuneFreeStore] Fetch new releases error:', e);
    }
  },

  selectGenre: async (genre: string) => {
    set({ selectedGenre: genre, isGenreLoading: true });
    try {
      const results = await tuneFreeApi.search(`${genre} hits`, 'track');
      set({ genreTracks: results.tracks, isGenreLoading: false });
    } catch (e) {
      set({ isGenreLoading: false });
    }
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({
        searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
        isSearching: false,
      });
      return;
    }

    set({ isSearching: true, searchQuery: query });
    try {
      const results = await tuneFreeApi.search(query);
      set({ searchResults: results, isSearching: false });
    } catch (e) {
      set({ isSearching: false });
    }
  },

  fetchSuggestions: async (query: string) => {
    if (!query.trim()) {
      set({ suggestions: [] });
      return;
    }
    const suggestions = await tuneFreeApi.getSuggestions(query);
    set({ suggestions });
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  clearSearch: () =>
    set({
      searchQuery: '',
      searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
      suggestions: [],
      isSearching: false,
    }),
}));
