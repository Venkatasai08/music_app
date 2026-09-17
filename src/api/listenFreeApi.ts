// ListenFree API Gateway with Failover Cluster, Lyrics, Multi-Language Feeds & Supabase Integration

import { fetchJsonWithFailover, fetchWithTimeout } from './apiClient';
import {
  Track,
  Album,
  Artist,
  Playlist,
  QualityDownloadLink,
  AudioQuality,
  LyricsData,
  VideoPreview,
} from '../types/music';
import { UnifiedSearchResults } from '../types/engine';
import { SupabaseRoomMetadata, SupabaseQueueSong } from '../types/supabase';
import { parseLRC } from '../utils/lyricParser';
import { sanitizeImageUrl, sanitizeAudioUrl, decodeHtmlEntities, extractString } from '../utils/audioUtils';

export const LISTEN_FREE_CLUSTER = [
  'https://backend.listenfree.in/api',
  'https://backend2.listenfree.in/api',
  'https://music-api.albatross0071.workers.dev/api',
  'https://music-api2.albatross0071.workers.dev/api',
];

const SUPABASE_ROOMS_URL = 'https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1';
const SUPABASE_ROOMS_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk';

const SUPABASE_VIDEOS_URL = 'https://hkjbosczsvkxvqkvazap.supabase.co/rest/v1';
const SUPABASE_VIDEOS_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramJvc2N6c3ZreHZxa3ZhemFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExMzUsImV4cCI6MjA4MDI1NzEzNX0.rC575mv-wUV48YLM0mLQMSG3yhuCaJnl1D3ms4pfPSI';

