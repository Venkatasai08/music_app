# Freefy API & Architecture Documentation (`https://freefy.app`)

## Overview
Freefy is a modern, high-performance ad-free music streaming platform powered by Laravel BeMusic backend, Cloudflare Edge, and YouTube audio stream resolvers. It provides unlimited access to curated discover channels, top global charts, playlists, albums, artists, synchronized LRC lyrics, and live worldwide radio stations.

---

## 1. Engine Configuration & Architecture
- **Engine Identifier:** `freefy`
- **Branding Color:** `#10B981` (Emerald Green) / Secondary: `#059669`
- **Background Theme:** `#070B14` (Deep Onyx Navy), `#0E1420` (Glass Slate Surface)
- **Base API URL:** `https://freefy.app/api/v1`
- **Web App URL:** `https://freefy.app`
- **Content Delivery Network:** Cloudflare Edge with WebP/JPEG image caching (`https://freefy.app/storage/...`, `https://cdn-images.dzcdn.net`, `https://i.scdn.co`)
- **Audio Streaming Backend:** Freefy YouTube Audio Resolution (`src: <11-character-youtube-id>`) + ListenFree 320k Lossless Stream Matching

---

## 2. API Endpoints Reference

### A. Curated Discover Channels & Subchannels
#### `GET /api/v1/channel/discover?loader=channelPage`
Fetches the complete curated discover channel including all nested subchannels, tracks, playlists, albums, artists, and genres.

- **Request Headers:**
  ```http
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36
  Accept: application/json, text/plain, */*
  Referer: https://freefy.app/
  Origin: https://freefy.app
  ```

- **Nested Subchannels Returned:**
  1. `Today's Top Hits` (`slug: "todays-top-hits"`, `model: "track"`) — 50 global hit tracks.
  2. `Viral Top 100` (`slug: "viral-top-100"`, `model: "track"`) — 50 trending viral hits.
  3. `Popular Tracks` (`slug: "popular-tracks"`, `model: "track"`) — 50 top played tracks.
  4. `Top Music Season` (`slug: "top-music-season"`, `model: "playlist"`) — Curated seasonal playlists.
  5. `Featured Playlists` (`slug: "featured-playlists"`, `model: "playlist"`) — Editor's pick playlists.
  6. `Workout Gym` (`slug: "workout-gym"`, `model: "playlist"`) — High-energy gym and workout mixes.
  7. `New Album Releases` (`slug: "new-album-releases"`, `model: "album"`) — Latest studio albums worldwide.
  8. `Popular Albums` (`slug: "popular-albums"`, `model: "album"`) — All-time favorite and trending albums.
  9. `Popular Artists` (`slug: "popular-artists"`, `model: "artist"`) — Top global artists and performers.
  10. `Genres` (`slug: "genres"`, `model: "genre"`) — Genre hubs (Pop, Rock, Hip-Hop, Electronic, Lo-Fi, etc.).

- **Sample Track Object Schema:**
  ```json
  {
    "id": 2669955343,
    "name": "Sue me",
    "duration": 170320,
    "src": "ZqgKKbg2Ja8",
    "image": "https://i.scdn.co/image/ab67616d00001e02d754a73edca1a9d88ebd7658",
    "model_type": "track",
    "artists": [
      {
        "id": 12345,
        "name": "Audrey Hobert",
        "model_type": "artist"
      }
    ],
    "album": {
      "id": 67890,
      "name": "Who's the Clown?",
      "release_date": "2026-05-10"
    }
  }
  ```

---

### B. Global Unified Search
#### `GET /api/v1/search?query={query}&types=tracks,albums,artists,playlists,live_radios&limit={limit}`
Performs a unified search across all music categories in Freefy's catalog.

- **Query Parameters:**
  - `query`: Search string (e.g. `Taylor Swift`, `Coldplay`, `Arijit Singh`)
  - `types`: `tracks,albums,artists,playlists,live_radios`
  - `limit`: Number of items per category (default: `20`)

