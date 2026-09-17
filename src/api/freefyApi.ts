// Freefy API Gateway (https://freefy.app)
// Full support for Freefy BeMusic Core API, Curated Channels, Subchannels, Live Radios & Lyrics

import { fetchWithTimeout } from './apiClient';
import {
  Track,
  Album,
  Artist,
  Playlist,
  LiveRadioStation,
  LyricsData,
} from '../types/music';
import { UnifiedSearchResults } from '../types/engine';
import { sanitizeImageUrl, extractString } from '../utils/audioUtils';

const FREEFY_BASE_URL = 'https://freefy.app/api/v1';

function resolveFreefyImageUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = String(rawUrl).trim();
  if (url.startsWith('storage/') || url.startsWith('/storage/')) {
    url = `https://freefy.app/${url.replace(/^\//, '')}`;
  } else if (url.startsWith('//')) {
    url = `https:${url}`;
  }
  return sanitizeImageUrl(url);
}

export function normalizeFreefyTrack(raw: any): Track {
  let image = '';
  if (raw.image) image = resolveFreefyImageUrl(raw.image);
  else if (raw.album?.image) image = resolveFreefyImageUrl(raw.album.image);
  else if (raw.artists?.[0]?.image_small) image = resolveFreefyImageUrl(raw.artists[0].image_small);
  else if (raw.artists?.[0]?.image_large) image = resolveFreefyImageUrl(raw.artists[0].image_large);

  let artistName = 'Unknown Artist';
  let primaryArtistId: string | undefined = undefined;

  if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    artistName = raw.artists
      .map((a: any) => (typeof a === 'string' ? a : a?.name || extractString(a)))
      .filter(Boolean)
      .join(', ');
    primaryArtistId = raw.artists[0]?.id ? String(raw.artists[0].id) : undefined;
  } else if (raw.artist_name || raw.artist) {
    artistName = extractString(raw.artist_name || raw.artist, 'Unknown Artist');
  }

  // Duration in seconds (API often returns duration in milliseconds e.g. 170320)
  let durationSec = 180;
  if (raw.duration) {
    const rawDur = Number(raw.duration);
    durationSec = rawDur > 1000 ? Math.round(rawDur / 1000) : rawDur;
  }

  // Freefy provides `src` as the YouTube Video ID (e.g. 'ZqgKKbg2Ja8') or direct stream url
  const src = raw.src || raw.youtube_id || raw.stream_url || raw.url || '';
  let artistImage = '';
  if (raw.artists?.[0]?.image_large) artistImage = resolveFreefyImageUrl(raw.artists[0].image_large);
  else if (raw.artists?.[0]?.image_small) artistImage = resolveFreefyImageUrl(raw.artists[0].image_small);

  let albumImage = '';
  if (raw.album?.image) albumImage = resolveFreefyImageUrl(raw.album.image);
  const albumName = extractString(raw.album?.name || raw.album_name || raw.album || '', '');

  return {
    id: String(raw.id || Math.random()),
    name: extractString(raw.name || raw.title, 'Untitled Track'),
    artist: extractString(artistName, 'Unknown Artist'),
    artistId: primaryArtistId,
    artistImage: artistImage || undefined,
    album: albumName,
    albumId: raw.album?.id ? String(raw.album.id) : undefined,
    albumImage: albumImage || undefined,
    year: raw.album?.release_date || raw.release_date ? String(raw.album?.release_date || raw.release_date).substring(0, 4) : undefined,
    duration: durationSec,
    image: image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    thumbnailImage: image,
    streamUrl: src,
    src: src,
    hasLyrics: Boolean(raw.has_lyrics || raw.lyrics),
    sourceEngine: 'freefy',
    playCount: Number(raw.plays || raw.plays_count || 0),
  };
}

export function normalizeFreefyRadio(raw: any): LiveRadioStation {
  const streamUrl = raw.url_resolved || raw.stream_url || raw.url || '';
  const favicon = resolveFreefyImageUrl(raw.favicon) || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80';

  let tags: string[] = [];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags.map((t: any) => String(t).trim()).filter(Boolean);
  } else if (typeof raw.tags === 'string') {
    tags = raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  return {
    id: String(raw.stationuuid || raw.id || raw.uuid || Math.random()),
    name: extractString(raw.name || raw.title, 'Live Radio Station'),
    url: streamUrl,
    favicon: favicon,
    country: raw.country || '',
    countryCode: raw.country_code || raw.countrycode || raw.countryCode || '',
    tags: tags.length > 0 ? tags : ['Music', 'Live'],
    votes: Number(raw.votes || 0),
    codec: raw.codec || 'MP3',
    bitrate: Number(raw.bitrate || 128),
    sourceEngine: 'freefy',
  };
}

