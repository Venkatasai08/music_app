// Authentic Song Artwork Resolution Service
// Accurately resolves and caches original song & album artwork for on-device audios and online compilation tracks

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types/music';
import { sanitizeImageUrl } from '../utils/audioUtils';
import { listenFreeApi } from '../api/listenFreeApi';
import { tuneFreeApi } from '../api/tuneFreeApi';
import { freefyApi } from '../api/freefyApi';

const ARTWORK_STORAGE_KEY = '@music_app_artwork_cache_v2';

const COMPILATION_KEYWORDS = [
  'hits',
  'mix',
  'party',
  'collection',
  'best of',
  'classics',
  'compilation',
  'top 50',
  'playlist',
  'special',
  'summer',
  'diwali',
  'new year',
  'mashup',
  'love songs',
  'wedding',
  'vibes',
];

function isCompilationAlbum(albumName: string): boolean {
  if (!albumName) return false;
  const lower = albumName.toLowerCase();
  return COMPILATION_KEYWORDS.some((k) => lower.includes(k));
}

export function cleanDeviceTrackInfo(
  rawFilename: string = '',
  rawArtist: string = ''
): { title: string; artist: string } {
  let clean = rawFilename
    .replace(/\.[a-zA-Z0-9]+$/, '') // remove extension like .mp3, .m4a
    .replace(
      /[\(\[\{][^\)\]\}]*(?:320kbps|128kbps|pagalworld|koshalworld|songspk|djpunjab|snippet|official|lyric|video|audio|remix|slowed|ringtone|download|exclusive)[^\)\]\}]*[\)\]\}]/gi,
      ''
    )
    .replace(/_(?:slowed|reverb|klickaud|bassboosted|remix|ringtone|audio)[a-z0-9_]*/gi, '')
    .replace(/^\d+[\s\.\-_]+/, '') // remove leading track number like '01 - '
    .replace(/^(?:raw|rec|aud|wa|track)[\-_0-9]+/gi, '')
    .trim();

  let title = clean;
  let artist = rawArtist && rawArtist !== 'Phone Audio' && rawArtist !== 'Unknown Artist' ? rawArtist : '';

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length >= 2) {
      title = parts[0].trim();
      artist = parts.slice(1).join(' - ').trim();
    }
  } else if (clean.includes(' – ')) {
    const parts = clean.split(' – ');
    if (parts.length >= 2) {
      title = parts[0].trim();
      artist = parts.slice(1).join(' – ').trim();
    }
  }

  // Remove residual parentheses/brackets
  title = title.replace(/[\(\[].*?[\)\]]/g, '').trim();
  artist = artist.replace(/[\(\[].*?[\)\]]/g, '').trim();

  return {
    title: title || rawFilename.replace(/\.[a-zA-Z0-9]+$/, '').trim() || 'Audio Track',
    artist: artist || (rawArtist && rawArtist !== 'Phone Audio' ? rawArtist : 'Unknown Artist'),
  };
}

class ArtworkService {
  private cache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();
  private isCacheLoaded = false;

  constructor() {
    this.loadPersistedCache();
  }

