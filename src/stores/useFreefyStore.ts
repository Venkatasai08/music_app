// Freefy Curated Channels, Live Radios & Search Store
// Full state management for Freefy BeMusic Engine

import { create } from 'zustand';
import { Track, Album, Artist, Playlist, LiveRadioStation } from '../types/music';
import { UnifiedSearchResults } from '../types/engine';
import { freefyApi } from '../api/freefyApi';

interface FreefyState {
  featuredTracks: Track[];
  featuredPlaylists: Playlist[];
  featuredAlbums: Album[];
  topArtists: Artist[];
  liveRadios: LiveRadioStation[];
  countries: { name: string; code: string; stationcount?: number }[];
  selectedCountry: string | null;
  selectedTag: string | null;
  genres: { id: string; name: string; image?: string }[];
  isChannelLoading: boolean;
  isRadiosLoading: boolean;
  channelError: string | null;

  // Search state
  searchQuery: string;
  searchResults: UnifiedSearchResults;
  isSearching: boolean;

  // Actions
  fetchCuratedChannels: (force?: boolean) => Promise<void>;
  fetchLiveRadios: () => Promise<void>;
  filterRadiosByCountry: (countryCode: string | null) => Promise<void>;
  filterRadiosByTag: (tag: string | null) => Promise<void>;
  search: (query: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
}

export const useFreefyStore = create<FreefyState>((set, get) => ({
  featuredTracks: [],
  featuredPlaylists: [],
  featuredAlbums: [],
  topArtists: [],
  liveRadios: [],
  countries: [],
  selectedCountry: null,
  selectedTag: null,
  genres: [],
  isChannelLoading: false,
  isRadiosLoading: false,
  channelError: null,

  searchQuery: '',
  searchResults: {
    tracks: [],
    albums: [],
    artists: [],
    playlists: [],
    radios: [],
  },
  isSearching: false,

  fetchCuratedChannels: async (force = false) => {
    if (!force && get().featuredTracks.length > 0) return;
    set({ isChannelLoading: true, channelError: null });

    try {
      const [channelsData, liveRadios, countries] = await Promise.all([
        freefyApi.getCuratedChannels(),
        freefyApi.getLiveRadios(1, 30),
        freefyApi.getCountries(),
      ]);

      let tracks = channelsData.featuredTracks;
      let playlists = channelsData.featuredPlaylists;
      let albums = channelsData.featuredAlbums;
      let artists = channelsData.topArtists;
      let genres = channelsData.genres;

      // If curated discover returned empty, fallback to unified search
      if (tracks.length === 0) {
        const searchFallback = await freefyApi.searchUnified('Top Hits', 30);
        tracks = searchFallback.tracks;
        playlists = searchFallback.playlists;
        albums = searchFallback.albums;
        artists = searchFallback.artists;
      }

      set({
        featuredTracks: tracks,
        featuredPlaylists: playlists,
        featuredAlbums: albums,
        topArtists: artists,
        liveRadios: liveRadios.length > 0 ? liveRadios : [],
        countries,
        genres: genres.length > 0 ? genres : await freefyApi.getGenres(),
        isChannelLoading: false,
        channelError: null,
      });
    } catch (e: any) {
      console.warn('[FreefyStore] Fetch error:', e);
      set({ isChannelLoading: false, channelError: e?.message || 'Failed to load Freefy channels' });
    }
  },

  fetchLiveRadios: async () => {
    set({ isRadiosLoading: true });
    try {
      const radios = await freefyApi.getLiveRadios(1, 30);
      set({ liveRadios: radios, isRadiosLoading: false });
    } catch (e) {
      set({ isRadiosLoading: false });
    }
  },

  filterRadiosByCountry: async (countryCode: string | null) => {
    set({ selectedCountry: countryCode, selectedTag: null, isRadiosLoading: true });
    try {
      if (!countryCode) {
        const radios = await freefyApi.getLiveRadios(1, 30);
        set({ liveRadios: radios, isRadiosLoading: false });
      } else {
        const radios = await freefyApi.getRadiosByCountry(countryCode, 1, 30);
        set({ liveRadios: radios, isRadiosLoading: false });
      }
    } catch (e) {
      set({ isRadiosLoading: false });
    }
  },

  filterRadiosByTag: async (tag: string | null) => {
    set({ selectedTag: tag, selectedCountry: null, isRadiosLoading: true });
    try {
      if (!tag) {
        const radios = await freefyApi.getLiveRadios(1, 30);
        set({ liveRadios: radios, isRadiosLoading: false });
      } else {
        const radios = await freefyApi.getRadiosByTag(tag, 1, 30);
        set({ liveRadios: radios, isRadiosLoading: false });
      }
    } catch (e) {
      set({ isRadiosLoading: false });
    }
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({
        searchResults: { tracks: [], albums: [], artists: [], playlists: [], radios: [] },
        isSearching: false,
      });
      return;
    }

    set({ isSearching: true, searchQuery: query });
    try {
      const results = await freefyApi.searchUnified(query);
      set({ searchResults: results, isSearching: false });
    } catch (e) {
      set({ isSearching: false });
    }
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  clearSearch: () =>
    set({
      searchQuery: '',
      searchResults: { tracks: [], albums: [], artists: [], playlists: [], radios: [] },
      isSearching: false,
    }),
}));
