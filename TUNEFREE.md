# TuneFree API & Architecture Documentation (`https://tunefree.in`)

## Overview
TuneFree is a modern ad-free music streaming platform powered by Cloudflare Workers and YouTube/CDN streaming resolution. It features a curated global music catalog, popular Deezer/Spotify playlist syncing, YouTube-based instant audio resolution, synced LRC lyrics via LRCLIB, and new release discovery.

---

## 1. Engine Configuration & Branding
- **Engine Identifier:** `tune_free`
- **Branding Color:** `#FC3C44` (Apple Crimson / Coral Red)
- **Secondary Accent:** `#FF6B72`
- **Background Palette:** `#0A0A0C` (Onyx Black), `#141418` (Surface Slate)
- **Base API URL:** `https://freefyclone-api.albatross0071.workers.dev/api`
- **Lyrics Provider:** `https://lrclib.net`

---

## 2. API Endpoints Reference

### A. Discovery & Sections
#### `GET /browse/sections`
Fetches curated home and explore sections with playlists, charts, and popular artists.
- **Query Params:** None (optional `_ts` for cache-busting)
- **Response Structure:**
```json
{
  "homeSections": [
    {
      "title": "Popular Playlists",
      "items": [
        {
          "id": "53362031",
          "name": "Les titres du moment",
          "image": "https://cdn-images.dzcdn.net/images/playlist/32facca8f19f96451caf085f8346904d/500x500-000000-80-0-0.jpg",
          "subtitle": "Alexandre - Pop & Hits Editor",
          "model_type": "playlist"
        }
      ]
    }
  ],
  "exploreSections": [
    {
      "title": "Top Charts",
      "items": [...]
    }
  ],
  "popularArtists": [
    {
      "id": "Luke%20Combs",
      "name": "Luke Combs",
      "image": "https://yt3.googleusercontent.com/...",
      "model_type": "artist"
    }
  ]
}
```

#### `GET /browse/new`
Fetches the latest new album and single releases worldwide.
- **Response Structure:**
```json
{
  "sections": [
    {
      "title": "New albums & singles",
      "items": [
        {
          "id": "...",
          "name": "Album Name",
          "artist": "Artist Name",
          "image": "https://...",
          "model_type": "album"
        }
      ]
    }
  ]
}
```

---

### B. Search & Autocomplete
#### `GET /search`
Global search across tracks, artists, albums, and playlists.
- **Query Params:**
  - `q`: Search query string (e.g. `Arijit Singh`, `Taylor Swift`)
  - `type`: `track` | `album` | `artist` | `playlist` (optional)
- **Response Structure:**
```json
{
  "query": "Arijit Singh",
  "type": "track",
  "result": {
    "items": [
      {
        "id": "YiVML4Zo",
        "name": "Gehra Hua",
        "subtitle": "Shashwat Sachdev, Arijit Singh, Irshad Kamil",
        "image": "https://c.saavncdn.com/...",
        "artists": [{ "name": "Arijit Singh", "model_type": "artist" }],
        "album": { "name": "Gehra Hua" },
        "duration": 210,
        "model_type": "track"
      }
    ]
  }
}
```

#### `GET /search/suggestions`
Fast autocomplete suggestions for real-time search typing.
- **Query Params:**
  - `q`: Partial query (e.g. `Taylor`)
- **Response Structure:**
```json
{
  "suggestions": [
    "taylor swift",
    "taylor swift the fate of ophelia",
    "taylor swift songs",
    "taylor swift opalite"
  ]
}
```

---

### C. Audio Stream Resolution
#### `GET /resolve`
Resolves track name and artist into high-fidelity streaming audio identifiers.
- **Query Params:**
  - `track`: Track title (e.g. `Apna Bana Le`)
  - `artist`: Artist name (e.g. `Arijit Singh`)
  - `country`: Two-letter country code (optional, default `IN` / `US`)
- **Response Structure:**
```json
{
  "src": "YALvuUpY_b0"
}
```
*Note: The returned `src` is the YouTube video/audio identifier, resolved to direct audio streams via our multi-cluster audio engine (`https://yt-url-ecru.vercel.app/getUrl?song=...` / Saavn 320k fallback).*

---

### D. Entities & Deep Metadata
- **Artist:** `GET /artist/{name_or_id}` -> Returns artist bio, image, and `topTracks`.
- **Album:** `GET /album/{id}` -> Returns album metadata and track list.
- **Playlist:** `GET /playlist/{id}` -> Returns curated playlist tracks.
- **Up Next Recommendations:** `GET /upnext/{track_id}` -> Returns related queue tracks.

---

### E. Synced Lyrics
- **Endpoint:** `https://lrclib.net/api/get?track_name={title}&artist_name={artist}&duration={duration}`
- Returns synchronized timestamped lyrics (`syncedLyrics`) and plain lyrics.
