import { fetchWithTimeout } from './apiClient';
import { Track, Album, Artist, Playlist, LyricsData, LyricLine } from '../types/music';
import { TuneFreeBrowseResponse, UnifiedSearchResults } from '../types/engine';
import { extractString } from '../utils/audioUtils';

const TUNEFREE_BASE_URL = 'https://freefyclone-api.albatross0071.workers.dev/api';
const LRCLIB_BASE_URL = 'https://lrclib.net/api';

class TuneFreeApi {
  /**
   * Helper to normalize raw TuneFree items into Universal Track model
   */
  private normalizeTrack(item: any): Track {
    const rawArtist =
      Array.isArray(item.artists) && item.artists.length > 0
        ? item.artists.map((a: any) => extractString(a)).filter(Boolean).join(', ')
        : item.subtitle || item.artist || 'Unknown Artist';

    const artistName = extractString(rawArtist, 'Unknown Artist');

    const image =
      item.image ||
      item.album?.images?.[0]?.url ||
      item.thumbnailUrl ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';

    const albumName = extractString(item.album?.name || item.album || item.subtitle || '', '');

    return {
      id: item.id || `tf_${Math.random().toString(36).substring(2, 9)}`,
      name: extractString(item.name || item.title, 'Untitled Track'),
      artist: artistName,
      artistId: item.artists?.[0]?.id,
      album: albumName,
      albumId: item.album?.id,
      year: item.year,
      duration: item.duration_ms ? Math.round(item.duration_ms / 1000) : item.duration || 180,
      image,
      thumbnailImage: image,
      streamUrl: item.src ? `https://www.youtube.com/watch?v=${item.src}` : '',
      youtubeId: item.src,
      sourceEngine: 'tune_free',
      hasLyrics: true,
    };
  }

  /**
   * Fetches curated Browse sections (Popular Playlists, Trending, Explore, Artists)
   */
  async getBrowseSections(): Promise<TuneFreeBrowseResponse> {
    try {
      const res = await fetchWithTimeout(`${TUNEFREE_BASE_URL}/browse/sections?_ts=${Date.now()}`, { timeoutMs: 3500 });
      if (!res.ok) return { homeSections: [], exploreSections: [], popularArtists: [] };
      const data = await res.json();
      return {
        homeSections: data.homeSections || [],
        exploreSections: data.exploreSections || [],
        popularArtists: data.popularArtists || [],
      };
    } catch (e) {
      console.warn('[TuneFreeApi] Browse sections failed:', e);
      return { homeSections: [], exploreSections: [], popularArtists: [] };
    }
  }