export function normalizeFreefyAlbum(raw: any): Album {
  let artistName = 'Unknown Artist';
  if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    artistName = raw.artists
      .map((a: any) => (typeof a === 'string' ? a : a?.name || extractString(a)))
      .filter(Boolean)
      .join(', ');
  } else if (raw.artist_name || raw.artist) {
    artistName = extractString(raw.artist_name || raw.artist, 'Unknown Artist');
  }

  return {
    id: String(raw.id),
    name: extractString(raw.name || raw.title, 'Untitled Album'),
    artist: artistName,
    year: raw.release_date ? String(raw.release_date).substring(0, 4) : undefined,
    image: resolveFreefyImageUrl(raw.image) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=500&q=80',
    songCount: Number(raw.tracks_count || (raw.tracks ? raw.tracks.length : 0)),
    sourceEngine: 'freefy',
  };
}

export function normalizeFreefyArtist(raw: any): Artist {
  return {
    id: String(raw.id),
    name: extractString(raw.name, 'Artist'),
    image: resolveFreefyImageUrl(raw.image_large || raw.image_small || raw.image) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
    sourceEngine: 'freefy',
  };
}

export function normalizeFreefyPlaylist(raw: any): Playlist {
  return {
    id: String(raw.id),
    name: extractString(raw.name || raw.title, 'Featured Playlist'),
    description: extractString(raw.description || '', ''),
    image: resolveFreefyImageUrl(raw.image) || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    trackCount: Number(raw.tracks_count || (raw.tracks ? raw.tracks.length : 0)),
    sourceEngine: 'freefy',
  };
}

