// ListenFree Feed, Multi-Language Discovery, Cache and Supabase State Store

import { create } from 'zustand';
import { Track, Album, Artist, Playlist, VideoPreview } from '../types/music';
import { SupabaseRoomMetadata } from '../types/supabase';
import { UnifiedSearchResults } from '../types/engine';
import { listenFreeApi } from '../api/listenFreeApi';

export type LanguageCategory = 'all' | 'hindi' | 'english' | 'telugu' | 'tamil' | 'punjabi';

interface ListenFreeState {
  selectedLanguage: LanguageCategory;
  trendingTracks: Track[];
  topHitsTracks: Track[];
  mostSearchedTracks: Track[];
  spotlightTracks: Track[];
  featuredAlbums: Album[];
  topArtists: Artist[];
  featuredPlaylists: Playlist[];
  videoPreviews: VideoPreview[];
  liveRooms: SupabaseRoomMetadata[];
  languageCharts: Record<LanguageCategory, Track[]>;
  isFeedLoading: boolean;
  isRoomsLoading: boolean;
  feedError: string | null;

  // Search state
  searchQuery: string;
  searchResults: UnifiedSearchResults;
  isSearching: boolean;

  // Actions
  setSelectedLanguage: (lang: LanguageCategory) => Promise<void>;
  fetchLanguageChart: (lang: LanguageCategory) => Promise<Track[]>;
  fetchHomeFeed: (forceRefresh?: boolean) => Promise<void>;
  fetchLiveRooms: () => Promise<void>;
  createLiveRoom: (name: string) => Promise<SupabaseRoomMetadata | null>;
  search: (query: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
}

const LANGUAGE_SEARCH_CONFIG: Record<
  LanguageCategory,
  {
    trending: string;
    topHits: string;
    mostSearched: string;
    spotlight: string;
    albumSearch: string;
    artistSearch: string;
    playlistSearch: string;
  }
> = {
  all: {
    trending: 'trending top hits',
    topHits: 'top hits 2024',
    mostSearched: 'most searched bollywood',
    spotlight: 'Arijit Singh',
    albumSearch: 'Bollywood Hits',
    artistSearch: 'Popular Artists',
    playlistSearch: 'Top 50',
  },
  hindi: {
    trending: 'trending hindi',
    topHits: 'top hindi hits',
    mostSearched: 'most searched hindi',
    spotlight: 'Arijit Singh Shreya Ghoshal',
    albumSearch: 'Hindi Hits',
    artistSearch: 'Arijit Singh Kishore Kumar Shreya Ghoshal',
    playlistSearch: 'Best of Romance Hindi',
  },
  english: {
    trending: 'trending english',
    topHits: 'top english billboard',
    mostSearched: 'pop classics english',
    spotlight: 'Taylor Swift The Weeknd',
    albumSearch: 'Global Hits',
    artistSearch: 'Taylor Swift The Weeknd Dua Lipa',
    playlistSearch: 'English Viral Hits',
  },
  telugu: {
    trending: 'trending telugu',
    topHits: 'top telugu hits',
    mostSearched: 'most searched telugu',
    spotlight: 'Sid Sriram Anirudh',
    albumSearch: 'Tollywood Hits',
    artistSearch: 'Anirudh SPB Sid Sriram Devi Sri Prasad',
    playlistSearch: 'House Party Telugu',
  },
  tamil: {
    trending: 'trending tamil',
    topHits: 'top tamil hits',
    mostSearched: 'most searched tamil',
    spotlight: 'Anirudh Ravichander AR Rahman',
    albumSearch: 'Kollywood Hits',
    artistSearch: 'Anirudh AR Rahman Harris Jayaraj',
    playlistSearch: 'Tamil Melody Hits',
  },
  punjabi: {
    trending: 'trending punjabi',
    topHits: 'punjabi top hits 2024',
    mostSearched: 'punjabi hits',
    spotlight: 'Diljit Dosanjh Karan Aujla',
    albumSearch: 'Punjabi Hits',
    artistSearch: 'Diljit Dosanjh AP Dhillon Karan Aujla',
    playlistSearch: 'Punjabi 101',
  },
};

export const useListenFreeStore = create<ListenFreeState>((set, get) => ({
  selectedLanguage: 'all',
  trendingTracks: [],
  topHitsTracks: [],
  mostSearchedTracks: [],
  spotlightTracks: [],
  featuredAlbums: [],
  topArtists: [],
  featuredPlaylists: [],
  videoPreviews: [],
  liveRooms: [],
  languageCharts: {
    all: [],
    hindi: [],
    english: [],
    telugu: [],
    tamil: [],
    punjabi: [],
  },
  isFeedLoading: false,
  isRoomsLoading: false,
  feedError: null,

  searchQuery: '',
  searchResults: {
    tracks: [],
    albums: [],
    artists: [],
    playlists: [],
    radios: [],
  },
  isSearching: false,

  setSelectedLanguage: async (lang: LanguageCategory) => {
    set({ selectedLanguage: lang });
    const cached = get().languageCharts[lang];
    if (cached && cached.length > 0) {
      set({ topHitsTracks: cached });
    } else {
      await get().fetchLanguageChart(lang);
    }
  },

  fetchLanguageChart: async (lang: LanguageCategory) => {
    const existing = get().languageCharts[lang];
    if (existing && existing.length > 0) return existing;

    const config = LANGUAGE_SEARCH_CONFIG[lang] || LANGUAGE_SEARCH_CONFIG.all;
    try {
      const results = await listenFreeApi.searchSongs(config.topHits, 15);
      if (results && results.length > 0) {
        set((s) => ({
          languageCharts: {
            ...s.languageCharts,
            [lang]: results,
          },
          topHitsTracks: s.selectedLanguage === lang ? results : s.topHitsTracks,
        }));
        return results;
      }
    } catch (e) {
      // fallback
    }
    return [];
  },

  fetchHomeFeed: async (forceRefresh = false) => {
    const { selectedLanguage, trendingTracks, isFeedLoading } = get();
    if (!forceRefresh && trendingTracks.length > 0) return; // cache hit
    if (isFeedLoading) return;

    set({ isFeedLoading: true, feedError: null });

    const config = LANGUAGE_SEARCH_CONFIG[selectedLanguage] || LANGUAGE_SEARCH_CONFIG.all;

    try {
      // Parallel fetch discovery categories + prefetch top language charts
      const [
        trendingList,
        topHitsList,
        mostSearchedList,
        spotlightList,
        albumResults,
        artistResults,
        playlistResults,
        videoPreviews,
        liveRooms,
        hindiList,
        englishList,
        teluguList,
        tamilList,
        punjabiList,
      ] = await Promise.allSettled([
        listenFreeApi.searchSongs(config.trending, 15),
        listenFreeApi.searchSongs(config.topHits, 15),
        listenFreeApi.searchSongs(config.mostSearched, 15),
        listenFreeApi.searchSongs(config.spotlight, 15),
        listenFreeApi.searchAlbums(config.albumSearch, 10),
        listenFreeApi.searchArtists(config.artistSearch, 10),
        listenFreeApi.globalSearch(config.playlistSearch),
        listenFreeApi.getVideoPreviews(),
        listenFreeApi.getLiveRooms(),
        listenFreeApi.searchSongs(LANGUAGE_SEARCH_CONFIG.hindi.topHits, 12),
        listenFreeApi.searchSongs(LANGUAGE_SEARCH_CONFIG.english.topHits, 12),
        listenFreeApi.searchSongs(LANGUAGE_SEARCH_CONFIG.telugu.topHits, 12),
        listenFreeApi.searchSongs(LANGUAGE_SEARCH_CONFIG.tamil.topHits, 12),
        listenFreeApi.searchSongs(LANGUAGE_SEARCH_CONFIG.punjabi.topHits, 12),
      ]);

      const trendingTracks =
        trendingList.status === 'fulfilled' && trendingList.value.length > 0
          ? trendingList.value
          : [];

      const topHitsTracks =
        topHitsList.status === 'fulfilled' && topHitsList.value.length > 0
          ? topHitsList.value
          : trendingTracks;

      const mostSearchedTracks =
        mostSearchedList.status === 'fulfilled' && mostSearchedList.value.length > 0
          ? mostSearchedList.value
          : [];

      const spotlightTracks =
        spotlightList.status === 'fulfilled' && spotlightList.value.length > 0
          ? spotlightList.value
          : [];

      const featuredAlbums =
        albumResults.status === 'fulfilled' && albumResults.value.length > 0
          ? albumResults.value
          : [];

      const topArtists =
        artistResults.status === 'fulfilled' && artistResults.value.length > 0
          ? artistResults.value
          : [];

      const featuredPlaylists =
        playlistResults.status === 'fulfilled' && playlistResults.value.playlists.length > 0
          ? playlistResults.value.playlists
          : [];

      const previews =
        videoPreviews.status === 'fulfilled' && videoPreviews.value.length > 0
          ? videoPreviews.value
          : trendingTracks.slice(0, 12).map((t) => ({
              id: `preview-${t.id}`,
              title: t.name,
              artist: t.artist,
              videoUrl: t.streamUrl || '',
              thumbnailUrl: t.image || t.thumbnailImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
              duration: t.duration || 210,
              songId: t.id,
              sourceEngine: 'listen_free' as const,
            }));

      const rooms =
        liveRooms.status === 'fulfilled' && liveRooms.value.length > 0
          ? liveRooms.value
          : [];

      const languageCharts: Record<LanguageCategory, Track[]> = {
        all: topHitsTracks.length > 0 ? topHitsTracks : trendingTracks,
        hindi: hindiList.status === 'fulfilled' ? hindiList.value : [],
        english: englishList.status === 'fulfilled' ? englishList.value : [],
        telugu: teluguList.status === 'fulfilled' ? teluguList.value : [],
        tamil: tamilList.status === 'fulfilled' ? tamilList.value : [],
        punjabi: punjabiList.status === 'fulfilled' ? punjabiList.value : [],
      };

      set({
        trendingTracks,
        topHitsTracks,
        mostSearchedTracks,
        spotlightTracks,
        featuredAlbums,
        topArtists,
        featuredPlaylists,
        videoPreviews: previews,
        liveRooms: rooms,
        languageCharts,
        isFeedLoading: false,
      });
    } catch (e: any) {
      console.warn('[ListenFreeStore] Feed error:', e);
      set({ isFeedLoading: false, feedError: e?.message || 'Failed to load ListenFree feed' });
    }
  },

  fetchLiveRooms: async () => {
    set({ isRoomsLoading: true });
    try {
      const liveRooms = await listenFreeApi.getLiveRooms();
      set({ liveRooms, isRoomsLoading: false });
    } catch (e) {
      set({ isRoomsLoading: false });
    }
  },

  createLiveRoom: async (name: string) => {
    const room = await listenFreeApi.createLiveRoom(name);
    if (room) {
      set((s) => ({ liveRooms: [room, ...s.liveRooms] }));
    }
    return room;
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
      const results = await listenFreeApi.globalSearch(query);
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
