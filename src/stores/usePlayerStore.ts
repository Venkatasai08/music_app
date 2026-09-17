// Central Audio Playback & Media Orchestrator Store (Powered by Expo Audio)

import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
import { Track, AudioQuality, RepeatMode, LyricLine, LiveRadioStation, TrackPlayRange } from '../types/music';
import { selectStreamUrlByQuality, getPrioritizedStreamUrls, sanitizeAudioUrl, extractString } from '../utils/audioUtils';
import { findActiveLyricIndex } from '../utils/lyricParser';
import { listenFreeApi } from '../api/listenFreeApi';
import { freefyApi } from '../api/freefyApi';
import { tuneFreeApi } from '../api/tuneFreeApi';
import { useLibraryStore } from './useLibraryStore';
import { storage } from '../utils/storage';

interface PlayerState {
  sound: AudioPlayer | null;
  currentTrack: Track | null;
  currentRadio: LiveRadioStation | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  preferredQuality: AudioQuality;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  lyrics: LyricLine[];
  plainLyrics: string | null;
  activeLyricIndex: number;
  isFullPlayerVisible: boolean;
  isLyricsVisible: boolean;
  playbackSpeed: number;
  playbackError: string | null;

  // Play Range (Snippets / Range Audio)
  isPlayRangeEnabled: boolean;
  defaultPlayRange: { startSec: number; endSec: number };
  trackPlayRanges: Record<string, TrackPlayRange>;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  playRadio: (radio: LiveRadioStation) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  pause: () => Promise<void>;
  closePlayer: () => Promise<void>;
  play: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: (force?: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setPlaybackSpeed: (speed: number) => Promise<void>;
  setPreferredQuality: (quality: AudioQuality) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setFullPlayerVisible: (visible: boolean) => void;
  setLyricsVisible: (visible: boolean) => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  fetchLyricsForCurrentTrack: () => Promise<void>;
  dismissError: () => void;

  // Play Range Actions
  loadSavedPlayRanges: () => Promise<void>;
  togglePlayRangeMode: (enabled?: boolean) => void;
  setTrackPlayRange: (trackId: string, range: Partial<TrackPlayRange>) => void;
  removeTrackPlayRange: (trackId: string) => void;
  setDefaultPlayRange: (range: { startSec: number; endSec: number }) => void;
  getEffectivePlayRange: (track?: Track | null) => {
    startSec: number;
    endSec: number;
    isRangeActive: boolean;
    hasCustomRange: boolean;
  };
}

// Storage Keys
const STORAGE_RANGE_ENABLED = '@music_app_range_enabled';
const STORAGE_RANGE_DEFAULT = '@music_app_range_default';
const STORAGE_RANGE_TRACKS = '@music_app_range_tracks';

// Configure background audio mode & playback session tracking
let isAudioModeConfigured = false;
let userIntentPlaying: boolean | null = null;
let lastUserPlayPauseTime = 0;
let isTransitioningTrack = false;
let playSessionCounter = 0;

async function ensureAudioMode() {
  if (isAudioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
    isAudioModeConfigured = true;
  } catch (e) {
    console.warn('[Audio] Failed to set audio mode:', e);
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  sound: null,
  currentTrack: null,
  currentRadio: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  isBuffering: false,
  positionMs: 0,
  durationMs: 0,
  volume: 1.0,
  preferredQuality: '320kbps',
  repeatMode: 'off',
  isShuffle: false,
  lyrics: [],
  plainLyrics: null,
  activeLyricIndex: -1,
  isFullPlayerVisible: false,
  isLyricsVisible: false,
  playbackSpeed: 1.0,
  playbackError: null,

  // Play Range (Snippets / Range Audio)
  isPlayRangeEnabled: false,
  defaultPlayRange: { startSec: 0, endSec: 0 },
  trackPlayRanges: {},

  playTrack: async (track: Track, newQueue?: Track[]) => {
    const currentSessionId = ++playSessionCounter;
    await ensureAudioMode();
    const state = get();

    // Clean up previous player
    if (state.sound) {
      try {
        state.sound.pause();
        state.sound.remove();
      } catch (e) {
        // ignore cleanup error
      }
    }

    let activeTrack: Track = {
      ...track,
      name: extractString(track.name, 'Untitled Track'),
      artist: extractString(track.artist, 'Unknown Artist'),
      album: extractString(track.album, ''),
    };
    const preferredQuality = state.preferredQuality;

    // Immediately set track as current and buffering so UI responds in 0ms
    set({
      currentTrack: activeTrack,
      currentRadio: null,
      isPlaying: true,
      isBuffering: true,
      positionMs: 0,
      durationMs: activeTrack.duration ? activeTrack.duration * 1000 : 0,
      lyrics: [],
      plainLyrics: null,
      activeLyricIndex: -1,
      playbackError: null,
    });

    const isLocalTrack =
      activeTrack.id.startsWith('device_') ||
      Boolean(activeTrack.streamUrl?.startsWith('file:')) ||
      Boolean(activeTrack.streamUrl?.startsWith('content:')) ||
      Boolean(activeTrack.streamUrl?.startsWith('/'));

    // 1. Resolve full stream candidates
    let candidateUrls: string[] = [];

    if (isLocalTrack && activeTrack.streamUrl) {
      candidateUrls = [activeTrack.streamUrl];
    } else {
      candidateUrls = getPrioritizedStreamUrls(
        activeTrack.downloadUrls,
        preferredQuality,
        activeTrack.streamUrl
      );
    }

    if (!isLocalTrack && candidateUrls.length === 0) {
      if (activeTrack.sourceEngine === 'listen_free' && activeTrack.id) {
        try {
          const detailed = await listenFreeApi.getSongDetails(activeTrack.id);
          if (detailed) {
            activeTrack = {
              ...activeTrack,
              ...detailed,
              name: extractString(detailed.name || activeTrack.name, 'Untitled Track'),
              artist: extractString(detailed.artist || activeTrack.artist, 'Unknown Artist'),
              album: extractString(detailed.album || activeTrack.album, ''),
              image: detailed.image || activeTrack.image,
              thumbnailImage: detailed.thumbnailImage || activeTrack.thumbnailImage,
              duration: detailed.duration || activeTrack.duration,
              downloadUrls:
                detailed.downloadUrls && detailed.downloadUrls.length > 0
                  ? detailed.downloadUrls
                  : activeTrack.downloadUrls,
              streamUrl: detailed.streamUrl || activeTrack.streamUrl,
            };
            candidateUrls = getPrioritizedStreamUrls(
              activeTrack.downloadUrls,
              preferredQuality,
              activeTrack.streamUrl
            );
          }
        } catch (e) {
          console.warn('[Player] getSongDetails error:', e);
        }
      } else if (activeTrack.sourceEngine === 'tune_free') {
        try {
          const [matched, resolvedSrc] = await Promise.allSettled([
            listenFreeApi.searchSongs(`${activeTrack.name} ${activeTrack.artist}`, 1),
            tuneFreeApi.resolveTrack(activeTrack.name, activeTrack.artist),
          ]);

          if (matched.status === 'fulfilled' && matched.value.length > 0 && matched.value[0].downloadUrls) {
            const m = matched.value[0];
            activeTrack.downloadUrls = m.downloadUrls;
            activeTrack.streamUrl = m.streamUrl;
            candidateUrls = getPrioritizedStreamUrls(m.downloadUrls, preferredQuality, m.streamUrl);
          }

          if (resolvedSrc.status === 'fulfilled' && resolvedSrc.value) {
            const ytUrl = await listenFreeApi.getYoutubeStreamUrl(resolvedSrc.value);
            if (ytUrl && !candidateUrls.includes(ytUrl)) {
              candidateUrls.push(ytUrl);
            }
          }
        } catch (e) {
          console.warn('[Player] TuneFree resolve error:', e);
        }
      } else if (activeTrack.sourceEngine === 'freefy') {
        try {
          const ytId =
            activeTrack.src && activeTrack.src.length === 11 && !activeTrack.src.includes(' ')
              ? activeTrack.src
              : null;
          const [matched, ytStream] = await Promise.allSettled([
            listenFreeApi.searchSongs(`${activeTrack.name} ${activeTrack.artist}`, 1),
            ytId ? listenFreeApi.getYoutubeStreamUrl(ytId) : Promise.resolve(null),
          ]);

          if (matched.status === 'fulfilled' && matched.value.length > 0 && matched.value[0].downloadUrls) {
            const m = matched.value[0];
            activeTrack.downloadUrls = m.downloadUrls;
            activeTrack.streamUrl = m.streamUrl;
            candidateUrls = getPrioritizedStreamUrls(m.downloadUrls, preferredQuality, m.streamUrl);
          }

          if (ytStream.status === 'fulfilled' && ytStream.value && !candidateUrls.includes(ytStream.value)) {
            candidateUrls.push(ytStream.value);
          }
        } catch (e) {
          console.warn('[Player] Freefy resolve error:', e);
        }
      }
    }

    // Fallback to YouTube stream resolver if no direct CDN links
    if (candidateUrls.length === 0) {
      try {
        const ytFallback = await listenFreeApi.getYoutubeStreamUrl(
          `${activeTrack.name} ${activeTrack.artist}`
        );
        if (ytFallback) {
          candidateUrls.push(ytFallback);
          activeTrack.streamUrl = ytFallback;
        }
      } catch (e) {
        console.warn('[Player] YouTube stream fallback error:', e);
      }
    }

    if (candidateUrls.length === 0) {
      set({
        playbackError: 'Audio stream unavailable for this track.',
        isPlaying: false,
        isBuffering: false,
      });
      return;
    }

    // 2. Determine and enrich queue
    let queue = state.queue;
    let queueIndex = 0;
    if (newQueue && newQueue.length > 0) {
      queue = newQueue.map((q) => (q.id === activeTrack.id ? activeTrack : q));
      queueIndex = queue.findIndex((t) => t.id === activeTrack.id);
      if (queueIndex === -1) queueIndex = 0;
    } else if (queue.length === 0) {
      queue = [activeTrack];
      queueIndex = 0;
    } else {
      const idx = queue.findIndex((t) => t.id === activeTrack.id);
      if (idx !== -1) {
        queue = queue.map((q, i) => (i === idx ? activeTrack : q));
        queueIndex = idx;
      } else {
        queue = [...queue, activeTrack];
        queueIndex = queue.length - 1;
      }
    }

    set({
      currentTrack: activeTrack,
      queue,
      queueIndex,
      durationMs: activeTrack.duration ? activeTrack.duration * 1000 : 0,
    });

    // Record in history
    useLibraryStore.getState().addToHistory(activeTrack);

    // Fetch lyrics asynchronously (non-blocking)
    get().fetchLyricsForCurrentTrack();

    // 3. Play stream with automatic fallback across all candidate URLs
    let lastPositionUpdate = 0;
    userIntentPlaying = null;
    lastUserPlayPauseTime = 0;
    let hasAttemptedYoutubeBackup = false;

    const playCandidate = async (index: number): Promise<boolean> => {
      if (currentSessionId !== playSessionCounter) return false;

      if (index >= candidateUrls.length) {
        // Last-resort YouTube fallback if not yet tried
        if (!hasAttemptedYoutubeBackup) {
          hasAttemptedYoutubeBackup = true;
          try {
            const ytFallback = await listenFreeApi.getYoutubeStreamUrl(
              `${activeTrack.name} ${activeTrack.artist}`
            );
            if (ytFallback && !candidateUrls.includes(ytFallback)) {
              candidateUrls.push(ytFallback);
              return await playCandidate(candidateUrls.length - 1);
            }
          } catch (e) {}
        }

        set({
          playbackError: 'Audio stream unavailable for this track.',
          isPlaying: false,
          isBuffering: false,
        });
        return false;
      }

      const urlToPlay = candidateUrls[index];
      console.log(`[Player] Attempting playback with candidate [${index + 1}/${candidateUrls.length}]:`, urlToPlay);

      try {
        const player = createAudioPlayer(urlToPlay, { updateInterval: 300 });
        player.volume = get().volume;

        (player as any).addListener('playbackStatusUpdate', (status: AudioStatus) => {
          if (currentSessionId !== playSessionCounter) {
            try {
              player.pause();
              player.remove();
            } catch (e) {}
            return;
          }

          if (status.error) {
            console.warn(`[Player] Audio status error on candidate ${index} (${urlToPlay}):`, status.error);
            try {
              player.pause();
              player.remove();
            } catch (e) {}

            // Auto-try next candidate URL seamlessly
            if (index + 1 < candidateUrls.length || !hasAttemptedYoutubeBackup) {
              playCandidate(index + 1);
              return;
            }

            set({ playbackError: status.error, isPlaying: false, isBuffering: false });
            return;
          }

          const now = Date.now();
          let effectivePlaying = status.playing;

          // Prevent state jiggle/flicker when user recently tapped play/pause
          if (userIntentPlaying !== null) {
            if (now - lastUserPlayPauseTime < 800) {
              if (status.playing !== userIntentPlaying) {
                effectivePlaying = userIntentPlaying;
              } else {
                userIntentPlaying = null;
              }
            } else {
              userIntentPlaying = null;
            }
          }

          const posMs = Math.round((status.currentTime || 0) * 1000);
          const durMs =
            Math.round((status.duration || 0) * 1000) ||
            (get().currentTrack?.duration ? get().currentTrack!.duration * 1000 : 0);

          const curState = get();

          const shouldUpdatePos = Math.abs(posMs - lastPositionUpdate) >= 400;
          const shouldUpdateState =
            effectivePlaying !== curState.isPlaying ||
            status.isBuffering !== curState.isBuffering ||
            shouldUpdatePos;

          if (shouldUpdateState) {
            if (shouldUpdatePos) lastPositionUpdate = posMs;

            const lyrics = curState.lyrics;
            const activeIdx = lyrics.length > 0 ? findActiveLyricIndex(lyrics, posMs) : -1;

            set({
              isPlaying: effectivePlaying,
              isBuffering: status.isBuffering,
              positionMs: posMs,
              durationMs: durMs,
              activeLyricIndex: activeIdx,
            });
          }

          // Play Range Auto-Transition check (Skip to next song when range end is reached)
          const rangeInfo = get().getEffectivePlayRange(get().currentTrack);
          if (rangeInfo.isRangeActive && rangeInfo.endSec > 0) {
            const endMs = rangeInfo.endSec * 1000;
            if (posMs >= endMs - 350 && effectivePlaying && !isTransitioningTrack) {
              isTransitioningTrack = true;
              setTimeout(() => {
                isTransitioningTrack = false;
              }, 1200);

              const repeat = get().repeatMode;
              if (repeat === 'one') {
                player.seekTo(rangeInfo.startSec).then(() => player.play());
              } else {
                get().nextTrack();
              }
              return;
            }
          }

          // Track ended naturally
          if (status.didJustFinish && !status.loop) {
            const repeat = get().repeatMode;
            if (repeat === 'one') {
              const startPos = rangeInfo.isRangeActive ? rangeInfo.startSec : 0;
              player.seekTo(startPos).then(() => player.play());
            } else {
              get().nextTrack();
            }
          }
        });

        // Seek to range start if range mode is active
        const initRange = get().getEffectivePlayRange(activeTrack);
        if (initRange.isRangeActive && initRange.startSec > 0) {
          try {
            await player.seekTo(initRange.startSec);
            set({ positionMs: initRange.startSec * 1000 });
          } catch (e) {}
        }

        player.play();
        const curSpeed = get().playbackSpeed;
        if (curSpeed && curSpeed !== 1.0) {
          try {
            player.setPlaybackRate(curSpeed);
          } catch (e) {}
        }
        set({ sound: player, isBuffering: false, playbackError: null });
        return true;
      } catch (err) {
        console.warn(`[Player] Synchronous failure playing candidate ${index} (${urlToPlay}):`, err);
        return await playCandidate(index + 1);
      }
    };

    await playCandidate(0);
  },

  playRadio: async (radio: LiveRadioStation) => {
    await ensureAudioMode();
    const state = get();

    if (state.sound) {
      try {
        state.sound.pause();
        state.sound.remove();
      } catch (e) {
        // ignore
      }
    }

    userIntentPlaying = null;
    lastUserPlayPauseTime = 0;

    set({
      currentRadio: radio,
      currentTrack: null,
      isPlaying: true,
      isBuffering: true,
      positionMs: 0,
      durationMs: 0,
      lyrics: [],
      plainLyrics: null,
      playbackError: null,
    });

    freefyApi.logRadioClick(radio.id);

    try {
      const radioPlayer = createAudioPlayer(radio.url, { updateInterval: 500 });
      radioPlayer.volume = state.volume;

      (radioPlayer as any).addListener('playbackStatusUpdate', (status: AudioStatus) => {
        const now = Date.now();
        let effectivePlaying = status.playing;
        if (userIntentPlaying !== null) {
          if (now - lastUserPlayPauseTime < 800) {
            if (status.playing !== userIntentPlaying) {
              effectivePlaying = userIntentPlaying;
            } else {
              userIntentPlaying = null;
            }
          } else {
            userIntentPlaying = null;
          }
        }

        set({
          isPlaying: effectivePlaying,
          isBuffering: status.isBuffering,
        });
      });

      radioPlayer.play();
      const curSpeed = get().playbackSpeed;
      if (curSpeed && curSpeed !== 1.0) {
        try {
          radioPlayer.setPlaybackRate(curSpeed);
        } catch (e) {}
      }
      set({ sound: radioPlayer, isBuffering: false });
    } catch (err: any) {
      console.warn('[Player] Radio load failed:', err);
      set({
        playbackError: 'Failed to connect to live radio station stream.',
        isPlaying: false,
        isBuffering: false,
      });
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;

    // Instant optimistic update with intent lock to eliminate race conditions/jiggle
    const nextPlaying = !isPlaying;
    lastUserPlayPauseTime = Date.now();
    userIntentPlaying = nextPlaying;
    set({ isPlaying: nextPlaying });

    try {
      if (nextPlaying) {
        await sound.play();
      } else {
        await sound.pause();
      }
    } catch (e) {
      console.warn('[Player] Toggle play/pause error:', e);
      userIntentPlaying = null;
      set({ isPlaying: isPlaying });
    }
  },

  pause: async () => {
    const { sound } = get();
    lastUserPlayPauseTime = Date.now();
    userIntentPlaying = false;
    set({ isPlaying: false });
    if (sound) {
      try {
        await sound.pause();
      } catch (e) {}
    }
  },

  closePlayer: async () => {
    const { sound } = get();
    lastUserPlayPauseTime = Date.now();
    userIntentPlaying = false;
    if (sound) {
      try {
        await sound.pause();
        sound.remove();
      } catch (e) {}
    }
    set({
      sound: null,
      currentTrack: null,
      currentRadio: null,
      isPlaying: false,
      isBuffering: false,
      positionMs: 0,
      durationMs: 0,
      isFullPlayerVisible: false,
      isLyricsVisible: false,
      playbackError: null,
    });
  },

  play: async () => {
    const { sound } = get();
    lastUserPlayPauseTime = Date.now();
    userIntentPlaying = true;
    set({ isPlaying: true });
    if (sound) {
      try {
        await sound.play();
      } catch (e) {}
    }
  },

  resume: async () => {
    const { sound } = get();
    lastUserPlayPauseTime = Date.now();
    userIntentPlaying = true;
    set({ isPlaying: true });
    if (sound) {
      try {
        await sound.play();
      } catch (e) {}
    }
  },

  seekTo: async (positionMs: number) => {
    const { sound } = get();
    set({ positionMs });
    if (sound) {
      try {
        await sound.seekTo(positionMs / 1000);
      } catch (e) {
        console.warn('[Player] Seek error:', e);
      }
    }
  },

  nextTrack: async () => {
    const { queue, queueIndex, isShuffle, repeatMode } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // End of queue
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      get().playTrack(nextTrack);
    }
  },

  previousTrack: async (force?: boolean) => {
    const { queue, queueIndex, positionMs } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in and not forced, restart current track
    if (!force && positionMs > 3000) {
      get().seekTo(0);
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      get().playTrack(prevTrack);
    }
  },

  setVolume: async (vol: number) => {
    const { sound } = get();
    const clamped = Math.max(0, Math.min(1, vol));
    set({ volume: clamped });
    if (sound) {
      try {
        sound.volume = clamped;
      } catch (e) {}
    }
  },

  setPlaybackSpeed: async (speed: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, Math.round(speed * 100) / 100));
    set({ playbackSpeed: clamped });
    const sound = get().sound;
    if (sound) {
      try {
        sound.setPlaybackRate(clamped);
      } catch (e) {
        console.warn('[Player] Failed to set playback rate:', e);
      }
    }
  },