  /**
   * Fetches latest New Releases & Singles
   */
  async getNewReleases(): Promise<{ title: string; items: Track[] }[]> {
    try {
      const res = await fetchWithTimeout(`${TUNEFREE_BASE_URL}/browse/new?_ts=${Date.now()}`, { timeoutMs: 3500 });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data?.sections) return [];

      return data.sections.map((sec: any) => ({
        title: sec.title || 'New Releases',
        items: (sec.items || []).map((it: any) => this.normalizeTrack(it)),
      }));
    } catch (e) {
      console.warn('[TuneFreeApi] New releases failed:', e);
      return [];
    }
  }

  /**
   * Global Search across TuneFree catalog
   */
  async search(query: string, type: 'track' | 'album' | 'artist' | 'playlist' = 'track'): Promise<UnifiedSearchResults> {
    if (!query.trim()) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }

    try {
      const url = `${TUNEFREE_BASE_URL}/search?q=${encodeURIComponent(query.trim())}&type=${type}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 4000 });
      if (!res.ok) return { tracks: [], albums: [], artists: [], playlists: [] };
      const data = await res.json();

      const items: any[] = data.result?.items || data.items || [];
      const tracks: Track[] = [];
      const albums: Album[] = [];
      const artists: Artist[] = [];
      const playlists: Playlist[] = [];

      items.forEach((item: any) => {
        const modelType = item.model_type || type;
        if (modelType === 'track') {
          tracks.push(this.normalizeTrack(item));
        } else if (modelType === 'album') {
          albums.push({
            id: item.id,
            name: extractString(item.name || item.title, 'Album'),
            artist: extractString(item.subtitle || item.artist || '', 'Unknown Artist'),
            image: item.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
            sourceEngine: 'tune_free',
          });
        } else if (modelType === 'artist') {
          artists.push({
            id: item.id || encodeURIComponent(extractString(item.name)),
            name: extractString(item.name, 'Artist'),
            image: item.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
            sourceEngine: 'tune_free',
          });
        } else if (modelType === 'playlist') {
          playlists.push({
            id: item.id,
            name: extractString(item.name || item.title, 'Playlist'),
            description: extractString(item.subtitle || item.description, ''),
            image: item.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
            sourceEngine: 'tune_free',
          });
        }
      });

      return { tracks, albums, artists, playlists };
    } catch (e) {
      console.warn('[TuneFreeApi] Search error:', e);
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }
  }

  /**
   * Fast search query suggestions autocomplete
   */
  async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const url = `${TUNEFREE_BASE_URL}/search/suggestions?q=${encodeURIComponent(query.trim())}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 2000 });
      if (!res.ok) return [];
      const data = await res.json();
      return data?.suggestions || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Resolves track and artist to streaming source / YouTube ID
   */
  async resolveTrack(trackName: string, artistName: string): Promise<string | null> {
    try {
      const url = `${TUNEFREE_BASE_URL}/resolve?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 3000 });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.src || null;
    } catch (e) {
      console.warn('[TuneFreeApi] Track resolution failed:', e);
      return null;
    }
  }

  /**
   * Fetches artist metadata and top tracks
   */
  async getArtist(artistName: string): Promise<{ artist: Artist; topTracks: Track[] } | null> {
    try {
      const url = `${TUNEFREE_BASE_URL}/artist/${encodeURIComponent(artistName)}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 3500 });
      if (!res.ok) return null;
      const data = await res.json();

      const artist: Artist = {
        id: data.artist?.id || artistName,
        name: data.artist?.name || artistName,
        image: data.artist?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        bio: data.artist?.bio,
        sourceEngine: 'tune_free',
      };

      const topTracks = (data.topTracks || []).map((t: any) => this.normalizeTrack(t));
      return { artist, topTracks };
    } catch (e) {
      console.warn('[TuneFreeApi] Get artist error:', e);
      return null;
    }
  }

  /**
   * Fetches curated playlist details and tracks
   */
  async getPlaylist(playlistId: string, fallbackTitle?: string): Promise<Playlist | null> {
    try {
      const url = `${TUNEFREE_BASE_URL}/playlist/${encodeURIComponent(playlistId)}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 3500 });
      let pData: any = {};
      let tracks: Track[] = [];

      if (res.ok) {
        const data = await res.json();
        pData = data.playlist || data;
        tracks = (data.tracks || pData.tracks || []).map((t: any) => this.normalizeTrack(t));
      }

      // Auto-fallback: If tracks are empty, search TuneFree catalog with title/query
      if (tracks.length === 0) {
        const query = fallbackTitle || pData.name || playlistId.replace(/^[a-z]+:[a-z]+:/i, '');
        if (query) {
          const searchRes = await this.search(query, 'track');
          if (searchRes.tracks.length > 0) {
            tracks = searchRes.tracks;
          }
        }
      }

      return {
        id: pData.id || playlistId,
        name: pData.name || fallbackTitle || 'Curated Playlist',
        description: pData.description || pData.subtitle,
        image: pData.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
        trackCount: tracks.length,
        tracks,
        sourceEngine: 'tune_free',
      };
    } catch (e) {
      console.warn('[TuneFreeApi] Get playlist error:', e);
      const query = fallbackTitle || playlistId.replace(/^[a-z]+:[a-z]+:/i, '');
      if (query) {
        try {
          const searchRes = await this.search(query, 'track');
          if (searchRes.tracks.length > 0) {
            return {
              id: playlistId,
              name: fallbackTitle || query,
              description: 'Curated Playlist',
              image: searchRes.tracks[0]?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
              trackCount: searchRes.tracks.length,
              tracks: searchRes.tracks,
              sourceEngine: 'tune_free',
            };
          }
        } catch (err) {
          // ignore
        }
      }
      return null;
    }
  }

  /**
   * Fetches album metadata and tracks
   */
  async getAlbum(albumId: string, fallbackTitle?: string): Promise<Album | null> {
    try {
      const url = `${TUNEFREE_BASE_URL}/album/${encodeURIComponent(albumId)}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 3500 });
      let aData: any = {};
      let tracks: Track[] = [];

      if (res.ok) {
        const data = await res.json();
        aData = data.album || data;
        tracks = (data.tracks || aData.tracks || []).map((t: any) => this.normalizeTrack(t));
      }

      // Auto-fallback: If tracks are empty, search TuneFree catalog with title/query
      if (tracks.length === 0) {
        const query = fallbackTitle || aData.name || albumId.replace(/^[a-z]+:[a-z]+:/i, '');
        if (query) {
          try {
            const albumSearch = await this.search(query, 'album');
            if (albumSearch.albums.length > 0 && albumSearch.albums[0].id && albumSearch.albums[0].id !== albumId) {
              const alt = await this.getAlbum(albumSearch.albums[0].id, query);
              if (alt?.tracks && alt.tracks.length > 0) {
                tracks = alt.tracks;
              }
            }
          } catch (e) {}

          if (tracks.length === 0) {
            const searchRes = await this.search(query, 'track');
            if (searchRes.tracks.length > 0) {
              const seen = new Set<string>();
              tracks = searchRes.tracks.filter((t) => {
                const key = t.name.toLowerCase().trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            }
          }
        }
      }

      // Ensure tracks are deduplicated by song name
      if (tracks.length > 0) {
        const seen = new Set<string>();
        tracks = tracks.filter((t) => {
          const key = t.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      return {
        id: aData.id || albumId,
        name: aData.name || fallbackTitle || 'Album',
        artist: aData.artist || aData.subtitle || 'Artist',
        image: aData.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
        songCount: tracks.length,
        tracks,
        sourceEngine: 'tune_free',
      };
    } catch (e) {
      console.warn('[TuneFreeApi] Get album error:', e);
      const query = fallbackTitle || albumId.replace(/^[a-z]+:[a-z]+:/i, '');
      if (query) {
        try {
          const searchRes = await this.search(query, 'track');
          if (searchRes.tracks.length > 0) {
            const seen = new Set<string>();
            const unique = searchRes.tracks.filter((t) => {
              const key = t.name.toLowerCase().trim();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return {
              id: albumId,
              name: fallbackTitle || query,
              artist: unique[0]?.artist || 'Artist',
              image: unique[0]?.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
              songCount: unique.length,
              tracks: unique,
              sourceEngine: 'tune_free',
            };
          }
        } catch (err) {
          // ignore
        }
      }
      return null;
    }
  }

  /**
   * Fetches synchronized lyrics from LRCLIB for TuneFree tracks
   */
  async getLyrics(trackName: string, artistName: string, durationSec = 180): Promise<LyricsData | null> {
    try {
      const query = `track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}&duration=${durationSec}`;
      const res = await fetchWithTimeout(`${LRCLIB_BASE_URL}/get?${query}`, { timeoutMs: 2500 });
      if (!res.ok) return null;
      const data = await res.json();

      const syncedLyrics: LyricLine[] = [];
      if (data.syncedLyrics) {
        const lines = String(data.syncedLyrics).split('\n');
        for (const line of lines) {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const min = parseInt(match[1], 10);
            const sec = parseInt(match[2], 10);
            const ms = parseInt(match[3].padEnd(3, '0'), 10);
            syncedLyrics.push({
              timeMs: (min * 60 + sec) * 1000 + ms,
              text: match[4].trim(),
            });
          }
        }
      }

      return {
        syncedLyrics: syncedLyrics.length > 0 ? syncedLyrics : undefined,
        plainLyrics: data.plainLyrics,
        provider: 'lrclib',
      };
    } catch (e) {
      return null;
    }
  }
}

export const tuneFreeApi = new TuneFreeApi();
