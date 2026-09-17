# Product Requirements Document (PRD)
## Dual-Engine Music Streaming Mobile Application (ListenFree & Freefy)

**Author:** Antigravity Engineering Team  
**Version:** 1.0.0  
**Target Platform:** Mobile (iOS, Android) & Web via React Native + Expo  
**State Architecture:** Zustand Store System  
**Last Updated:** September 2026  

---

## 1. Executive Summary & Vision

The **Dual-Engine Music Streaming Application** is a next-generation, high-performance mobile audio streaming platform that uniquely bridges two distinct music architectures into a single, unified client:
1. **ListenFree Engine**: High-fidelity decentralized streaming backed by multi-mirror JioSaavn Cloudflare Worker proxies (up to 320kbps AAC), real-time LrcLib synchronized karaoke lyrics, Supabase-powered collaborative live listening rooms with shared real-time playback queues, video previews, and Appwrite cloud user libraries.
2. **Freefy Engine**: Curated editorial streaming powered by the Freefy BeMusic REST API, featuring algorithmic discovery channels, global live radio station browsing (via Radio-Browser.info across countries and genres), external Spotify/YouTube playlist importers, artist backstage claim workflows, and social comments.

The application features an interactive **Engine Mode Switcher** at the top bar, allowing users to switch between engines instantaneously. Each engine mode delivers a distinct UI theme, distinct content discovery feeds, and specialized feature sets while sharing a unified, robust playback engine.

---

## 2. Product Goals & Key Metrics

### 2.1 Core Objectives
- **Zero-Friction Engine Switching**: Instantaneous toggling between ListenFree and Freefy backends without restarting the app or interrupting active playback.
- **Audiophile-Grade Streaming**: Seamless multi-bitrate audio playback (12 kbps, 48 kbps, 96 kbps, 160 kbps, 320 kbps AAC) with automatic proxy failover across 4 redundancy mirrors.
- **Social & Collaborative Listening**: Real-time multi-user listening spaces with synchronized playback timestamps and voting-enabled queue management.
- **Aesthetic Excellence**: Distinctive visual identities for both engines (ListenFree Cyber-Teal vs Freefy Onyx-Emerald) built with glassmorphism, animated gradients, micro-interactions, and karaoke lyric synchronization.

### 2.2 Key Performance Indicators (KPIs)
- **Time to First Audio Frame (TTFA)**: < 600ms on 4G/5G connections.
- **Stream Failover Recovery**: < 250ms transparent retry on mirror timeout.
- **Synced Lyrics Latency**: < 50ms timestamp synchronization with audio playback.
- **App Startup & Store Hydration**: < 400ms cold boot time.

---

## 3. User Personas & Core Journeys

### Persona 1: "The Audiophile & Social Streamer" (Targeting ListenFree Mode)
- **Needs**: High-bitrate 320kbps audio, instant synchronized lyrics to sing along, and the ability to host or join live listening rooms with friends.
- **Journey**: Opens app in ListenFree mode -> Explores trending charts -> Plays track in 320kbps -> Opens full-screen synced lyrics -> Creates a Supabase party room -> Invites peers to queue tracks collaboratively.

### Persona 2: "The Global Radio & Curation Explorer" (Targeting Freefy Mode)
- **Needs**: Global live radio stations from around the world, curated editorial genre channels, and the ability to import Spotify playlists.
- **Journey**: Toggles top switch to Freefy -> Browses live radio stations by country (e.g. US, UK, France) or genre (Jazz, Electronic) -> Imports a Spotify playlist via URL -> Listens to curated Discover channels.

---

## 4. Detailed Feature Specifications

### 4.1 Top Navigation & Mode Switcher
- **Interactive Switcher Bar**: Positioned prominently in the top header.
- **Visual State**:
  - `ListenFree Mode`: Cyber-Teal `#00F2FE` gradient glow, "🎵 ListenFree" badge, subtitle "High-Res & Rooms".
  - `Freefy Mode`: Onyx-Emerald `#10B981` gradient glow, "⚡ Freefy" badge, subtitle "Curated & Live Radio".
- **Dynamic Transition**: Smooth animated slider movement; transforms the active theme colors, home feeds, explore screens, and search routing instantaneously.
- **State Persistence**: Saves the last active engine in local storage for subsequent launches.

---

### 4.2 ListenFree Engine Specifications

#### A. Music Search & Catalog
- **Multi-Origin Proxy Cluster**:
  1. Primary 1: `https://backend.listenfree.in/api`
  2. Primary 2: `https://backend2.listenfree.in/api`
  3. Worker Failover 1: `https://music-api.albatross0071.workers.dev/api`
  4. Worker Failover 2: `https://music-api2.albatross0071.workers.dev/api`
- **Global & Entity Search**: Unified query endpoint + granular search for Songs, Albums, Artists, and Playlists.
- **Song Metadata**: Track name, artist credits, album name, year, duration, 3-tier album artwork (50x50, 150x150, 500x500), and download URLs (12kbps to 320kbps).
- **Algorithmic Suggestions**: Related track recommendations based on seed song IDs (`/api/songs/{id}/suggestions`).

#### B. Dedicated Synced Lyrics
- **Cloudflare Worker Lyrics**: `https://listenfreelyrics.abdulazeezmd060.workers.dev/api/songs/{id}/lyrics`
- **LrcLib Fallback Engine**: `https://lrclib.net/api/get` (Exact metadata match) and `https://lrclib.net/api/search` (Fuzzy title + artist search).
- **Format Support**: Synced timestamped LRC strings parsed into structured line objects (`[{ timeMs: 12400, text: "..." }]`) with real-time active line tracking.