  setPreferredQuality: async (quality: AudioQuality) => {
    set({ preferredQuality: quality });
    const { currentTrack, positionMs, isPlaying, sound, playbackSpeed } = get();
    if (currentTrack && currentTrack.downloadUrls && currentTrack.downloadUrls.length > 0) {
      const newUrl = selectStreamUrlByQuality(currentTrack.downloadUrls, quality, currentTrack.streamUrl);
      if (sound && newUrl) {
        try {
          sound.pause();
          sound.remove();
          const newPlayer = createAudioPlayer(newUrl, { updateInterval: 300 });
          newPlayer.volume = get().volume;
          await newPlayer.seekTo(positionMs / 1000);
          if (playbackSpeed && playbackSpeed !== 1.0) {
            try {
              newPlayer.setPlaybackRate(playbackSpeed);
            } catch (e) {}
          }
          if (isPlaying) newPlayer.play();
          set({ sound: newPlayer });
        } catch (e) {}
      }
    }
  },

  toggleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(get().repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    set({ repeatMode: nextMode });
  },

  toggleShuffle: () => {
    set((s) => ({ isShuffle: !s.isShuffle }));
  },

  setQueue: (queue: Track[]) => set({ queue }),
  addToQueue: (track: Track) => set((s) => ({ queue: [...s.queue, track] })),
  playNext: (track: Track) => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) {
      set({ queue: [track], queueIndex: 0 });
      return;
    }
    const nextIdx = queueIndex + 1;
    const newQueue = [...queue.slice(0, nextIdx), track, ...queue.slice(nextIdx)];
    set({ queue: newQueue });
  },
  removeFromQueue: (index: number) =>
    set((s) => ({ queue: s.queue.filter((_, i) => i !== index) })),
  clearQueue: () => set({ queue: [], queueIndex: 0 }),

  setFullPlayerVisible: (visible: boolean) => set({ isFullPlayerVisible: visible }),
  setLyricsVisible: (visible: boolean) => set({ isLyricsVisible: visible }),

  fetchLyricsForCurrentTrack: async () => {
    const track = get().currentTrack;
    if (!track) return;

    try {
      let data = null;
      if (track.sourceEngine === 'listen_free') {
        data = await listenFreeApi.getLyrics(track);
      } else if (track.sourceEngine === 'tune_free') {
        data = await tuneFreeApi.getLyrics(track.name, track.artist, track.duration);
      } else {
        data = await freefyApi.getTrackLyrics(track.id);
        if (!data || !data.syncedLyrics || data.syncedLyrics.length === 0) {
          data = await tuneFreeApi.getLyrics(track.name, track.artist, track.duration);
        }
      }

      if (data) {
        set({
          lyrics: data.syncedLyrics || [],
          plainLyrics: data.plainLyrics || null,
        });
      }
    } catch (e) {
      // Non-blocking
    }
  },

  dismissError: () => set({ playbackError: null }),

  // Play Range implementation
  loadSavedPlayRanges: async () => {
    try {
      const isEnabled = await storage.getItem<boolean>(STORAGE_RANGE_ENABLED, false);
      const defaultRange = await storage.getItem<{ startSec: number; endSec: number }>(
        STORAGE_RANGE_DEFAULT,
        { startSec: 60, endSec: 120 }
      );
      const trackRanges = await storage.getItem<Record<string, TrackPlayRange>>(
        STORAGE_RANGE_TRACKS,
        {}
      );
      set({
        isPlayRangeEnabled: isEnabled,
        defaultPlayRange: defaultRange,
        trackPlayRanges: trackRanges || {},
      });
    } catch (e) {
      console.warn('[PlayerStore] Error loading saved play ranges:', e);
    }
  },

  togglePlayRangeMode: (enabled?: boolean) => {
    const nextState = typeof enabled === 'boolean' ? enabled : !get().isPlayRangeEnabled;
    set({ isPlayRangeEnabled: nextState });
    storage.setItem(STORAGE_RANGE_ENABLED, nextState).catch(() => {});

    // If turned ON while playing, check if current track has an active custom range
    if (nextState) {
      const track = get().currentTrack;
      const sound = get().sound;
      if (track && sound) {
        const range = get().getEffectivePlayRange(track);
        if (range.isRangeActive) {
          const curSec = get().positionMs / 1000;
          if (curSec < range.startSec || curSec >= range.endSec) {
            sound.seekTo(range.startSec);
            set({ positionMs: range.startSec * 1000 });
          }
        }
      }
    }
  },

  setTrackPlayRange: (trackId: string, range: Partial<TrackPlayRange>) => {
    const { trackPlayRanges, currentTrack, sound, isPlayRangeEnabled } = get();
    const existing = trackPlayRanges[trackId] || {
      startSec: 0,
      endSec: 0,
      enabled: true,
    };

    const updated: TrackPlayRange = {
      startSec: range.startSec !== undefined ? range.startSec : existing.startSec,
      endSec: range.endSec !== undefined ? range.endSec : existing.endSec,
      enabled: range.enabled !== undefined ? range.enabled : (existing.enabled !== undefined ? existing.enabled : true),
    };

    const newMap = { ...trackPlayRanges, [trackId]: updated };
    set({ trackPlayRanges: newMap });
    storage.setItem(STORAGE_RANGE_TRACKS, newMap).catch(() => {});

    // If modifying range for currently playing track, adjust position if outside
    if (isPlayRangeEnabled && currentTrack && currentTrack.id === trackId && sound && updated.enabled) {
      const curSec = get().positionMs / 1000;
      if (curSec < updated.startSec || (updated.endSec > 0 && curSec >= updated.endSec)) {
        sound.seekTo(updated.startSec);
        set({ positionMs: updated.startSec * 1000 });
      }
    }
  },

  removeTrackPlayRange: (trackId: string) => {
    const { trackPlayRanges } = get();
    if (trackPlayRanges[trackId]) {
      const newMap = { ...trackPlayRanges };
      delete newMap[trackId];
      set({ trackPlayRanges: newMap });
      storage.setItem(STORAGE_RANGE_TRACKS, newMap).catch(() => {});
    }
  },

  setDefaultPlayRange: (range: { startSec: number; endSec: number }) => {
    set({ defaultPlayRange: range });
    storage.setItem(STORAGE_RANGE_DEFAULT, range).catch(() => {});
  },

  getEffectivePlayRange: (track?: Track | null) => {
    const state = get();
    const target = track !== undefined ? track : state.currentTrack;
    if (!target) {
      return { startSec: 0, endSec: 0, isRangeActive: false, hasCustomRange: false };
    }

    const totalDur = Math.max(
      1,
      target.duration ||
      (state.durationMs ? Math.round(state.durationMs / 1000) : 180)
    );

    const custom = target.id ? state.trackPlayRanges[target.id] : undefined;
    const hasCustom = Boolean(custom && custom.enabled !== false);

    // If the user has saved a specific custom range for this track:
    if (hasCustom && custom) {
      const start = Math.max(0, Math.min(custom.startSec, Math.max(0, totalDur - 0.2)));
      const end = Math.min(totalDur, Math.max(start + 0.2, custom.endSec || totalDur));
      return {
        startSec: start,
        endSec: end,
        isRangeActive: state.isPlayRangeEnabled,
        hasCustomRange: true,
      };
    }

    // For any song without a custom saved range: play the full song normally from 0 to total duration
    return {
      startSec: 0,
      endSec: totalDur,
      isRangeActive: false,
      hasCustomRange: false,
    };
  },
}));