export const freefyApi = {
  // 1. Curated Discover Channels & Subchannels
  async getCuratedChannels(): Promise<{
    channel?: any;
    featuredTracks: Track[];
    featuredPlaylists: Playlist[];
    featuredAlbums: Album[];
    topArtists: Artist[];
    genres: { id: string; name: string; image?: string }[];
  }> {
    try {
      const url = `${FREEFY_BASE_URL}/channel/discover?loader=channelPage`;
      const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
      if (res.ok) {
        const json: any = await res.json();
        const subchannels: any[] = json.channel?.content?.data || [];

        const allTracks: Track[] = [];
        const allPlaylists: Playlist[] = [];
        const allAlbums: Album[] = [];
        const allArtists: Artist[] = [];
        const allGenres: { id: string; name: string; image?: string }[] = [];

        for (const sc of subchannels) {
          const items = sc.content?.data || [];
          const model = sc.config?.contentModel || sc.contentModel;

          if (model === 'track' || sc.slug === 'todays-top-hits' || sc.slug === 'viral-top-100' || sc.slug === 'popular-tracks') {
            for (const t of items) {
              if (t && (t.name || t.title)) {
                allTracks.push(normalizeFreefyTrack(t));
              }
            }
          } else if (model === 'playlist' || sc.slug === 'top-music-season' || sc.slug === 'featured-playlists' || sc.slug === 'workout-gym') {
            for (const p of items) {
              if (p && (p.name || p.title)) {
                allPlaylists.push(normalizeFreefyPlaylist(p));
              }
            }
          } else if (model === 'album' || sc.slug === 'new-album-releases' || sc.slug === 'popular-albums') {
            for (const a of items) {
              if (a && (a.name || a.title)) {
                allAlbums.push(normalizeFreefyAlbum(a));
              }
            }
          } else if (model === 'artist' || sc.slug === 'popular-artists') {
            for (const art of items) {
              if (art && art.name) {
                allArtists.push(normalizeFreefyArtist(art));
              }
            }
          } else if (model === 'genre' || sc.slug === 'genres') {
            for (const g of items) {
              if (g && (g.name || g.display_name)) {
                allGenres.push({
                  id: String(g.id || g.deezer_id || g.name),
                  name: g.display_name || g.name,
                  image: resolveFreefyImageUrl(g.image),
                });
              }
            }
          }
        }

        // De-duplicate tracks by ID
        const uniqueTracks = Array.from(new Map(allTracks.map((t) => [t.id, t])).values());
        const uniquePlaylists = Array.from(new Map(allPlaylists.map((p) => [p.id, p])).values());
        const uniqueAlbums = Array.from(new Map(allAlbums.map((a) => [a.id, a])).values());
        const uniqueArtists = Array.from(new Map(allArtists.map((a) => [a.id, a])).values());

        if (uniqueTracks.length > 0 || uniquePlaylists.length > 0) {
          return {
            channel: json.channel,
            featuredTracks: uniqueTracks,
            featuredPlaylists: uniquePlaylists,
            featuredAlbums: uniqueAlbums,
            topArtists: uniqueArtists,
            genres: allGenres,
          };
        }
      }
    } catch (e) {
      console.warn('[Freefy] Discover channel fetch error:', e);
    }

    // Fallback: unified search for trending global hits
    try {
      const searchRes = await freefyApi.searchUnified('Top Hits', 30);
      return {
        featuredTracks: searchRes.tracks,
        featuredPlaylists: searchRes.playlists,
        featuredAlbums: searchRes.albums,
        topArtists: searchRes.artists,
        genres: [],
      };
    } catch (e) {
      return {
        featuredTracks: [],
        featuredPlaylists: [],
        featuredAlbums: [],
        topArtists: [],
        genres: [],
      };
    }
  },

  // 2. Unified Global Search
  async searchUnified(query: string, limit = 20): Promise<UnifiedSearchResults> {
    try {
      const url = `${FREEFY_BASE_URL}/search?query=${encodeURIComponent(
        query
      )}&types=tracks,albums,artists,playlists,live_radios&limit=${limit}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
      if (res.ok) {
        const json: any = await res.json();
        const results = json.results || json;

        const rawTracks = results.tracks?.data || results.tracks || [];
        const rawAlbums = results.albums?.data || results.albums || [];
        const rawArtists = results.artists?.data || results.artists || [];
        const rawPlaylists = results.playlists?.data || results.playlists || [];
        const rawRadios =
          results.liveRadios?.data ||
          results.live_radios?.data ||
          results.liveRadios ||
          results.live_radios ||
          [];

        const tracks: Track[] = rawTracks.map(normalizeFreefyTrack);
        const albums: Album[] = rawAlbums.map(normalizeFreefyAlbum);
        const artists: Artist[] = rawArtists.map(normalizeFreefyArtist);
        const playlists: Playlist[] = rawPlaylists.map(normalizeFreefyPlaylist);
        const radios: LiveRadioStation[] = rawRadios.map(normalizeFreefyRadio);

        return { tracks, albums, artists, playlists, radios };
      }
    } catch (e) {
      console.warn('[Freefy] Search error:', e);
    }
    return { tracks: [], albums: [], artists: [], playlists: [], radios: [] };
  },

  // 3. Browse Live Radios
  async getLiveRadios(page = 1, perPage = 30, order = 'votes:desc'): Promise<LiveRadioStation[]> {
    try {
      const url = `${FREEFY_BASE_URL}/live-radios?page=${page}&perPage=${perPage}&order=${encodeURIComponent(
        order
      )}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 7000 });
      if (res.ok) {
        const json: any = await res.json();
        const data = json.stations || json.data || json.pagination?.data || json;
        if (Array.isArray(data) && data.length > 0) {
          return data.map(normalizeFreefyRadio);
        }
      }
    } catch (e) {
      console.warn('[Freefy] Live radios fetch error:', e);
    }

    // Failover to Radio-Browser mirror
    try {
      const fbUrl = `https://de1.api.radio-browser.info/json/stations/topvote/${perPage}`;
      const fbRes = await fetchWithTimeout(fbUrl, { timeoutMs: 5000 });
      if (fbRes.ok) {
        const list: any = await fbRes.json();
        if (Array.isArray(list)) return list.map(normalizeFreefyRadio);
      }
    } catch (err) {}

    return [];
  },

  // 4. Radios by Country
  async getRadiosByCountry(countryCode: string, page = 1, perPage = 30): Promise<LiveRadioStation[]> {
    try {
      const url = `${FREEFY_BASE_URL}/live-radios/country/${encodeURIComponent(
        countryCode
      )}?page=${page}&perPage=${perPage}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 7000 });
      if (res.ok) {
        const json: any = await res.json();
        const list = json.stations || json.data || json.pagination?.data || json;
        if (Array.isArray(list) && list.length > 0) {
          return list.map(normalizeFreefyRadio);
        }
      }
    } catch (e) {
      console.warn('[Freefy] Radios by country error:', e);
    }

    // Fallback
    try {
      const fbUrl = `https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${countryCode.toLowerCase()}?limit=${perPage}`;
      const fbRes = await fetchWithTimeout(fbUrl, { timeoutMs: 5000 });
      if (fbRes.ok) {
        const list: any = await fbRes.json();
        if (Array.isArray(list)) return list.map(normalizeFreefyRadio);
      }
    } catch (err) {}

    return [];
  },

  // 5. Radios by Tag
  async getRadiosByTag(tag: string, page = 1, perPage = 30): Promise<LiveRadioStation[]> {
    try {
      const url = `${FREEFY_BASE_URL}/live-radios/tag/${encodeURIComponent(tag)}?page=${page}&perPage=${perPage}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 7000 });
      if (res.ok) {
        const json: any = await res.json();
        const list = json.stations || json.data || json.pagination?.data || json;
        if (Array.isArray(list) && list.length > 0) {
          return list.map(normalizeFreefyRadio);
        }
      }
    } catch (e) {
      console.warn('[Freefy] Radios by tag error:', e);
    }

    try {
      const fbUrl = `https://de1.api.radio-browser.info/json/stations/bytag/${encodeURIComponent(tag)}?limit=${perPage}`;
      const fbRes = await fetchWithTimeout(fbUrl, { timeoutMs: 5000 });
      if (fbRes.ok) {
        const list: any = await fbRes.json();
        if (Array.isArray(list)) return list.map(normalizeFreefyRadio);
      }
    } catch (err) {}

    return [];
  },

  // 6. Countries List
  async getCountries(): Promise<{ name: string; code: string; stationcount?: number }[]> {
    try {
      const url = `${FREEFY_BASE_URL}/live-radios/countries`;
      const res = await fetchWithTimeout(url, { timeoutMs: 5000 });
      if (res.ok) {
        const json: any = await res.json();
        const list = Array.isArray(json) ? json : json.data || json.countries || [];
        if (list.length > 0) return list;
      }
    } catch (e) {
      // ignore
    }
    return [
      { name: 'United States', code: 'US' },
      { name: 'United Kingdom', code: 'GB' },
      { name: 'India', code: 'IN' },
      { name: 'Canada', code: 'CA' },
      { name: 'Germany', code: 'DE' },
      { name: 'France', code: 'FR' },
      { name: 'Spain', code: 'ES' },
      { name: 'Australia', code: 'AU' },
      { name: 'Brazil', code: 'BR' },
    ];
  },

  // 7. Get Album Details & Tracks
  async getAlbum(id: string, name?: string): Promise<{ album: Album; tracks: Track[] } | null> {
    try {
      const url = `${FREEFY_BASE_URL}/albums/${encodeURIComponent(id)}?loader=albumPage`;
      const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
      if (res.ok) {
        const json: any = await res.json();
        const rawAlbum = json.album || json;
        if (rawAlbum) {
          const album = normalizeFreefyAlbum(rawAlbum);
          const rawTracks = rawAlbum.tracks?.data || rawAlbum.tracks || json.tracks?.data || json.tracks || [];
          const tracks = rawTracks.map(normalizeFreefyTrack);
          const seen = new Set<string>();
          const uniqueTracks = tracks.filter((t: Track) => {
            const key = t.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return { album, tracks: uniqueTracks.length > 0 ? uniqueTracks : tracks };
        }
      }
    } catch (e) {
      console.warn('[Freefy] Get album error:', e);
    }

    // Fallback: search by album name
    if (name) {
      try {
        const s = await freefyApi.searchUnified(name, 10);
        if (s.albums.length > 0) {
          const firstAlbum = s.albums[0];
          if (firstAlbum.id && firstAlbum.id !== id) {
            const alt = await this.getAlbum(firstAlbum.id);
            if (alt?.tracks && alt.tracks.length > 0) {
              return alt;
            }
          }
        }
        if (s.tracks.length > 0) {
          const seen = new Set<string>();
          const uniqueTracks = s.tracks.filter((t) => {
            const key = t.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return { album: s.albums[0] || { id, name, sourceEngine: 'freefy' }, tracks: uniqueTracks };
        }
      } catch (err) {}
    }
    return null;
  },

  // 8. Get Artist Details, Top Tracks & Albums
  async getArtist(id: string): Promise<{ artist: Artist; topTracks: Track[]; albums: Album[] } | null> {
    try {
      const url = `${FREEFY_BASE_URL}/artists/${encodeURIComponent(id)}?loader=artistPage`;
      const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
      if (res.ok) {
        const json: any = await res.json();
        const rawArtist = json.artist || json;
        if (rawArtist) {
          const artist = normalizeFreefyArtist(rawArtist);
          const rawTracks = json.tracks?.data || json.tracks || rawArtist.tracks || [];
          const rawAlbums = json.albums?.data || json.albums || rawArtist.albums || [];

          const topTracks = rawTracks.map(normalizeFreefyTrack);
          const albums = rawAlbums.map(normalizeFreefyAlbum);

          return { artist, topTracks, albums };
        }
      }
    } catch (e) {
      console.warn('[Freefy] Get artist error:', e);
    }
    return null;
  },

  // 9. Get Playlist Details & Tracks
  async getPlaylist(id: string, name?: string): Promise<{ playlist: Playlist; tracks: Track[] } | null> {
    try {
      const url = `${FREEFY_BASE_URL}/playlists/${encodeURIComponent(id)}?loader=playlistPage`;
      const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
      if (res.ok) {
        const json: any = await res.json();
        const rawPlaylist = json.playlist || json;
        if (rawPlaylist) {
          const playlist = normalizeFreefyPlaylist(rawPlaylist);
          const rawTracks = json.tracks?.data || json.tracks || rawPlaylist.tracks?.data || rawPlaylist.tracks || [];
          const tracks = rawTracks.map(normalizeFreefyTrack);
          return { playlist, tracks };
        }
      }
    } catch (e) {
      console.warn('[Freefy] Get playlist error:', e);
    }

    if (name) {
      try {
        const s = await freefyApi.searchUnified(name, 10);
        if (s.playlists.length > 0) {
          return { playlist: s.playlists[0], tracks: s.tracks };
        }
      } catch (err) {}
    }
    return null;
  },

  // 10. Get Track Synced Lyrics
  async getTrackLyrics(trackId: string): Promise<LyricsData | null> {
    try {
      const url = `${FREEFY_BASE_URL}/tracks/${encodeURIComponent(trackId)}/lyrics`;
      const res = await fetchWithTimeout(url, { timeoutMs: 6000 });
      if (res.ok) {
        const json: any = await res.json();
        if (json.lines && Array.isArray(json.lines)) {
          const syncedLyrics = json.lines.map((l: any) => ({
            timeMs: Math.round(Number(l.time || 0) * 1000),
            text: extractString(l.text || '', ''),
          }));
          const plainLyrics = syncedLyrics.map((s: any) => s.text).join('\n');
          return {
            syncedLyrics,
            plainLyrics,
            provider: 'freefy_native',
          };
        }
      }
    } catch (e) {
      console.warn('[Freefy] Track lyrics error:', e);
    }
    return null;
  },

  // 11. Curated Genres List
  async getGenres(): Promise<{ id: string; name: string; image?: string }[]> {
    return [
      { id: 'pop', name: 'Pop Hits', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80' },
      { id: 'rock', name: 'Rock & Classics', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80' },
      { id: 'hiphop', name: 'Hip-Hop & Rap', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80' },
      { id: 'electronic', name: 'EDM & Dance', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80' },
      { id: 'chill', name: 'Lo-Fi & Chill', image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80' },
      { id: 'workout', name: 'Gym & Workout', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80' },
    ];
  },

  // 12. Import External Playlist
  async importExternalPlaylist(externalUrl: string): Promise<{ success: boolean; message: string; playlist?: Playlist }> {
    try {
      const endpoint = `${FREEFY_BASE_URL}/playlists/import`;
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: externalUrl }),
        timeoutMs: 10000,
      });
      if (res.ok) {
        const json: any = await res.json();
        if (json.playlist) {
          return { success: true, message: 'Playlist imported successfully!', playlist: normalizeFreefyPlaylist(json.playlist) };
        }
      }
    } catch (e) {}
    return { success: false, message: 'Could not import playlist from this link.' };
  },

  // 13. Radio Click Logging
  logRadioClick: async (stationId: string) => {
    try {
      fetchWithTimeout(`https://de1.api.radio-browser.info/json/url/${stationId}`, { timeoutMs: 2000 }).catch(() => {});
    } catch (e) {}
  },
};
