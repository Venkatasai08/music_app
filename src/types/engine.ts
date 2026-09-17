// Engine and Navigation Type Definitions

import { Track, Album, Artist, Playlist, LiveRadioStation } from './music';

export type EngineType = 'listen_free' | 'freefy' | 'tune_free';

export type SearchCategory = 'all' | 'songs' | 'albums' | 'artists' | 'playlists' | 'radios';

export interface UnifiedSearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  radios?: LiveRadioStation[];
}

export type MainTabType = 'home' | 'search' | 'explore' | 'library' | 'artist' | 'playlist';

export interface DetailScreenParams {
  type: 'album' | 'playlist' | 'artist' | 'room' | 'track';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  itemData?: any;
}

export interface TuneFreeItem {
  id: string;
  name: string;
  subtitle?: string;
  image?: string;
  model_type: 'track' | 'album' | 'artist' | 'playlist';
  duration?: number;
  artists?: { name: string; model_type?: string }[];
  album?: { name: string; images?: { url: string }[] };
}

export interface TuneFreeSection {
  title: string;
  items: TuneFreeItem[];
}

export interface TuneFreeBrowseResponse {
  homeSections: TuneFreeSection[];
  exploreSections: TuneFreeSection[];
  popularArtists: {
    id: string;
    name: string;
    image: string;
    model_type: 'artist';
  }[];
}

