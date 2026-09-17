# ListenFree (`listenfree.in`) - Complete API Catalog & cURL Collection

This document contains a complete inventory of all backend services, Cloudflare Workers, Supabase databases, Appwrite instances, and third-party APIs used by **ListenFree** (`https://listenfree.in/`), along with full `curl` request templates including headers, query parameters, request bodies, and security analysis notes.

---

## Table of Contents
1. [Music & Catalog APIs (JioSaavn Proxy Workers)](#1-music--catalog-apis-jiosaavn-proxy-workers)
2. [Dedicated Lyrics APIs](#2-dedicated-lyrics-apis)
3. [YouTube Stream Resolver API](#3-youtube-stream-resolver-api)
4. [Supabase Instance #1: Listening Rooms & Live Queue](#4-supabase-instance-1-listening-rooms--live-queue)
5. [Supabase Instance #2: Video Previews](#5-supabase-instance-2-video-previews)
6. [Appwrite Backend: Auth, Playlists, Favorites & Feedback](#6-appwrite-backend-auth-playlists-favorites--feedback)
7. [Security & Vulnerability Audit Checklist](#7-security--vulnerability-audit-checklist)

---

## 1. Music & Catalog APIs (JioSaavn Proxy Workers)

ListenFree uses multi-origin redundancy for music streaming and metadata retrieval with automatic fallback across the following cluster:
- Primary 1: `https://backend.listenfree.in/api`
- Primary 2: `https://backend2.listenfree.in/api`
- Worker Failover 1: `https://music-api.albatross0071.workers.dev/api`
- Worker Failover 2: `https://music-api2.albatross0071.workers.dev/api`

---

### 1.1 Global Search (All Categories)
Searches across songs, albums, artists, and playlists simultaneously.

```bash
curl -X GET "https://backend.listenfree.in/api/search?query=Believer" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

*Failover mirror:*
```bash
curl -X GET "https://music-api.albatross0071.workers.dev/api/search?query=Believer" \
  -H "Accept: application/json"
```

---

### 1.2 Entity-Specific Search (Songs, Albums, Artists, Playlists)
Filters search by category with pagination/limit controls.

```bash
# 1. Search Songs
curl -X GET "https://backend.listenfree.in/api/search/songs?query=Shape%20of%20You&limit=15" \
  -H "Accept: application/json"

# 2. Search Albums
curl -X GET "https://backend.listenfree.in/api/search/albums?query=Divide&limit=15" \
  -H "Accept: application/json"

# 3. Search Artists
curl -X GET "https://backend.listenfree.in/api/search/artists?query=Ed%20Sheeran&limit=15" \
  -H "Accept: application/json"

# 4. Search Playlists
curl -X GET "https://backend.listenfree.in/api/search/playlists?query=Top%20Hits&limit=15" \
  -H "Accept: application/json"
```

---

### 1.3 Song Details & High-Quality Audio Stream URLs
Fetches track metadata, artist credits, album art (50x50, 150x150, 500x500), and direct CDN audio links (12kbps, 48kbps, 96kbps, 160kbps, 320kbps).

```bash
curl -X GET "https://backend.listenfree.in/api/songs/3I2v-b8B" \
  -H "Accept: application/json"
```

*Worker fallback:*
```bash
curl -X GET "https://music-api2.albatross0071.workers.dev/api/songs/3I2v-b8B" \
  -H "Accept: application/json"
```

---

### 1.4 Song Suggestions & Algorithmic Recommendations
Fetches related / recommended tracks based on a seed song ID.

```bash
curl -X GET "https://backend.listenfree.in/api/songs/3I2v-b8B/suggestions?id=3I2v-b8B&limit=15" \
  -H "Accept: application/json"
```

---

### 1.5 Album Details & Tracklist
Retrieves album information and full song listing by ID or public link.

```bash
curl -X GET "https://backend.listenfree.in/api/albums?id=23249073&link=&limit=50" \
  -H "Accept: application/json"
```

---

### 1.6 Playlist Details & Tracklist
Fetches curated/editorial playlist details and all contained tracks.

```bash
curl -X GET "https://backend.listenfree.in/api/playlists?id=1134543292&link=&limit=50" \
  -H "Accept: application/json"
```

---

### 1.7 Artist Details & Discography
Retrieves artist biographical metadata, top tracks, and albums.

```bash
curl -X GET "https://backend.listenfree.in/api/artists/459320?page=1" \
  -H "Accept: application/json"
```

---

## 2. Dedicated Lyrics APIs

ListenFree implements a dual lyrics resolution mechanism (Cloudflare Worker + LrcLib).

### 2.1 Custom Cloudflare Worker Lyrics API
```bash
curl -X GET "https://listenfreelyrics.abdulazeezmd060.workers.dev/api/songs/3I2v-b8B/lyrics" \
  -H "Accept: application/json"
```

---

### 2.2 LrcLib Synced / Plain Lyrics API
Used for synchronized timestamped lyrics and fallback text lyrics.

#### Exact Match:
```bash
curl -X GET "https://lrclib.net/api/get?track_name=Believer&artist_name=Imagine%20Dragons&album_name=Evolve&duration=204" \
  -H "Accept: application/json" \
  -H "User-Agent: ListenFree/1.0"
```

#### Search Fallback:
```bash
curl -X GET "https://lrclib.net/api/search?track_name=Believer&artist_name=Imagine%20Dragons" \
  -H "Accept: application/json" \
  -H "User-Agent: ListenFree/1.0"
```

---

## 3. YouTube Stream Resolver API

ListenFree uses a Vercel-hosted serverless function to resolve and scrape YouTube video/audio stream URLs dynamically.

```bash
curl -X GET "https://yt-url-ecru.vercel.app/getUrl?song=Imagine%20Dragons%20Believer" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0"
```

---

## 4. Supabase Instance #1: Listening Rooms & Live Queue

- **Project Host**: `https://xxahwpvlaxszbvyijluv.supabase.co`
- **REST Endpoint**: `https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1`
- **Anon Public JWT**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk`
- **Realtime WebSocket**: `wss://xxahwpvlaxszbvyijluv.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&vsn=1.0.0`

---

### 4.1 Create a Collaborative Room (`space_metadata`)
```bash
curl -X POST "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/space_metadata" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "67ca82ad003dcdb46378_user",
    "space_name": "My Party Room"
  }'
```

---

### 4.2 Get Room Metadata
```bash
curl -X GET "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/space_metadata?id=eq.ROOM_UUID_HERE&select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk"
```

---

### 4.3 Update Room Playback State (Current Song & Position)
```bash
curl -X PATCH "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/space_metadata?id=eq.ROOM_UUID_HERE" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "current_song_id": "3I2v-b8B",
    "playback_state": "{\"status\":\"playing\",\"timestamp\":\"2026-09-02T09:30:00.000Z\",\"position\":45.2,\"leader_id\":\"user_123\"}",
    "start_time": "09:30:00+00"
  }'
```

---

### 4.4 Join Room (Increment Participant Count)
```bash
curl -X PATCH "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/space_metadata?id=eq.ROOM_UUID_HERE" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "no_of_people": 5
  }'
```

---

### 4.5 Add Song to Room Queue (`songs_queue`)
```bash
curl -X POST "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/songs_queue" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "space_id": "ROOM_UUID_HERE",
    "song_id": "3I2v-b8B",
    "song_name": "Believer",
    "artist": "Imagine Dragons",
    "added_by": "Alex",
    "image_url": "https://c.saavncdn.com/...",
    "song_download_url": ["https://aac.saavncdn.com/..."],
    "queue_position": 1,
    "duration_seconds": 204,
    "votes": 0,
    "status": "queued"
  }'
```

---

### 4.6 Fetch Room Song Queue
```bash
curl -X GET "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/songs_queue?space_id=eq.ROOM_UUID_HERE&status=eq.queued&order=queue_position.asc&select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk"
```

---

### 4.7 End Room & Clear Queue (Host Only / Cleanup)
```bash
# 1. Delete Queue
curl -X DELETE "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/songs_queue?space_id=eq.ROOM_UUID_HERE" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk"

# 2. Delete Room Metadata
curl -X DELETE "https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1/space_metadata?id=eq.ROOM_UUID_HERE" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YWh3cHZsYXhzemJ2eWlqbHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MzgxMjksImV4cCI6MjA2NzAxNDEyOX0.0zXR6cISdsFH0T5ugp7kuPvnBcngayt9p_1AFfut7Fk"
```

---

## 5. Supabase Instance #2: Video Previews

- **Project Host**: `https://hkjbosczsvkxvqkvazap.supabase.co`
- **REST Endpoint**: `https://hkjbosczsvkxvqkvazap.supabase.co/rest/v1`
- **Anon Public JWT**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramJvc2N6c3ZreHZxa3ZhemFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExMzUsImV4cCI6MjA4MDI1NzEzNX0.rC575mv-wUV48YLM0mLQMSG3yhuCaJnl1D3ms4pfPSI`

### 5.1 Fetch Video Previews Feed
```bash
curl -X GET "https://hkjbosczsvkxvqkvazap.supabase.co/rest/v1/video-preview-collection?select=*&limit=160" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramJvc2N6c3ZreHZxa3ZhemFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExMzUsImV4cCI6MjA4MDI1NzEzNX0.rC575mv-wUV48YLM0mLQMSG3yhuCaJnl1D3ms4pfPSI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramJvc2N6c3ZreHZxa3ZhemFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExMzUsImV4cCI6MjA4MDI1NzEzNX0.rC575mv-wUV48YLM0mLQMSG3yhuCaJnl1D3ms4pfPSI"
```

---

## 6. Appwrite Backend: Auth, Playlists, Favorites & Feedback

- **API Endpoint**: `https://auth.listenfree.in/v1` (Custom domain proxying `https://cloud.appwrite.io/v1`)
- **Project ID**: `67ca82ad003dcdb46378`
- **Database ID (`yr`)**: `67cd72d000097022dc61`
- **Collection IDs**:
  - Favorites (`sc`): `67d19fc10015148f1a14`
  - Playlists Metadata (`Qs`): `67d7ce7600038fc53d7b`
  - Playlist Songs (`Ja`): `67d7cee9000faadf7c90`
  - User Feedback (`$k`): `6873347200293c25bb59`

---

### 6.1 Authentication Endpoints

#### User Login (Email & Password)
```bash
curl -X POST "https://auth.listenfree.in/v1/account/sessions/email" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }'
```

#### Get Current User Profile
```bash
curl -X GET "https://auth.listenfree.in/v1/account" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT_OR_COOKIE"
```

#### Logout Current Session
```bash
curl -X DELETE "https://auth.listenfree.in/v1/account/sessions/current" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT_OR_COOKIE"
```

---

### 6.2 User Favorites API (`67d19fc10015148f1a14`)

#### Fetch User's Favorite Songs
```bash
curl -G "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d19fc10015148f1a14/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT" \
  --data-urlencode 'queries[]={"method":"equal","attribute":"userId","values":["USER_ID_HERE"]}' \
  --data-urlencode 'queries[]={"method":"limit","values":[150]}'
```

#### Add Song to Favorites
```bash
curl -X POST "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d19fc10015148f1a14/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "unique()",
    "data": {
      "userId": "USER_ID_HERE",
      "songId": "3I2v-b8B"
    }
  }'
```

#### Remove Song from Favorites
```bash
curl -X DELETE "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d19fc10015148f1a14/documents/DOCUMENT_ID_HERE" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT"
```

---

### 6.3 Custom Playlists API (`67d7ce7600038fc53d7b` & `67d7cee9000faadf7c90`)

#### Create a New Playlist
```bash
curl -X POST "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7ce7600038fc53d7b/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "unique()",
    "data": {
      "userId": "USER_ID_HERE",
      "name": "Workout Mix 2026",
      "collaborators": []
    }
  }'
```

#### List User's Playlists (Owned & Collaborating)
```bash
curl -G "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7ce7600038fc53d7b/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT" \
  --data-urlencode 'queries[]={"method":"or","values":[{"method":"equal","attribute":"userId","values":["USER_ID_HERE"]},{"method":"contains","attribute":"collaborators","values":["USER_ID_HERE"]}]}'
```

#### Get Playlist Details
```bash
curl -X GET "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7ce7600038fc53d7b/documents/PLAYLIST_DOC_ID" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT"
```

#### Add Song to Playlist (`Ja`: `67d7cee9000faadf7c90`)
```bash
curl -X POST "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7cee9000faadf7c90/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "unique()",
    "data": {
      "playlistId": "PLAYLIST_DOC_ID",
      "songId": "3I2v-b8B"
    }
  }'
```

#### Fetch Songs in a Playlist (Pagination by Cursor)
```bash
curl -G "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7cee9000faadf7c90/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT" \
  --data-urlencode 'queries[]={"method":"equal","attribute":"playlistId","values":["PLAYLIST_DOC_ID"]}' \
  --data-urlencode 'queries[]={"method":"limit","values":[100]}'
```

#### Remove Song from Playlist
```bash
curl -X DELETE "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7cee9000faadf7c90/documents/ITEM_DOC_ID" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT"
```

#### Delete Playlist
```bash
curl -X DELETE "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/67d7ce7600038fc53d7b/documents/PLAYLIST_DOC_ID" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "X-Appwrite-JWT: YOUR_USER_SESSION_JWT"
```

---

### 6.4 User Feedback API (`6873347200293c25bb59`)

#### Submit User Feedback
```bash
curl -X POST "https://auth.listenfree.in/v1/databases/67cd72d000097022dc61/collections/6873347200293c25bb59/documents" \
  -H "X-Appwrite-Project: 67ca82ad003dcdb46378" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "unique()",
    "data": {
      "userName": "Alex",
      "message": "The app is super fast, please add dark mode accent colors!"
    }
  }'
```

---

## 7. Security & Vulnerability Audit Checklist

As the owner assessing your application's security posture, review the following key areas:

### 7.1 Supabase Row Level Security (RLS)
- [ ] **Table `space_metadata`**: Ensure RLS is active (`ALTER TABLE space_metadata ENABLE ROW LEVEL SECURITY;`). Ensure that `DELETE` and `UPDATE` on a room can only be triggered by the user who created it (`auth.uid() = user_id` or matching authorized token), preventing malicious users with the public `anon` key from terminating other people's live listening sessions.
- [ ] **Table `songs_queue`**: Ensure that queue item deletion and insertions are validated against active room membership.
- [ ] **Table `video-preview-collection`**: Check that only `SELECT` is granted to the `anon` role, and all `INSERT`/`UPDATE`/`DELETE` permissions are revoked for unauthenticated clients.

### 7.2 Appwrite Permissions & Document Security
- [ ] **Favorites Collection (`67d19fc10015148f1a14`)**: Enable Document Level Security. Restrict read/write/delete permissions to `user:[USER_ID]`.
- [ ] **Playlists Collection (`67d7ce7600038fc53d7b`)**: Ensure only `userId` and users listed in `collaborators` can mutate playlists.
- [ ] **Feedback Collection (`6873347200293c25bb59`)**: Verify that `read` permission is **not** set to `Any` (public). Unauthenticated users should only have `create` permission, and read access should be restricted to administrators to prevent information disclosure.

### 7.3 Cloudflare Workers & API Gateways
- [ ] **Origin Restriction (CORS)**: Set `Access-Control-Allow-Origin: https://listenfree.in` on `music-api`, `backend.listenfree.in`, and `listenfreelyrics` to prevent other websites from hotlinking your proxy bandwidth.
- [ ] **Rate Limiting**: Configure Cloudflare Rate Limiting Rules (e.g., 60 requests/min per IP) on all worker endpoints to prevent denial-of-service and upstream 429 quota exhaustion.
- [ ] **Input Sanitization**: Ensure queries passed to `yt-url-ecru.vercel.app` and `music-api` are sanitized against injection or SSRF.
