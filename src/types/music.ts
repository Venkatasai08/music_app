// Universal Normalized Music Models across ListenFree, Freefy, and TuneFree

export type AudioQuality = '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps';

export interface QualityDownloadLink {
  quality: AudioQuality;
  url: string;
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  artistImage?: string;
  album?: string;
  albumId?: string;
  albumImage?: string;
  year?: string;
  duration: number; // in seconds
  image: string; // high res image URL
  thumbnailImage?: string;
  streamUrl: string; // active direct streaming URL
  downloadUrls?: QualityDownloadLink[];
  hasLyrics?: boolean;
  sourceEngine: 'listen_free' | 'freefy' | 'tune_free';
  playCount?: number;
  genre?: string;
  youtubeId?: string;
  src?: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  year?: string;
  image: string;
  songCount?: number;
  tracks?: Track[];
  sourceEngine: 'listen_free' | 'freefy' | 'tune_free';
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  bio?: string;
  followerCount?: number;
  topTracks?: Track[];
  albums?: Album[];
  sourceEngine: 'listen_free' | 'freefy' | 'tune_free';
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  image: string;
  trackCount?: number;
  tracks?: Track[];
  creatorName?: string;
  isPublic?: boolean;
  sourceEngine: 'listen_free' | 'freefy' | 'tune_free';
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface LyricsData {
  syncedLyrics?: LyricLine[];
  plainLyrics?: string;
  provider: 'lrclib' | 'cloudflare_worker' | 'freefy_native';
}

export interface LiveRadioStation {
  id: string;
  name: string;
  url: string;
  favicon?: string;
  country?: string;
  countryCode?: string;
  tags?: string[];
  votes?: number;
  codec?: string;
  bitrate?: number;
  sourceEngine: 'freefy';
}

export interface VideoPreview {
  id: string;
  title: string;
  artist: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration?: number;
  songId?: string;
  sourceEngine: 'listen_free';
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface TrackPlayRange {
  startSec: number;
  endSec: number;
  enabled?: boolean;
}