  private async loadPersistedCache() {
    try {
      const stored = await AsyncStorage.getItem(ARTWORK_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([key, val]) => {
            if (typeof val === 'string' && val.length > 0) {
              this.cache.set(key, val);
            }
          });
        }
      }
    } catch (e) {
      // ignore
    } finally {
      this.isCacheLoaded = true;
    }
  }

  private debounceTimer: any = null;
  private persistCache() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      try {
        const obj: Record<string, string> = {};
        this.cache.forEach((val, key) => {
          if (val && !val.includes('images.unsplash.com')) {
            obj[key] = val;
          }
        });
        await AsyncStorage.setItem(ARTWORK_STORAGE_KEY, JSON.stringify(obj));
      } catch (e) {
        // ignore
      }
    }, 1500);
  }

  private getCacheKey(title: string = '', artist: string = ''): string {
    const cleanName = title.toLowerCase().trim();
    const cleanArt = (artist || '').toLowerCase().trim();
    return `${cleanName}|${cleanArt}`;
  }

  /**
   * Synchronous check if artwork is already in memory cache
   */
  getCachedArtwork(title: string, artist: string = ''): string | null {
    const key = this.getCacheKey(title, artist);
    const item = this.cache.get(key);
    if (item && !item.includes('images.unsplash.com')) {
      return item;
    }
    // Try title only key
    const keyTitleOnly = this.getCacheKey(title, '');
    const titleItem = this.cache.get(keyTitleOnly);
    if (titleItem && !titleItem.includes('images.unsplash.com')) {
      return titleItem;
    }
    return null;
  }

  /**
   * Resolves artwork for a track by title and artist using iTunes, ListenFree, TuneFree & Freefy
   */
  async resolveArtworkByTitleAndArtist(
    rawTitle: string,
    rawArtist: string = '',
    compilationAlbumImage?: string
  ): Promise<string> {
    if (!rawTitle || typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
      return '';
    }

    const { title: cleanTitle, artist: cleanArtist } = cleanDeviceTrackInfo(rawTitle, rawArtist);
    const key = this.getCacheKey(cleanTitle, cleanArtist);

    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      if (existing && !existing.includes('images.unsplash.com')) {
        return existing;
      }
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const cleanCompImg = sanitizeImageUrl(compilationAlbumImage || '');

    const fetchPromise = (async () => {
      try {
        const queryWithArtist = cleanArtist && cleanArtist !== 'Unknown Artist' && cleanArtist !== 'Phone Audio'
          ? `${cleanTitle} ${cleanArtist}`.trim()
          : cleanTitle;

        let resolvedUrl = '';

        // 1. First Priority: iTunes Search API (Ultra-fast, high quality 600x600 artwork across all languages)
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
            queryWithArtist
          )}&media=music&entity=song&limit=4`;
          const res = await fetch(itunesUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
              const best = data.results[0];
              const rawArt = best.artworkUrl100 || best.artworkUrl60;
              if (rawArt && typeof rawArt === 'string') {
                const highRes = rawArt.replace('/100x100bb.jpg', '/600x600bb.jpg').replace('http://', 'https://');
                if (!cleanCompImg || highRes !== cleanCompImg) {
                  resolvedUrl = highRes;
                }
              }
            }
          }
        } catch (e) {
          // fallback to next
        }

        // 2. Second Priority: ListenFree / Saavn Cluster
        if (!resolvedUrl) {
          try {
            const songResults = await listenFreeApi.searchSongs(queryWithArtist, 6);
            if (songResults.length > 0) {
              const bestSong = songResults.find((s) => {
                const img = sanitizeImageUrl(s.image);
                return img && (!cleanCompImg || img !== cleanCompImg) && !img.includes('images.unsplash.com');
              }) || songResults[0];

              if (bestSong && bestSong.image) {
                const img = sanitizeImageUrl(bestSong.image);
                if (img && !img.includes('images.unsplash.com')) {
                  resolvedUrl = img;
                }
              }
            }
          } catch (e) {
            // fallback to next
          }
        }

        // 3. Third Priority: TuneFree / Freefy Search
        if (!resolvedUrl) {
          try {
            const searchRes = await tuneFreeApi.search(queryWithArtist, 'track');
            const best = searchRes.tracks.find(
              (r) => r.image && (!cleanCompImg || sanitizeImageUrl(r.image) !== cleanCompImg)
            ) || searchRes.tracks[0];
            if (best && best.image) {
              const img = sanitizeImageUrl(best.image);
              if (img && !img.includes('images.unsplash.com')) {
                resolvedUrl = img;
              }
            }
          } catch (e) {
            // ignore
          }
        }

        if (resolvedUrl) {
          this.cache.set(key, resolvedUrl);
          this.cache.set(this.getCacheKey(cleanTitle, ''), resolvedUrl);
          this.persistCache();
          return resolvedUrl;
        }
      } catch (err) {
        // failed resolution
      } finally {
        this.pendingRequests.delete(key);
      }

      return '';
    })();

    this.pendingRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Resolves the authentic original movie or single artwork for a track object
   */
  async resolveSongArtwork(
    trackOrInfo: Track | { name?: string; title?: string; artist?: string; image?: string; thumbnailImage?: string },
    compilationAlbumImage?: string
  ): Promise<string> {
    if (!trackOrInfo) return '';

    const title = (trackOrInfo as any).name || (trackOrInfo as any).title || '';
    const artist = (trackOrInfo as any).artist || '';

    // If track already has a valid non-placeholder image
    const existingImg = (trackOrInfo as any).image || (trackOrInfo as any).thumbnailImage || '';
    if (
      existingImg &&
      typeof existingImg === 'string' &&
      existingImg.startsWith('http') &&
      !existingImg.includes('images.unsplash.com') &&
      (!compilationAlbumImage || existingImg !== compilationAlbumImage)
    ) {
      return sanitizeImageUrl(existingImg);
    }

    return this.resolveArtworkByTitleAndArtist(title, artist, compilationAlbumImage);
  }

  /**
   * Batch resolves authentic artwork for an entire list of device tracks in the background with progressive live callbacks
   */
  async resolveDeviceTracksArtwork(
    tracks: Track[],
    onTrackResolved?: (trackId: string, artworkUrl: string) => void
  ): Promise<void> {
    if (!tracks || tracks.length === 0) return;

    const BATCH_SIZE = 4;
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (track) => {
          // If already has resolved image from cache
          const cached = this.getCachedArtwork(track.name, track.artist);
          if (cached) {
            if (onTrackResolved) {
              onTrackResolved(track.id, cached);
            }
            return;
          }

          const resolved = await this.resolveArtworkByTitleAndArtist(track.name, track.artist);
          if (resolved && onTrackResolved) {
            onTrackResolved(track.id, resolved);
          }
        })
      );
    }
  }

  /**
   * Batch resolves authentic artwork for an entire album tracklist in background with live progressive callbacks
   */
  async resolveAlbumTracksArtwork(
    tracks: Track[],
    albumImage?: string,
    onTrackResolved?: (trackId: string, artworkUrl: string) => void
  ): Promise<void> {
    if (!tracks || tracks.length === 0) return;

    const effectiveAlbumImg = albumImage || tracks[0]?.image || '';

    const BATCH_SIZE = 4;
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (track) => {
          const resolved = await this.resolveSongArtwork(track, effectiveAlbumImg);
          if (resolved && onTrackResolved) {
            onTrackResolved(track.id, resolved);
          }
        })
      );
    }
  }
}

export const artworkService = new ArtworkService();