- **Response Structure:**
  ```json
  {
    "query": "Taylor Swift",
    "results": {
      "tracks": { "data": [ ... ] },
      "albums": { "data": [ ... ] },
      "artists": { "data": [ ... ] },
      "playlists": { "data": [ ... ] },
      "liveRadios": { "data": [ ... ] }
    }
  }
  ```

---

### C. Albums
#### `GET /api/v1/albums/{id}?loader=albumPage`
Retrieves album details and full tracklist.

- **Response Structure:**
  ```json
  {
    "album": {
      "id": 6700170450,
      "name": "The Real Me",
      "release_date": "2026-02-14",
      "image": "https://cdn-images.dzcdn.net/images/cover/...",
      "tracks_count": 22,
      "artists": [ ... ],
      "tracks": {
        "data": [
          {
            "id": 123456,
            "name": "Track Title",
            "duration": 195000,
            "src": "video_id_here",
            "artists": [ ... ]
          }
        ]
      }
    }
  }
  ```

---

### D. Artists
#### `GET /api/v1/artists/{id}?loader=artistPage`
Retrieves artist biography, top popular tracks, and discography albums.

- **Response Structure:**
  ```json
  {
    "artist": {
      "id": 10462664589,
      "name": "Michael Jackson",
      "image_large": "https://...",
      "image_small": "https://..."
    },
    "tracks": [ ... ],
    "albums": {
      "data": [ ... ]
    }
  }
  ```

---

### E. Playlists
#### `GET /api/v1/playlists/{id}?loader=playlistPage`
Retrieves playlist metadata and all included tracks.

- **Response Structure:**
  ```json
  {
    "playlist": {
      "id": 271319,
      "name": "Beach Chill 2026",
      "image": "storage/playlist_media/0eb4b94a-c0de-43f4-bb6a-9184d9529063.webp",
      "description": "Chillout summer vibes"
    },
    "tracks": {
      "data": [ ... ]
    }
  }
  ```

---

### F. Synchronized Lyrics
#### `GET /api/v1/tracks/{trackId}/lyrics`
Fetches precision time-coded synchronized lyrics for any Freefy track.

- **Response Structure:**
  ```json
  {
    "is_synced": true,
    "duration": 171,
    "lines": [
      { "time": 21.21, "text": "I knew you'd be at the party" },
      { "time": 23.25, "text": "Drinking a coke and Bacardi" },
      { "time": 25.30, "text": "Not that it matters, but I'm breathing heavy" }
    ]
  }
  ```

---

### G. Live Worldwide Radios
#### `GET /api/v1/live-radios?page={page}&perPage={perPage}&order={order}`
Streams worldwide radio broadcast stations.

- **Query Parameters:**
  - `page`: Page index (1-indexed)
  - `perPage`: Items per page (e.g. `30`)
  - `order`: Sort order (e.g. `votes:desc`)

- **Response Structure:**
  ```json
  {
    "stations": [
      {
        "id": "123",
        "name": "MANGORADIO",
        "url": "https://mangoradio.stream.laut.fm/mangoradio",
        "favicon": "https://mangoradio.de/wp-content/uploads/...",
        "country": "Germany",
        "country_code": "DE",
        "tags": ["music", "variety"],
        "codec": "MP3",
        "bitrate": 128
      }
    ]
  }
  ```

---

## 3. Audio Playback & Stream Resolution Strategy
Each Freefy track includes a `src` attribute which corresponds to its YouTube Audio Stream Video ID.
The app resolves Freefy audio streams with a multi-layered resilient approach:
1. **Direct YouTube Video ID Resolver:** Uses `listenFreeApi.getYoutubeStreamUrl(track.src)` for instant zero-latency stream resolution.
2. **High-Fidelity 320k Matching:** Queries ListenFree's 320kbps AAC lossless catalog matching `${track.name} ${track.artist}` in parallel. If available, upgrades playback to high-fidelity 320k stream.
3. **Piped / Cobalt / Invidious CDN Fallback:** If YouTube direct stream is throttled, fails over across distributed audio proxies.
