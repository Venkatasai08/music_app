// Download Manager State Store (Zustand + AsyncStorage)

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Track, AudioQuality } from '../types/music';
import { downloadService } from '../services/downloadService';
import { useLibraryStore } from './useLibraryStore';

const STORAGE_KEY = '@dual_engine_downloaded_tracks_v1';

export interface DownloadedItem {
  track: Track;
  localUri: string;
  publicPath?: string;
  assetId?: string;
  timestamp: number;
}

interface DownloadState {
  downloadingProgress: Record<string, number>; // trackId -> 0.0 - 1.0
  downloadedTracks: Record<string, DownloadedItem>; // trackId -> DownloadedItem
  lastDownloadedTrack: Track | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  downloadTrack: (track: Track, preferredQuality?: AudioQuality) => Promise<boolean>;
  downloadCutTrack: (track: Track, startSec: number, endSec: number, preferredQuality?: AudioQuality) => Promise<boolean>;
  isDownloaded: (trackId: string) => boolean;
  getProgress: (trackId: string) => number | null;
  removeDownloadedTrack: (trackId: string) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloadingProgress: {},
  downloadedTracks: {},
  lastDownloadedTrack: null,
  error: null,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ downloadedTracks: parsed });
      }
    } catch (e) {
      console.warn('[DownloadStore] Init error:', e);
    }
  },

  downloadTrack: async (track: Track, preferredQuality: AudioQuality = '320kbps') => {
    if (!track || !track.id) return false;

    // Check if already downloading
    if (get().downloadingProgress[track.id] !== undefined) {
      return false;
    }

    // Set initial progress
    set((state) => ({
      downloadingProgress: { ...state.downloadingProgress, [track.id]: 0.05 },
      error: null,
    }));

    try {
      const result = await downloadService.downloadTrack(
        track,
        preferredQuality,
        (progress) => {
          set((state) => ({
            downloadingProgress: { ...state.downloadingProgress, [track.id]: progress },
          }));
        }
      );

      if (result.success && result.localUri) {
        const item: DownloadedItem = {
          track,
          localUri: result.localUri,
          publicPath: result.publicPath,
          assetId: result.assetId,
          timestamp: Date.now(),
        };

        const updated = {
          ...get().downloadedTracks,
          [track.id]: item,
        };

        // Remove from active downloading map
        const nextProgress = { ...get().downloadingProgress };
        delete nextProgress[track.id];

        set({
          downloadedTracks: updated,
          downloadingProgress: nextProgress,
          lastDownloadedTrack: track,
        });

        useLibraryStore.getState().addToDownloadHistory(track);

        // Save to AsyncStorage
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (storageErr) {
          console.warn('[DownloadStore] Storage save failed:', storageErr);
        }

        return true;
      } else {
        const nextProgress = { ...get().downloadingProgress };
        delete nextProgress[track.id];
        set({
          downloadingProgress: nextProgress,
          error: result.error || 'Failed to download song.',
        });
        return false;
      }
    } catch (err: any) {
      const nextProgress = { ...get().downloadingProgress };
      delete nextProgress[track.id];
      set({
        downloadingProgress: nextProgress,
        error: err?.message || 'Download error.',
      });
      return false;
    }
  },

  downloadCutTrack: async (track: Track, startSec: number, endSec: number, preferredQuality: AudioQuality = '320kbps') => {
    if (!track || !track.id) return false;

    // Key with cut suffix so it doesn't collide
    const cutTrackId = `${track.id}_cut_${Math.round(startSec)}_${Math.round(endSec)}`;

    if (get().downloadingProgress[cutTrackId] !== undefined) {
      return false;
    }

    set((state) => ({
      downloadingProgress: { ...state.downloadingProgress, [cutTrackId]: 0.05 },
      error: null,
    }));

    try {
      const result = await downloadService.downloadCutTrack(
        track,
        startSec,
        endSec,
        preferredQuality,
        (progress) => {
          set((state) => ({
            downloadingProgress: { ...state.downloadingProgress, [cutTrackId]: progress },
          }));
        }
      );

      if (result.success && result.localUri) {
        const item: DownloadedItem = {
          track: {
            ...track,
            name: `${track.name} (Snippet)`,
            duration: Math.max(1, Math.round(endSec - startSec)),
          },
          localUri: result.localUri,
          publicPath: result.publicPath,
          assetId: result.assetId,
          timestamp: Date.now(),
        };

        const updated = {
          ...get().downloadedTracks,
          [cutTrackId]: item,
        };

        const nextProgress = { ...get().downloadingProgress };
        delete nextProgress[cutTrackId];

        set({
          downloadedTracks: updated,
          downloadingProgress: nextProgress,
          lastDownloadedTrack: item.track,
        });

        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (storageErr) {
          console.warn('[DownloadStore] Storage save failed:', storageErr);
        }

        return true;
      } else {
        const nextProgress = { ...get().downloadingProgress };
        delete nextProgress[cutTrackId];
        set({
          downloadingProgress: nextProgress,
          error: result.error || 'Failed to download cut audio.',
        });
        return false;
      }
    } catch (err: any) {
      const nextProgress = { ...get().downloadingProgress };
      delete nextProgress[cutTrackId];
      set({
        downloadingProgress: nextProgress,
        error: err?.message || 'Download error.',
      });
      return false;
    }
  },

  isDownloaded: (trackId: string) => {
    return !!get().downloadedTracks[trackId];
  },

  getProgress: (trackId: string) => {
    return get().downloadingProgress[trackId] ?? null;
  },

  removeDownloadedTrack: async (trackId: string) => {
    const item = get().downloadedTracks[trackId];
    if (item) {
      if (item.localUri) {
        try {
          await FileSystem.deleteAsync(item.localUri, { idempotent: true });
        } catch (e) {
          console.warn('[DownloadStore] File delete error:', e);
        }
      }
      if (item.publicPath) {
        try {
          await FileSystem.deleteAsync(item.publicPath, { idempotent: true });
        } catch (e) {
          console.warn('[DownloadStore] Public path delete error:', e);
        }
      }
    }

    const updated = { ...get().downloadedTracks };
    delete updated[trackId];

    set({ downloadedTracks: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  clearAllDownloads: async () => {
    try {
      const targetDir = `${FileSystem.documentDirectory}Music/`;
      await FileSystem.deleteAsync(targetDir, { idempotent: true });
    } catch (e) {
      console.warn('[DownloadStore] Clear all error:', e);
    }

    set({ downloadedTracks: {}, downloadingProgress: {} });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));

// Initialize store on import
useDownloadStore.getState().initialize();