// Helper to normalize raw JioSaavn song payload to standard Track
export function normalizeListenFreeSong(raw: any): Track {
  if (!raw) {
    return {
      id: String(Math.random()),
      name: 'Unknown Track',
      artist: 'Unknown Artist',
      duration: 0,
      image: '',
      streamUrl: '',
      sourceEngine: 'listen_free',
    };
  }

  const downloadUrls: QualityDownloadLink[] = [];

  const rawDownloads = raw.downloadUrl || raw.download_url || raw.downloadUrls;
  if (Array.isArray(rawDownloads)) {
    rawDownloads.forEach((item: any) => {
      if (item) {
        const rawQuality = String(item.quality || '').toLowerCase();
        let quality: AudioQuality = '320kbps';
        if (rawQuality.includes('320') || rawQuality === '4') quality = '320kbps';
        else if (rawQuality.includes('160') || rawQuality === '3') quality = '160kbps';
        else if (rawQuality.includes('96') || rawQuality === '2') quality = '96kbps';
        else if (rawQuality.includes('48') || rawQuality === '1') quality = '48kbps';
        else if (rawQuality.includes('12') || rawQuality === '0') quality = '12kbps';

        const rawUrl = item.url || item.link || item.media_url;
        if (rawUrl && typeof rawUrl === 'string') {
          downloadUrls.push({
            quality,
            url: sanitizeAudioUrl(rawUrl),
          });
        }
      }
    });
  } else if (typeof rawDownloads === 'string') {
    downloadUrls.push({ quality: '320kbps', url: sanitizeAudioUrl(rawDownloads) });
  }

  // Fallback direct url if provided
  const directUrl = sanitizeAudioUrl(
    raw.media_preview_url || raw.media_url || raw.streamUrl || raw.url || ''
  );
  if (directUrl && !downloadUrls.some((d) => d.url === directUrl)) {
    downloadUrls.push({ quality: '160kbps', url: directUrl });
  }

  // Pick highest stream url (320kbps -> 160kbps -> fallback)
  const bestStream =
    downloadUrls.find((u) => u.quality === '320kbps')?.url ||
    downloadUrls.find((u) => u.quality === '160kbps')?.url ||
    downloadUrls[0]?.url ||
    directUrl ||
    '';

  // Extract images
  let image = '';
  if (Array.isArray(raw.image)) {
    image = raw.image[raw.image.length - 1]?.url || raw.image[0]?.url || '';
  } else if (typeof raw.image === 'string') {
    image = raw.image;
  }

  let artistName = 'Unknown Artist';
  if (raw.artists?.primary && Array.isArray(raw.artists.primary) && raw.artists.primary.length > 0) {
    artistName = raw.artists.primary.map((a: any) => extractString(a)).filter(Boolean).join(', ');
  } else if (raw.primaryArtists) {
    artistName = extractString(raw.primaryArtists);
  } else if (raw.artist) {
    artistName = extractString(raw.artist);
  } else if (raw.artists?.all && Array.isArray(raw.artists.all) && raw.artists.all.length > 0) {
    artistName = raw.artists.all.map((a: any) => extractString(a)).filter(Boolean).join(', ');
  }

  const durationSec =
    typeof raw.duration === 'string'
      ? parseInt(raw.duration, 10)
      : Number(raw.duration) || 0;

  // Extract artist / singer profile photo
  let artistImage = '';
  const candidateArtists = [
    ...(Array.isArray(raw.artists?.primary) ? raw.artists.primary : []),
    ...(Array.isArray(raw.artists?.all) ? raw.artists.all : []),
    ...(Array.isArray(raw.singers) ? raw.singers : []),
  ];
  for (const art of candidateArtists) {
    if (art && art.image) {
      const artImgUrl = Array.isArray(art.image)
        ? art.image[art.image.length - 1]?.url || art.image[0]?.url
        : typeof art.image === 'string'
        ? art.image
        : '';
      if (artImgUrl) {
        artistImage = sanitizeImageUrl(artImgUrl);
        break;
      }
    }
  }

  // Extract album image
  let albumImage = '';
  if (raw.album?.image) {
    albumImage = sanitizeImageUrl(
      Array.isArray(raw.album.image)
        ? raw.album.image[raw.album.image.length - 1]?.url || raw.album.image[0]?.url
        : raw.album.image
    );
  }

  const rawAlbum = raw.album;
  const albumName = extractString(rawAlbum) || extractString(raw.albumName) || extractString(raw.album_name) || '';

  return {
    id: String(raw.id || raw.songId || Math.random()),
    name: extractString(raw.name || raw.title || raw.song, 'Untitled Track'),
    artist: extractString(artistName, 'Unknown Artist'),
    artistId: raw.artists?.primary?.[0]?.id || raw.artistId,
    artistImage: artistImage || undefined,
    album: albumName,
    albumId:
      typeof raw.album === 'object' && raw.album !== null ? raw.album.id : raw.albumId,
    albumImage: albumImage || undefined,
    year: String(raw.year || ''),
    duration: durationSec,
    image: sanitizeImageUrl(image),
    thumbnailImage: sanitizeImageUrl(
      Array.isArray(raw.image) ? raw.image[0]?.url : image
    ),
    streamUrl: bestStream,
    downloadUrls,
    hasLyrics: Boolean(
      raw.hasLyrics === 'true' ||
        raw.hasLyrics === true ||
        raw.has_lyrics === 'true' ||
        raw.lyricsId
    ),
    sourceEngine: 'listen_free',
    playCount: Number(raw.playCount || raw.play_count || 0),
  };
}

// Helper to normalize raw JioSaavn playlist payload
export function normalizeListenFreePlaylist(raw: any): Playlist {
  let image = '';
  if (Array.isArray(raw.image)) {
    image = raw.image[raw.image.length - 1]?.url || raw.image[0]?.url || '';
  } else if (typeof raw.image === 'string') {
    image = raw.image;
  }

  return {
    id: String(raw.id || raw.listid || Math.random()),
    name: decodeHtmlEntities(raw.name || raw.title || 'Curated Playlist'),
    description: decodeHtmlEntities(raw.description || raw.subtitle || raw.header_desc || ''),
    image: sanitizeImageUrl(image),
    trackCount: Number(raw.songCount || raw.list_count || raw.trackCount || 0),
    sourceEngine: 'listen_free',
  };
}

