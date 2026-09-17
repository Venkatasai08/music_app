# Freefy (`freefy.app`) - Complete API Catalog & cURL Collection

This document provides a comprehensive inventory of all backend API endpoints, authentication mechanisms, media resolvers, and internal services powering **Freefy** (`https://freefy.app/`), along with full `curl` request templates and security audit guidelines.

---

## Table of Contents
1. [Architecture & Authentication Overview](#1-architecture--authentication-overview)
2. [Authentication Endpoints (`/api/v1/auth`)](#2-authentication-endpoints-apiv1auth)
3. [Unified Search API (`/api/v1/search`)](#3-unified-search-api-apiv1search)
4. [Live Radios API (`/api/v1/live-radios`)](#4-live-radios-api-apiv1live-radios)
5. [Playlists API (`/api/v1/playlists`)](#5-playlists-api-apiv1playlists)
6. [Tracks & Playback API (`/api/v1/tracks`)](#6-tracks--playback-api-apiv1tracks)
7. [Artists API (`/api/v1/artists`)](#7-artists-api-apiv1artists)
8. [Albums API (`/api/v1/albums`)](#8-albums-api-apiv1albums)
9. [Radio Recommendations API (`/api/v1/radio`)](#9-radio-recommendations-api-apiv1radio)
10. [Tags & Genres API (`/api/v1/tags`, `/api/v1/genres`)](#10-tags--genres-api-apiv1tags-apiv1genres)
11. [User Profile, Library & Social APIs (`/api/v1/users`)](#11-user-profile-library--social-apis-apiv1users)
12. [Reposts API (`/api/v1/reposts`)](#12-reposts-api-apiv1reposts)
13. [Artist Backstage Management (`/api/v1/backstage-request`)](#13-artist-backstage-management-apiv1backstage-request)
14. [Curated Channels & Internal Services](#14-curated-channels--internal-services)
15. [Security & Vulnerability Audit Checklist](#15-security--vulnerability-audit-checklist)

---

## 1. Architecture & Authenticataion Overview

- **Base URL**: `https://freefy.app/api/v1`
- **Backend Architecture**: Laravel (BeMusic / Vebto architecture) + React (Vite / TanStack)
- **Authentication Scheme**:
  - **API Bearer Token**: `Authorization: Bearer <API_ACCESS_TOKEN>`
  - **Browser Session & CSRF**: Cookie `freefy_session` with `X-XSRF-TOKEN: <XSRF-TOKEN-VALUE>`
  - **AJAX Header**: `X-Requested-With: XMLHttpRequest`

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### 2.1 User Registration
Registers a new user account and returns the user object and initial API access token.

```bash
curl -X POST "https://freefy.app/api/v1/auth/register" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "name": "Alex",
    "token_name": "Web Client"
  }'
```

---

### 2.2 User Login & Token Retrieval
Authenticates existing credentials and returns a Bearer access token.

```bash
curl -X POST "https://freefy.app/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "token_name": "curl_client"
  }'
```

---

## 3. Unified Search API (`/api/v1/search`)

Searches across YouTube videos, Spotify metadata, live radio stations, albums, artists, and playlists.

```bash
curl -G "https://freefy.app/api/v1/search" \
  -H "Accept: application/json" \
  --data-urlencode "query=Coldplay" \
  --data-urlencode "types=tracks,albums,artists,playlists,live_radios" \
  --data-urlencode "limit=20"
```

---

## 4. Live Radios API (`/api/v1/live-radios`)

Powered by the Radio-Browser.info integration for global live streaming radio stations.

### 4.1 Browse Live Radio Stations
```bash
curl -G "https://freefy.app/api/v1/live-radios" \
  -H "Accept: application/json" \
  --data-urlencode "page=1" \
  --data-urlencode "perPage=25" \
  --data-urlencode "order=votes:desc"
```

### 4.2 Search Radio Stations
```bash
curl -G "https://freefy.app/api/v1/live-radios/search" \
  -H "Accept: application/json" \
  --data-urlencode "query=Jazz" \
  --data-urlencode "limit=20"
```

### 4.3 Get Stations by Country
```bash
curl -X GET "https://freefy.app/api/v1/live-radios/country/US?page=1&perPage=20" \
  -H "Accept: application/json"
```

### 4.4 Get Stations by Tag / Genre
```bash
curl -X GET "https://freefy.app/api/v1/live-radios/tag/electronic?page=1&perPage=20" \
  -H "Accept: application/json"
```

### 4.5 List Available Countries
```bash
curl -X GET "https://freefy.app/api/v1/live-radios/countries" \
  -H "Accept: application/json"
```

### 4.6 Log Radio Station Play / Click Event
```bash
curl -X POST "https://freefy.app/api/v1/live-radios/click/96be8495-0601-11e8-ae97-52543be04c81" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json"
```

---

## 5. Playlists API (`/api/v1/playlists`)

### 5.1 Get Playlist Details
```bash
curl -X GET "https://freefy.app/api/v1/playlists/123?loader=playlistPage" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5.2 Create Playlist
```bash
curl -X POST "https://freefy.app/api/v1/playlists" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Vibes 2026",
    "description": "My curated summer playlist",
    "public": true,
    "collaborative": false
  }'
```

### 5.3 Update Playlist Details
```bash
curl -X PUT "https://freefy.app/api/v1/playlists/123" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Summer Vibes",
    "description": "New description",
    "public": true
  }'
```

### 5.4 Delete Playlist
```bash
curl -X DELETE "https://freefy.app/api/v1/playlists/123" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5.5 Fetch Playlist Tracks
```bash
curl -G "https://freefy.app/api/v1/playlists/123/tracks" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --data-urlencode "page=1" \
  --data-urlencode "perPage=50"
```

### 5.6 Add Tracks to Playlist
```bash
curl -X POST "https://freefy.app/api/v1/playlists/123/tracks/add" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tracks": [
      {
        "id": 456,
        "name": "Viva La Vida"
      }
    ]
  }'
```

### 5.7 Remove Tracks from Playlist
```bash
curl -X POST "https://freefy.app/api/v1/playlists/123/tracks/remove" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trackIds": [456]
  }'
```

### 5.8 Follow / Unfollow Playlist
```bash
# Follow
curl -X POST "https://freefy.app/api/v1/playlists/123/follow" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Unfollow
curl -X POST "https://freefy.app/api/v1/playlists/123/unfollow" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5.9 Import External Playlist (Spotify / YouTube)
```bash
# JSON Body:
curl -X POST "https://freefy.app/api/v1/playlists/import" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
  }'

# Or Multipart / Form-Data (Client Importer):
curl -X POST "https://freefy.app/api/v1/playlists/import" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "spotifyId=37i9dQZF1DXcBWIGoYBM5M" \
  -F "userEmail=user@example.com"
```

---

## 6. Tracks & Playback API (`/api/v1/tracks`)

### 6.1 Get Track Details
```bash
curl -X GET "https://freefy.app/api/v1/tracks/456?loader=trackPage" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6.2 Get Track Lyrics
```bash
curl -X GET "https://freefy.app/api/v1/tracks/456/lyrics" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6.3 List Track Comments
```bash
curl -G "https://freefy.app/api/v1/tracks/456/comments" \
  -H "Accept: application/json" \
  --data-urlencode "page=1" \
  --data-urlencode "perPage=20"
```

### 6.4 Log Track Play Event
Used by the audio player to register stream count and analytics.

```bash
curl -X POST "https://freefy.app/api/v1/tracks/plays/456/log" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "web-player"
  }'
```

---

## 7. Artists API (`/api/v1/artists`)

### 7.1 Get Artist Overview
```bash
curl -X GET "https://freefy.app/api/v1/artists/789?loader=artistPage" \
  -H "Accept: application/json"
```

### 7.2 Get Artist Tracks
```bash
curl -G "https://freefy.app/api/v1/artists/789/tracks" \
  -H "Accept: application/json" \
  --data-urlencode "page=1" \
  --data-urlencode "perPage=20"
```

### 7.3 Get Artist Albums
```bash
curl -G "https://freefy.app/api/v1/artists/789/albums" \
  -H "Accept: application/json" \
  --data-urlencode "page=1" \
  --data-urlencode "perPage=20"
```

### 7.4 Get Artist Followers
```bash
curl -X GET "https://freefy.app/api/v1/artists/789/followers" \
  -H "Accept: application/json"
```

---

## 8. Albums API (`/api/v1/albums`)

### 8.1 Get Album Information & Tracklist
```bash
curl -X GET "https://freefy.app/api/v1/albums/101?loader=albumPage" \
  -H "Accept: application/json"
```

---

## 9. Radio Recommendations API (`/api/v1/radio`)

Returns dynamic radio recommendation queues based on a seed artist or track.

```bash
# 1. Radio based on Artist
curl -X GET "https://freefy.app/api/v1/radio/artist/789" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 2. Radio based on Track
curl -X GET "https://freefy.app/api/v1/radio/track/456" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 10. Tags & Genres API (`/api/v1/tags`, `/api/v1/genres`)

```bash
# List all genres
curl -X GET "https://freefy.app/api/v1/genres" \
  -H "Accept: application/json"

# List tracks by tag
curl -X GET "https://freefy.app/api/v1/tags/pop/tracks?page=1&perPage=25" \
  -H "Accept: application/json"

# List albums by tag
curl -X GET "https://freefy.app/api/v1/tags/rock/albums?page=1&perPage=25" \
  -H "Accept: application/json"
```

---

## 11. User Profile, Library & Social APIs (`/api/v1/users`)

### 11.1 Get Public User Profile
```bash
curl -X GET "https://freefy.app/api/v1/users/1?loader=userProfilePage" \
  -H "Accept: application/json"
```

### 11.2 Add Items to User Library (Tracks, Albums, Artists)
```bash
curl -X POST "https://freefy.app/api/v1/users/me/add-to-library" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": 456,
        "type": "track"
      },
      {
        "id": 101,
        "type": "album"
      },
      {
        "id": 789,
        "type": "artist"
      }
    ]
  }'
```

### 11.3 Remove Items from User Library
```bash
curl -X POST "https://freefy.app/api/v1/users/me/remove-from-library" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": 456,
        "type": "track"
      }
    ]
  }'
```

### 11.4 Get User Liked Media
```bash
# Liked Tracks
curl -X GET "https://freefy.app/api/v1/users/me/liked-tracks?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Liked Albums
curl -X GET "https://freefy.app/api/v1/users/me/liked-albums?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Liked Artists
curl -X GET "https://freefy.app/api/v1/users/me/liked-artists?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# User's Created / Followed Playlists
curl -X GET "https://freefy.app/api/v1/users/me/playlists?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 11.5 Social Follows
```bash
# Follow User
curl -X POST "https://freefy.app/api/v1/users/2/follow" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Unfollow User
curl -X POST "https://freefy.app/api/v1/users/2/unfollow" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get Current User's Followers
curl -X GET "https://freefy.app/api/v1/users/me/followers" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get Users Followed by Current User
curl -X GET "https://freefy.app/api/v1/users/me/followed-users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 12. Reposts API (`/api/v1/reposts`)

```bash
# Toggle Repost for a Track
curl -X POST "https://freefy.app/api/v1/reposts/toggle" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": 456
  }'

# Get User's Reposts
curl -X GET "https://freefy.app/api/v1/users/1/reposts?page=1&perPage=25" \
  -H "Accept: application/json"
```

---

## 13. Artist Backstage Management (`/api/v1/backstage-request`)

```bash
# Submit Backstage Request to Claim Artist Profile
curl -X POST "https://freefy.app/api/v1/backstage-request" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "artist_name": "My Band Name",
    "data": {
      "social_links": ["https://instagram.com/myband"],
      "message": "Official verification request"
    }
  }'

# Admin Only: Approve Request
curl -X POST "https://freefy.app/api/v1/backstage-request/1/approve" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Admin Only: Deny Request
curl -X POST "https://freefy.app/api/v1/backstage-request/1/deny" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 14. Curated Channels & Internal Services

### 14.1 Curated Homepage Channels
```bash
curl -X GET "https://freefy.app/api/v1/channel/discover" \
  -H "Accept: application/json"
```

### 14.2 Resumable File Uploads (TUS Protocol)
Used for audio file uploads and artist media.

```bash
curl -X POST "https://freefy.app/api/v1/tus/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Upload-Length: 5242880" \
  -H "Tus-Resumable: 1.0.0" \
  -H "Upload-Metadata: name bXlfc29uZw==,clientExtension bXAz"
```

### 14.3 S3 Multipart Chunk URL Signer
```bash
curl -X POST "https://freefy.app/api/v1/s3/multipart/batch-sign-part-urls" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "AWS_OR_S3_UPLOAD_ID",
    "key": "tracks/audio_file.mp3",
    "partNumbers": [1, 2, 3]
  }'
```

### 14.4 WebSocket / Realtime Broadcasting Auth
```bash
curl -X POST "https://freefy.app/secure/broadcasting/auth" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "socket_id": "12345.67890",
    "channel_name": "private-user.1"
  }'
```

### 14.5 Admin Error Log Download
```bash
curl -X GET "https://freefy.app/api/v1/logs/error/download-latest" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 15. Security & Vulnerability Audit Checklist

As the platform owner, ensure the following controls are validated across your infrastructure:

### 15.1 Authorization & IDOR (Insecure Direct Object Reference) Controls
- [ ] **Playlist Mutation & Deletion:** Ensure `/api/v1/playlists/{id}` (PUT and DELETE) explicitly checks `playlist.user_id === auth()->id()`. A malicious user should not be able to modify or delete playlists belonging to another user.
- [ ] **Playlist Track Removal:** Confirm `/api/v1/playlists/{id}/tracks/remove` verifies ownership or collaborator permissions before executing queries.
- [ ] **Backstage Approval Endpoints:** Confirm `/api/v1/backstage-request/{id}/approve` and `deny` are wrapped in admin-only gate middleware (`can:admin` or `auth:sanctum,role:admin`).

### 15.2 Server-Side Request Forgery (SSRF) Prevention
- [ ] **Playlist Importer (`/api/v1/playlists/import`):** Validate incoming URLs strictly against a whitelist of valid hosts (`open.spotify.com`, `spotify.link`, `www.youtube.com`, `youtu.be`). Disallow localhost, `127.0.0.1`, cloud metadata endpoints (`169.254.169.254`), and private internal subnets (`10.0.0.0/8`, `192.168.0.0/16`).

### 15.3 Rate Limiting & Abuse Prevention
- [ ] **Play Count Manipulation:** Rate limit `/api/v1/tracks/plays/{track}/log` and `/api/v1/live-radios/click/{stationUuid}` to prevent bot-driven play count inflation.
- [ ] **Search & Radio Browsing:** Ensure rate limiting (e.g. 60 requests/min) is enabled on `/api/v1/search` and `/api/v1/radio/{type}/{id}` to avoid heavy downstream scraping pressure.

### 15.4 Sensitive Log & Spec Hardening
- [ ] **Error Log Endpoint:** Verify that `/api/v1/logs/error/download-latest` returns `401/403` for non-admin accounts and unauthenticated requests.
- [ ] **Swagger Specification:** If `/swagger.yaml` and `/api-docs` are meant for internal development only, restrict access or require admin authentication.
