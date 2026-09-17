// Supabase Live Listening Room and Queue Schemas

export interface SpacePlaybackState {
  status: 'playing' | 'paused';
  timestamp: string;
  position: number;
  leader_id?: string;
}

export interface SupabaseRoomMetadata {
  id: string;
  user_id: string;
  space_name: string;
  current_song_id?: string;
  playback_state?: SpacePlaybackState | string;
  start_time?: string;
  no_of_people?: number;
  created_at?: string;
}

export interface SupabaseQueueSong {
  id?: string;
  space_id: string;
  song_id: string;
  song_name: string;
  artist: string;
  added_by: string;
  image_url: string;
  song_download_url: string[];
  queue_position: number;
  duration_seconds: number;
  votes: number;
  status: 'queued' | 'playing' | 'played';
  created_at?: string;
}