export const listenFreeApi = {
  // 1. Direct Song Search with Pagination
  async searchSongs(query: string, limit = 30, page = 1): Promise<Track[]> {
    try {
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/search/songs?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`
      );
      const items = res.data?.results || res.data || res.results || [];
      return Array.isArray(items) ? items.map(normalizeListenFreeSong) : [];
    } catch (e) {
      console.warn('[ListenFree] searchSongs error:', e);
      return [];
    }
  },

  // 2. Comprehensive Global Search with Direct 320k Stream Resolution
  async globalSearch(query: string): Promise<UnifiedSearchResults> {
    if (!query.trim()) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }

    try {
      // Run parallel specialized queries for songs (with full stream URLs), albums, artists, and playlists
      const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.allSettled([
        fetchJsonWithFailover(
          LISTEN_FREE_CLUSTER,
          `/search/songs?query=${encodeURIComponent(query)}&limit=30`
        ),
        fetchJsonWithFailover(
          LISTEN_FREE_CLUSTER,
          `/search/albums?query=${encodeURIComponent(query)}&limit=15`
        ),
        fetchJsonWithFailover(
          LISTEN_FREE_CLUSTER,
          `/search/artists?query=${encodeURIComponent(query)}&limit=15`
        ),
        fetchJsonWithFailover(
          LISTEN_FREE_CLUSTER,
          `/search/playlists?query=${encodeURIComponent(query)}&limit=15`
        ),
      ]);

      let tracks: Track[] = [];
      if (songsRes.status === 'fulfilled') {
        const data: any = songsRes.value;
        const items = data.data?.results || data.data || data.results || [];
        if (Array.isArray(items)) {
          tracks = items.map(normalizeListenFreeSong);
        }
      }

      // If dedicated song search returned empty, attempt global search endpoint
      if (tracks.length === 0) {
        try {
          const globalRes: any = await fetchJsonWithFailover(
            LISTEN_FREE_CLUSTER,
            `/search?query=${encodeURIComponent(query)}`
          );
          const gData = globalRes.data || globalRes;
          const gSongs = gData.songs?.results || gData.songs || [];
          if (Array.isArray(gSongs)) {
            tracks = gSongs.map(normalizeListenFreeSong);
          }
        } catch (e) {
          // ignore
        }
      }

      let albums: Album[] = [];
      if (albumsRes.status === 'fulfilled') {
        const data: any = albumsRes.value;
        const items = data.data?.results || data.data || data.results || [];
        if (Array.isArray(items)) {
          albums = items.map((a: any) => ({
            id: String(a.id),
            name: decodeHtmlEntities(a.title || a.name || ''),
            artist: decodeHtmlEntities(a.artist || a.description || a.primaryArtists || ''),
            year: String(a.year || ''),
            image: sanitizeImageUrl(
              Array.isArray(a.image) ? a.image[a.image.length - 1]?.url : a.image
            ),
            sourceEngine: 'listen_free',
          }));
        }
      }

      let artists: Artist[] = [];
      if (artistsRes.status === 'fulfilled') {
        const data: any = artistsRes.value;
        const items = data.data?.results || data.data || data.results || [];
        if (Array.isArray(items)) {
          artists = items.map((a: any) => ({
            id: String(a.id),
            name: decodeHtmlEntities(a.name || a.title || ''),
            image: sanitizeImageUrl(
              Array.isArray(a.image) ? a.image[a.image.length - 1]?.url : a.image
            ),
            sourceEngine: 'listen_free',
          }));
        }
      }

      let playlists: Playlist[] = [];
      if (playlistsRes.status === 'fulfilled') {
        const data: any = playlistsRes.value;
        const items = data.data?.results || data.data || data.results || [];
        if (Array.isArray(items)) {
          playlists = items.map((p: any) => ({
            id: String(p.id),
            name: extractString(p.title || p.name || '', 'Playlist'),
            image: sanitizeImageUrl(
              Array.isArray(p.image) ? p.image[p.image.length - 1]?.url : p.image
            ),
            sourceEngine: 'listen_free',
          }));
        }
      }

      return { tracks, albums, artists, playlists };
    } catch (e) {
      console.warn('[ListenFree] globalSearch error:', e);
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }
  },

  // 3. Search Albums
  async searchAlbums(query: string, limit = 20): Promise<Album[]> {
    try {
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`
      );
      const items = res.data?.results || res.data || res.results || [];
      return Array.isArray(items)
        ? items.map((a: any) => ({
            id: String(a.id),
            name: extractString(a.title || a.name || '', 'Album'),
            artist: extractString(a.artist || a.description || a.primaryArtists || '', 'Unknown Artist'),
            year: String(a.year || ''),
            image: sanitizeImageUrl(
              Array.isArray(a.image) ? a.image[a.image.length - 1]?.url : a.image
            ),
            sourceEngine: 'listen_free',
          }))
        : [];
    } catch (e) {
      return [];
    }
  },

  // 4. Search Artists
  async searchArtists(query: string, limit = 20): Promise<Artist[]> {
    try {
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`
      );
      const items = res.data?.results || res.data || res.results || [];
      return Array.isArray(items)
        ? items.map((a: any) => ({
            id: String(a.id),
            name: extractString(a.name || a.title || '', 'Artist'),
            image: sanitizeImageUrl(
              Array.isArray(a.image) ? a.image[a.image.length - 1]?.url : a.image
            ),
            sourceEngine: 'listen_free',
          }))
        : [];
    } catch (e) {
      return [];
    }
  },

  // 5. Get Song Details (Fetches complete 320kbps streams by ID)
  async getSongDetails(songId: string): Promise<Track | null> {
    try {
      const cleanId = songId.replace(/^listen_free_/, '');
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/songs?id=${encodeURIComponent(cleanId)}`
      );
      const data = res.data?.[0] || res.data || res?.[0] || res;
      if (!data) return null;
      return normalizeListenFreeSong(data);
    } catch (e) {
      console.warn('[ListenFree] getSongDetails error:', e);
      return null;
    }
  },

  // 6. Get Multiple Songs by IDs
  async getSongsByIds(ids: string[]): Promise<Track[]> {
    if (ids.length === 0) return [];
    try {
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/songs?id=${ids.join(',')}`
      );
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(normalizeListenFreeSong);
    } catch (e) {
      return [];
    }
  },

  // 7. Search Playlists
  async searchPlaylists(query: string, limit = 20): Promise<Playlist[]> {
    try {
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/search/playlists?query=${encodeURIComponent(query)}&limit=${limit}`
      );
      const items = res.data?.results || res.data || res.results || [];
      return Array.isArray(items) ? items.map(normalizeListenFreePlaylist) : [];
    } catch (e) {
      return [];
    }
  },

  // 8. Get Curated Feed Songs by Search Term
  async getSongsBySearchTerm(searchTerm: string, limit = 15): Promise<Track[]> {
    return this.searchSongs(searchTerm, limit);
  },

  // 9. Get Song Suggestions / Recommendations
  async getSongSuggestions(songId: string, limit = 15): Promise<Track[]> {
    try {
      const cleanId = songId.replace(/^listen_free_/, '');
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/songs/${cleanId}/suggestions?id=${cleanId}&limit=${limit}`
      );
      const items = res.data || res.results || [];
      return Array.isArray(items) ? items.map(normalizeListenFreeSong) : [];
    } catch (e) {
      return [];
    }
  },

  // 10. Get Album Details with complete tracklist
  async getAlbumDetails(albumId: string, fallbackTitle?: string): Promise<Album | null> {
    try {
      const isLink = albumId.startsWith('http') || albumId.includes('jiosaavn.com');
      const endpoint = isLink
        ? `/albums?link=${encodeURIComponent(albumId)}`
        : `/albums?id=${encodeURIComponent(albumId)}`;

      let res: any = await fetchJsonWithFailover(LISTEN_FREE_CLUSTER, endpoint);
      let raw = res?.data || res;

      // Failover to /albums/:id if /albums?id= returns no songs
      if (!raw || (!raw.songs && !raw.tracks)) {
        try {
          const altRes: any = await fetchJsonWithFailover(
            LISTEN_FREE_CLUSTER,
            `/albums/${encodeURIComponent(albumId)}`
          );
          if (altRes?.data?.songs || altRes?.data?.tracks || altRes?.songs || altRes?.tracks) {
            raw = altRes.data || altRes;
          }
        } catch (e) {}
      }

      if (!raw) throw new Error('No raw album data');

      const rawList = Array.isArray(raw.songs)
        ? raw.songs
        : Array.isArray(raw.tracks)
        ? raw.tracks
        : Array.isArray(raw.data?.songs)
        ? raw.data.songs
        : Array.isArray(raw)
        ? raw
        : [];

      let tracks: Track[] = rawList.map(normalizeListenFreeSong);

      // If empty songs list, first try searching albums to find matching album ID
      const albumName = decodeHtmlEntities(raw.name || raw.title || fallbackTitle || '');
      if (tracks.length === 0 && (albumName || fallbackTitle)) {
        try {
          const matchingAlbums = await this.searchAlbums(albumName || fallbackTitle || albumId, 5);
          if (matchingAlbums.length > 0) {
            const bestAlbum = matchingAlbums.find((a) => a.id !== albumId) || matchingAlbums[0];
            if (bestAlbum && bestAlbum.id) {
              const altRes: any = await fetchJsonWithFailover(
                LISTEN_FREE_CLUSTER,
                `/albums?id=${encodeURIComponent(bestAlbum.id)}`
              );
              const altRaw = altRes?.data || altRes;
              const altList = Array.isArray(altRaw?.songs)
                ? altRaw.songs
                : Array.isArray(altRaw?.tracks)
                ? altRaw.tracks
                : [];
              if (altList.length > 0) {
                tracks = altList.map(normalizeListenFreeSong);
              }
            }
          }
        } catch (err) {}
      }

      // Deduplicate tracks by name so no duplicate songs appear
      if (tracks.length > 0) {
        const seen = new Set<string>();
        tracks = tracks.filter((t: Track) => {
          const key = t.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } else if (albumName || fallbackTitle) {
        // Last fallback: search songs and deduplicate strictly
        const fallback = await this.searchSongs(albumName || fallbackTitle || albumId, 30);
        if (fallback.length > 0) {
          const seen = new Set<string>();
          tracks = fallback.filter((t: Track) => {
            const key = t.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      }

      return {
        id: String(raw.id || albumId),
        name: albumName || fallbackTitle || 'Album',
        artist: decodeHtmlEntities(raw.primaryArtists || raw.artist || ''),
        year: String(raw.year || ''),
        image: sanitizeImageUrl(
          Array.isArray(raw.image) ? raw.image[raw.image.length - 1]?.url : raw.image
        ),
        songCount: tracks.length,
        tracks,
        sourceEngine: 'listen_free',
      };
    } catch (e) {
      console.warn('[ListenFree] getAlbumDetails error:', e);
      // Robust failover: search album catalog first, then songs
      const query = fallbackTitle || albumId;
      if (query) {
        try {
          const matchingAlbums = await this.searchAlbums(query, 5);
          if (matchingAlbums.length > 0 && matchingAlbums[0].id) {
            const altRes: any = await fetchJsonWithFailover(
              LISTEN_FREE_CLUSTER,
              `/albums?id=${encodeURIComponent(matchingAlbums[0].id)}`
            );
            const altRaw = altRes?.data || altRes;
            const altList = Array.isArray(altRaw?.songs)
              ? altRaw.songs
              : Array.isArray(altRaw?.tracks)
              ? altRaw.tracks
              : [];
            if (altList.length > 0) {
              const unique = altList.map(normalizeListenFreeSong).filter((t: Track, i: number, arr: Track[]) => {
                return arr.findIndex((x: Track) => x.name.toLowerCase().trim() === t.name.toLowerCase().trim()) === i;
              });
              return {
                id: matchingAlbums[0].id,
                name: matchingAlbums[0].name || query,
                artist: matchingAlbums[0].artist || 'ListenFree',
                image: matchingAlbums[0].image || '',
                songCount: unique.length,
                tracks: unique,
                sourceEngine: 'listen_free',
              };
            }
          }
        } catch (err) {}

        try {
          const fallbackTracks = await this.searchSongs(query, 30);
          if (fallbackTracks.length > 0) {
            const seen = new Set<string>();
            const unique = fallbackTracks.filter((t: Track) => {
              const key = t.name.toLowerCase().trim();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return {
              id: albumId,
              name: fallbackTitle || query,
              artist: unique[0]?.artist || 'ListenFree',
              image: unique[0]?.image || '',
              songCount: unique.length,
              tracks: unique,
              sourceEngine: 'listen_free',
            };
          }
        } catch (err) {}
      }
      return null;
    }
  },

  // 9. Get Playlist Details with complete tracklist
  async getPlaylistDetails(playlistId: string, fallbackTitle?: string): Promise<Playlist | null> {
    try {
      const cleanId = playlistId.replace(/^\/?playlist\//, '');
      const isLink = cleanId.startsWith('http') || cleanId.includes('jiosaavn.com');
      const endpoint = isLink
        ? `/playlists?link=${encodeURIComponent(cleanId)}`
        : `/playlists?id=${encodeURIComponent(cleanId)}`;

      let res: any = await fetchJsonWithFailover(LISTEN_FREE_CLUSTER, endpoint);
      let raw = res?.data || res;

      // Failover to /playlists/:id if needed
      if (!raw || (!raw.songs && !raw.tracks)) {
        try {
          const altRes: any = await fetchJsonWithFailover(
            LISTEN_FREE_CLUSTER,
            `/playlists/${encodeURIComponent(cleanId)}`
          );
          if (altRes?.data?.songs || altRes?.data?.tracks || altRes?.songs || altRes?.tracks) {
            raw = altRes.data || altRes;
          }
        } catch (e) {}
      }

      if (!raw) throw new Error('No raw playlist data');

      const rawList = Array.isArray(raw.songs)
        ? raw.songs
        : Array.isArray(raw.tracks)
        ? raw.tracks
        : Array.isArray(raw.data?.songs)
        ? raw.data.songs
        : Array.isArray(raw)
        ? raw
        : [];

      let tracks: Track[] = rawList.map(normalizeListenFreeSong);

      // If empty songs list, fallback to searching songs with playlist name/cleanId/fallbackTitle
      const playlistName = decodeHtmlEntities(raw.name || raw.title || fallbackTitle || '');
      if (tracks.length === 0 && (playlistName || cleanId || fallbackTitle)) {
        const fallback = await this.searchSongs(playlistName || fallbackTitle || cleanId, 30);
        if (fallback.length > 0) {
          const seen = new Set<string>();
          tracks = fallback.filter((t) => {
            const key = t.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      }

      return {
        id: String(raw.id || cleanId),
        name: playlistName || fallbackTitle || 'Curated Playlist',
        description: decodeHtmlEntities(raw.description || ''),
        image: sanitizeImageUrl(
          Array.isArray(raw.image) ? raw.image[raw.image.length - 1]?.url : raw.image
        ),
        trackCount: tracks.length,
        tracks,
        sourceEngine: 'listen_free',
      };
    } catch (e) {
      console.warn('[ListenFree] getPlaylistDetails error:', e);
      // Robust failover: search catalog using playlist title/id
      const query = fallbackTitle || playlistId;
      if (query) {
        try {
          const fallbackTracks = await this.searchSongs(query, 30);
          if (fallbackTracks.length > 0) {
            const seen = new Set<string>();
            const unique = fallbackTracks.filter((t) => {
              const key = t.name.toLowerCase().trim();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return {
              id: playlistId,
              name: fallbackTitle || query,
              description: 'Curated Playlist',
              image: unique[0]?.image || '',
              trackCount: unique.length,
              tracks: unique,
              sourceEngine: 'listen_free',
            };
          }
        } catch (err) {}
      }
      return null;
    }
  },

  // 10. Get Artist Details & Top Tracks
  async getArtistDetails(artistId: string, fallbackName?: string): Promise<Artist | null> {
    try {
      const res: any = await fetchJsonWithFailover(
        LISTEN_FREE_CLUSTER,
        `/artists/${artistId}?page=1`
      );
      const raw = res.data || res;
      if (!raw) throw new Error('No raw artist data');

      const rawSongs = Array.isArray(raw.topSongs)
        ? raw.topSongs
        : Array.isArray(raw.songs)
        ? raw.songs
        : [];

      let topTracks: Track[] = rawSongs.map(normalizeListenFreeSong);

      const artistName = decodeHtmlEntities(raw.name || fallbackName || '');
      if (topTracks.length === 0 && (artistName || artistId || fallbackName)) {
        const fallback = await this.searchSongs(artistName || fallbackName || artistId, 30);
        if (fallback.length > 0) {
          topTracks = fallback;
        }
      }

      return {
        id: String(raw.id || artistId),
        name: artistName || fallbackName || 'Artist',
        image: sanitizeImageUrl(
          Array.isArray(raw.image) ? raw.image[raw.image.length - 1]?.url : raw.image
        ),
        bio: raw.bio?.[0]?.text || '',
        followerCount: raw.followerCount,
        topTracks,
        sourceEngine: 'listen_free',
      };
    } catch (e) {
      const query = fallbackName || artistId;
      if (query) {
        try {
          const fallbackTracks = await this.searchSongs(query, 30);
          if (fallbackTracks.length > 0) {
            return {
              id: artistId,
              name: fallbackName || query,
              image: fallbackTracks[0]?.image || '',
              topTracks: fallbackTracks,
              sourceEngine: 'listen_free',
            };
          }
        } catch (err) {
          // ignore
        }
      }
      return null;
    }
  },

  // 11. Fetch Synced Lyrics (Worker + LrcLib Multi-Step)
  async getLyrics(song: Track): Promise<LyricsData | null> {
    // 11.1 Try Worker first
    try {
      const workerUrl = `https://listenfreelyrics.abdulazeezmd060.workers.dev/api/songs/${song.id}/lyrics`;
      const res = await fetchWithTimeout(workerUrl, { timeoutMs: 1500 });
      if (res.ok) {
        const json: any = await res.json();
        if (json.lyrics || json.data?.lyrics) {
          const lrc = json.lyrics || json.data?.lyrics;
          const parsed = parseLRC(lrc);
          if (parsed.length > 0) {
            return { syncedLyrics: parsed, plainLyrics: lrc, provider: 'cloudflare_worker' };
          }
          return { plainLyrics: lrc, provider: 'cloudflare_worker' };
        }
      }
    } catch (e) {
      // fallback
    }

    // 11.2 Try LrcLib Exact
    try {
      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
        song.name
      )}&artist_name=${encodeURIComponent(song.artist)}&duration=${Math.round(song.duration)}`;
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'ListenFreeApp/2.0' },
        timeoutMs: 2000,
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.syncedLyrics) {
          return {
            syncedLyrics: parseLRC(data.syncedLyrics),
            plainLyrics: data.plainLyrics,
            provider: 'lrclib',
          };
        } else if (data.plainLyrics) {
          return {
            plainLyrics: data.plainLyrics,
            provider: 'lrclib',
          };
        }
      }
    } catch (e) {
      // fallback
    }

    // 11.3 Try LrcLib Search
    try {
      const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(
        song.name
      )}&artist_name=${encodeURIComponent(song.artist)}`;
      const res = await fetchWithTimeout(searchUrl, {
        headers: { 'User-Agent': 'ListenFreeApp/2.0' },
        timeoutMs: 2000,
      });
      if (res.ok) {
        const list: any = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const match = list.find((item) => item.syncedLyrics) || list[0];
          if (match.syncedLyrics) {
            return {
              syncedLyrics: parseLRC(match.syncedLyrics),
              plainLyrics: match.plainLyrics,
              provider: 'lrclib',
            };
          } else if (match.plainLyrics) {
            return { plainLyrics: match.plainLyrics, provider: 'lrclib' };
          }
        }
      }
    } catch (e) {
      // ignored
    }

    return null;
  },

  // 12. YouTube Stream Resolver Fallback
  async getYoutubeStreamUrl(query: string): Promise<string | null> {
    try {
      const url = `https://yt-url-ecru.vercel.app/getUrl?song=${encodeURIComponent(query)}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 2500 });
      if (res.ok) {
        const data: any = await res.json();
        const rawUrl = data.videoUrl || data.url || data.audioUrl || data.streamUrl;
        return sanitizeAudioUrl(typeof rawUrl === 'string' ? rawUrl : Array.isArray(rawUrl) ? rawUrl[0] : null);
      }
    } catch (e) {
      console.warn('[ListenFree] YouTube resolver error:', e);
    }
    return null;
  },

  // 13. Supabase Live Collaborative Listening Rooms
  async getLiveRooms(): Promise<SupabaseRoomMetadata[]> {
    try {
      const url = `${SUPABASE_ROOMS_URL}/space_metadata?select=*&order=created_at.desc&limit=25`;
      const res = await fetchWithTimeout(url, {
        timeoutMs: 1500,
        headers: {
          apikey: SUPABASE_ROOMS_KEY,
          Authorization: `Bearer ${SUPABASE_ROOMS_KEY}`,
        },
      });
      if (res.ok) {
        return (await res.json()) as SupabaseRoomMetadata[];
      }
    } catch (e) {
      // Silent catch so it never blocks
    }
    return [];
  },

  async createLiveRoom(spaceName: string, userId = 'user_' + Date.now()): Promise<SupabaseRoomMetadata | null> {
    try {
      const url = `${SUPABASE_ROOMS_URL}/space_metadata`;
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        timeoutMs: 3000,
        headers: {
          apikey: SUPABASE_ROOMS_KEY,
          Authorization: `Bearer ${SUPABASE_ROOMS_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          space_name: spaceName,
          no_of_people: 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data[0] : data;
      }
    } catch (e) {
      console.warn('[Supabase Rooms] Failed to create room:', e);
    }
    return null;
  },

  async getRoomQueue(spaceId: string): Promise<SupabaseQueueSong[]> {
    try {
      const url = `${SUPABASE_ROOMS_URL}/songs_queue?space_id=eq.${spaceId}&status=eq.queued&order=queue_position.asc&select=*`;
      const res = await fetchWithTimeout(url, {
        timeoutMs: 2000,
        headers: {
          apikey: SUPABASE_ROOMS_KEY,
          Authorization: `Bearer ${SUPABASE_ROOMS_KEY}`,
        },
      });
      if (res.ok) {
        return (await res.json()) as SupabaseQueueSong[];
      }
    } catch (e) {
      console.warn('[Supabase Rooms] Failed to get room queue:', e);
    }
    return [];
  },

  // 14. Supabase Video Previews Feed
  async getVideoPreviews(): Promise<VideoPreview[]> {
    try {
      const url = `${SUPABASE_VIDEOS_URL}/video-preview-collection?select=*&limit=30`;
      const res = await fetchWithTimeout(url, {
        timeoutMs: 1500,
        headers: {
          apikey: SUPABASE_VIDEOS_KEY,
          Authorization: `Bearer ${SUPABASE_VIDEOS_KEY}`,
        },
      });
      if (res.ok) {
        const list: any[] = await res.json();
        return list.map((item) => ({
          id: String(item.id || Math.random()),
          title: decodeHtmlEntities(item.title || item.song_name || 'Preview Track'),
          artist: decodeHtmlEntities(item.artist || item.artist_name || 'Various Artists'),
          videoUrl: item.video_url || item.url || '',
          thumbnailUrl: sanitizeImageUrl(item.thumbnail_url || item.image_url),
          duration: item.duration,
          songId: item.song_id,
          sourceEngine: 'listen_free',
        }));
      }
    } catch (e) {
      // Silent catch so it never blocks
    }
    return [];
  },
};