#### C. YouTube Stream Resolver
- **Endpoint**: `https://yt-url-ecru.vercel.app/getUrl?song={query}`
- **Usage**: Dynamic fallback when upstream CDN links require alternative stream resolution.

#### D. Collaborative Listening Rooms (Supabase Instance #1)
- **Supabase Host**: `https://xxahwpvlaxszbvyijluv.supabase.co`
- **Room Metadata (`space_metadata`)**: Create, join, update playback position (`current_song_id`, `playback_state`, `start_time`), participant counters (`no_of_people`), and room deletion.
- **Live Song Queue (`songs_queue`)**: Add tracks, fetch active queue ordered by `queue_position`, upvote/downvote tracks, and dequeue on song completion.

#### E. Video Previews Feed (Supabase Instance #2)
- **Supabase Host**: `https://hkjbosczsvkxvqkvazap.supabase.co`
- **Table**: `video-preview-collection` for short video clips, dynamic visual previews, and album video snippets.

#### F. User Library & Playlists (Appwrite)
- **Host**: `https://auth.listenfree.in/v1` (Project ID: `67ca82ad003dcdb46378`, Database ID: `67cd72d000097022dc61`)
- **Collections**:
  - Favorites (`67d19fc10015148f1a14`): User liked songs.
  - Playlists Metadata (`67d7ce7600038fc53d7b`): Custom playlist documents.
  - Playlist Songs (`67d7cee9000faadf7c90`): Song associations with cursor pagination.
  - User Feedback (`6873347200293c25bb59`): In-app feedback submission.

---

### 4.3 Freefy Engine Specifications

#### A. Freefy REST API Integration
- **Base URL**: `https://freefy.app/api/v1`
- **Authentication**: Bearer token authentication and anonymous public endpoints.

#### B. Curated Homepage Channels
- **Endpoint**: `/api/v1/channel/discover`
- **Features**: Editorial carousels, New Releases, Featured Mixes, Artist Spotlights, and Genre Tiles.

#### C. Live Global Radio Browser
- **Live Radios**: Browse stations with sorting by votes, popularity, and name (`/api/v1/live-radios`).
- **Country & Genre Filtering**: Search radio stations by country code (US, UK, IN, BR, etc.) and tag (Pop, Rock, Electronic, Jazz, Classical, Hip-Hop).
- **Click & Play Analytics**: Event tracking via `/api/v1/live-radios/click/{stationUuid}`.

#### D. External Playlist Importer
- **Endpoint**: `/api/v1/playlists/import`
- **Capabilities**: Input a public Spotify or YouTube playlist URL -> Serverless conversion into Freefy playable playlist.

#### E. Artist Backstage & Community
- **Backstage Claims**: Artists can submit profile verification requests (`/api/v1/backstage-request`).
- **Track Comments & Reposts**: View track comments (`/api/v1/tracks/{id}/comments`) and toggle reposts (`/api/v1/reposts/toggle`).

---

### 4.4 Unified Audio Playback System (`expo-av`)

1. **Audio Engine Capabilities**:
   - Background audio playback and lockscreen controls integration.
   - Gapless track transitions, queue management, shuffle, and repeat modes (`off`, `all`, `one`).
   - Bitrate switching on-the-fly (12kbps to 320kbps) with position preservation.
   - Resilient stream failover: Auto-switches to backup stream URLs if a network chunk drops.
2. **Mini-Player Component**:
   - Docked above bottom navigation with smooth progress bar, artwork thumbnail, song title, artist, play/pause, skip, and tap-to-expand animation.
3. **Full-Screen Player Modal**:
   - Glassmorphic animated background matching track artwork accent colors.
   - Rotating vinyl/artwork effect, high-precision scrubber bar, volume controls, bitrate badge.
   - Synchronized karaoke lyrics drawer with tap-to-seek functionality.
   - Up-next queue drawer with reordering and clear queue options.

---

## 5. User Interface & Theming Specifications

| Dimension | ListenFree Mode | Freefy Mode |
|---|---|---|
| **Primary Accent** | Neon Cyan (`#00F2FE`) | Emerald Mint (`#10B981`) |
| **Secondary Accent**| Electric Sky (`#4FACFE`) | Vibrant Jade (`#059669`) / Amber (`#F59E0B`) |
| **Background** | Deep Cyber Navy (`#080E1E`) | Obsidian Glass (`#0B0F17`) |
| **Card / Surface** | Cyber Slate (`#121C33`) | Charcoal Onyx (`#161E2E`) |
| **Border / Stroke** | Neon Frost (`rgba(0,242,254,0.18)`) | Emerald Frost (`rgba(16,185,129,0.18)`) |
| **Visual Character**| High-tech, waveform-driven, futuristic | Editorial, sleek, album-centric, Spotify-grade |

---

## 6. Non-Functional Requirements

- **Cross-Platform**: Operates identically on Android, iOS, and Web.
- **Offline Resilience**: Offline caching of favorites, library metadata, and recently played tracks via `@react-native-async-storage/async-storage`.
- **Error Boundaries**: Graceful fallback UI with retry buttons when network requests or streams fail.
- **Accessibility**: High-contrast text compliance (WCAG 2.1 AA), descriptive accessibility labels for screen readers.
