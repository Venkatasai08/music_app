// User Library, Favorites & Playlist Store with Local Persistence

import { create } from 'zustand';
import { Track, Playlist } from '../types/music';
import { storage } from '../utils/storage';

interface LibraryState {
  favorites: Track[];
  customPlaylists: Playlist[];
  likedPlaylists: Playlist[];
  recentlyPlayed: Track[];
  downloadHistory: Track[];
  isLoaded: boolean;

  // Actions
  loadLibrary: () => Promise<void>;
  toggleFavorite: (track: Track) => void;
  isFavorite: (trackId: string) => boolean;

  // Custom Playlists Actions
  createPlaylist: (name: string, description?: string, image?: string) => Playlist;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;

  // Liked Playlists Actions
  toggleLikePlaylist: (playlist: Playlist) => void;
  isPlaylistLiked: (playlistId: string) => boolean;

  // History & Downloads
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
  addToDownloadHistory: (track: Track) => void;
  clearDownloadHistory: () => void;
}

const STORAGE_FAVORITES = '@music_app_favorites';
const STORAGE_PLAYLISTS = '@music_app_playlists';
const STORAGE_LIKED_PLAYLISTS = '@music_app_liked_playlists';
const STORAGE_HISTORY = '@music_app_history';
const STORAGE_DOWNLOAD_HISTORY = '@music_app_download_history';

export const useLibraryStore = create<LibraryState>((set, get) => ({
  favorites: [],
  customPlaylists: [],
  likedPlaylists: [],
  recentlyPlayed: [],
  downloadHistory: [],
  isLoaded: false,

  loadLibrary: async () => {
    const favorites = await storage.getItem<Track[]>(STORAGE_FAVORITES, []);
    const customPlaylists = await storage.getItem<Playlist[]>(STORAGE_PLAYLISTS, [
      {
        id: 'pl_favorites_default',
        name: 'My Vibe Mix',
        description: 'Auto-curated offline library',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
        trackCount: 0,
        tracks: [],
        sourceEngine: 'listen_free',
      },
    ]);
    const likedPlaylists = await storage.getItem<Playlist[]>(STORAGE_LIKED_PLAYLISTS, [
      {
        id: 'liked_hits_spotlight',
        name: 'Trending Hits Collection',
        description: 'Curated world hits playlist',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
        trackCount: 15,
        tracks: [],
        sourceEngine: 'listen_free',
      },
    ]);
    const recentlyPlayed = await storage.getItem<Track[]>(STORAGE_HISTORY, []);
    const downloadHistory = await storage.getItem<Track[]>(STORAGE_DOWNLOAD_HISTORY, []);

    set({
      favorites,
      customPlaylists,
      likedPlaylists,
      recentlyPlayed,
      downloadHistory,
      isLoaded: true,
    });
  },

  toggleFavorite: (track: Track) => {
    const { favorites } = get();
    const exists = favorites.some((t) => t.id === track.id);
    let updated: Track[];

    if (exists) {
      updated = favorites.filter((t) => t.id !== track.id);
    } else {
      updated = [track, ...favorites];
    }

    set({ favorites: updated });
    storage.setItem(STORAGE_FAVORITES, updated);
  },

  isFavorite: (trackId: string) => {
    return get().favorites.some((t) => t.id === trackId);
  },

  createPlaylist: (name: string, description?: string, image?: string) => {
    const defaultCovers = [
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
    ];
    const pickedCover = image || defaultCovers[Math.floor(Math.random() * defaultCovers.length)];

    const newPlaylist: Playlist = {
      id: 'custom_' + Date.now(),
      name: name.trim() || `My Playlist #${get().customPlaylists.length + 1}`,
      description: description || 'Personal playlist collection',
      image: pickedCover,
      trackCount: 0,
      tracks: [],
      sourceEngine: 'listen_free',
    };

    const updated = [newPlaylist, ...get().customPlaylists];
    set({ customPlaylists: updated });
    storage.setItem(STORAGE_PLAYLISTS, updated);
    return newPlaylist;
  },

  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => {
    const updated = get().customPlaylists.map((p) => {
      if (p.id === playlistId) {
        return { ...p, ...updates };
      }
      return p;
    });
    set({ customPlaylists: updated });
    storage.setItem(STORAGE_PLAYLISTS, updated);
  },

  deletePlaylist: (playlistId: string) => {
    const updated = get().customPlaylists.filter((p) => p.id !== playlistId);
    set({ customPlaylists: updated });
    storage.setItem(STORAGE_PLAYLISTS, updated);
  },

  addTrackToPlaylist: (playlistId: string, track: Track) => {
    const list = get().customPlaylists;
    const exists = list.some((p) => p.id === playlistId);
    let updated: Playlist[];

    if (exists) {
      updated = list.map((p) => {
        if (p.id === playlistId) {
          const existingTracks = p.tracks || [];
          if (existingTracks.some((t) => t.id === track.id)) return p;
          const tracks = [...existingTracks, track];
          const cover = p.image || track.image || track.thumbnailImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80';
          return { ...p, tracks, trackCount: tracks.length, image: cover };
        }
        return p;
      });
    } else {
      const liked = get().likedPlaylists.find((p) => p.id === playlistId);
      const newP: Playlist = liked
        ? { ...liked, tracks: [track], trackCount: 1 }
        : {
            id: playlistId,
            name: 'My Playlist',
            tracks: [track],
            trackCount: 1,
            image: track.image || track.thumbnailImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
            sourceEngine: 'listen_free',
          };
      updated = [newP, ...list];
    }

    set({ customPlaylists: updated });
    storage.setItem(STORAGE_PLAYLISTS, updated);
  },

  removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
    const updated = get().customPlaylists.map((p) => {
      if (p.id === playlistId) {
        const tracks = (p.tracks || []).filter((t) => t.id !== trackId);
        return { ...p, tracks, trackCount: tracks.length };
      }
      return p;
    });

    set({ customPlaylists: updated });
    storage.setItem(STORAGE_PLAYLISTS, updated);
  },

  toggleLikePlaylist: (playlist: Playlist) => {
    const { likedPlaylists } = get();
    const exists = likedPlaylists.some((p) => p.id === playlist.id);
    let updated: Playlist[];

    if (exists) {
      updated = likedPlaylists.filter((p) => p.id !== playlist.id);
    } else {
      updated = [playlist, ...likedPlaylists];
    }

    set({ likedPlaylists: updated });
    storage.setItem(STORAGE_LIKED_PLAYLISTS, updated);
  },

  isPlaylistLiked: (playlistId: string) => {
    return get().likedPlaylists.some((p) => p.id === playlistId);
  },

  addToHistory: (track: Track) => {
    const current = get().recentlyPlayed.filter((t) => t.id !== track.id);
    const updated = [track, ...current].slice(0, 50);
    set({ recentlyPlayed: updated });
    storage.setItem(STORAGE_HISTORY, updated);
  },

  clearHistory: () => {
    set({ recentlyPlayed: [] });
    storage.setItem(STORAGE_HISTORY, []);
  },

  addToDownloadHistory: (track: Track) => {
    const current = get().downloadHistory.filter((t) => t.id !== track.id);
    const updated = [track, ...current].slice(0, 50);
    set({ downloadHistory: updated });
    storage.setItem(STORAGE_DOWNLOAD_HISTORY, updated);
  },

  clearDownloadHistory: () => {
    set({ downloadHistory: [] });
    storage.setItem(STORAGE_DOWNLOAD_HISTORY, []);
  },
}));
