// Song Options Bottom Sheet State Store

import { create } from 'zustand';
import { Track } from '../types/music';

interface SongOptionsState {
  isOpen: boolean;
  track: Track | null;
  queueContext?: Track[];
  openSongOptions: (track: Track, queueContext?: Track[]) => void;
  closeSongOptions: () => void;
}

export const useSongOptionsStore = create<SongOptionsState>((set) => ({
  isOpen: false,
  track: null,
  queueContext: undefined,
  openSongOptions: (track, queueContext) =>
    set({ isOpen: true, track, queueContext }),
  closeSongOptions: () => set({ isOpen: false, track: null, queueContext: undefined }),
}));
