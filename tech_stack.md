# Technology Stack Specification
## Dual-Engine Music Streaming Mobile Application (ListenFree & Freefy)

**Version:** 1.0.0  
**Target Environment:** iOS, Android & Web  
**Primary Framework:** React Native + Expo (v~57.0.11 / SDK 57)  
**Language:** TypeScript (Strict Mode)  

---

## 1. Core Framework & Runtime

| Technology | Version / Spec | Purpose & Architectural Justification |
|---|---|---|
| **React Native** | `0.76.x` / `0.77.x` | Native cross-platform performance, Hermes JS engine, high-speed rendering. |
| **Expo SDK** | `~57.0.11` / `57.x` | Industry standard ecosystem for universal deployment, native module linking, and zero-config builds. |
| **TypeScript** | `^5.3.x` | End-to-end type safety, unified domain models across dual backends, compile-time error prevention. |

---

## 2. State Management & Persistence

| Library | Version | Role in Architecture |
|---|---|---|
| **Zustand** | `^5.0.x` | Ultra-lightweight, reactive global state store with minimal boilerplate. Unidirectional data flow for audio playback, queue, engine switching, and cache. |
| **Zustand `persist` Middleware** | Built-in | Persists user settings, active engine choice, favorite tracks, and cached search history. |
| **`@react-native-async-storage/async-storage`** | `^2.1.x` | High-throughput asynchronous key-value persistence engine for mobile storage. |

### Store Architecture:
```
+-------------------------------------------------------------------------+
|                              Zustand Stores                             |
|                                                                         |
|  +--------------------+  +--------------------+  +--------------------+ |
|  |  useEngineStore    |  |  usePlayerStore    |  |  useLibraryStore   | |
|  |  - activeEngine    |  |  - soundObject     |  |  - favorites       | |
|  |  - switchEngine()  |  |  - currentTrack    |  |  - playlists       | |
|  |  - theme           |  |  - queue           |  |  - history         | |
|  +--------------------+  |  - position/dur    |  +--------------------+ |
|                          |  - isPlaying       |                         |
|  +--------------------+  |  - bitrate (320k)  |  +--------------------+ |
|  | useListenFreeStore |  |  - lyricsIndex     |  |   useFreefyStore   | |
|  | - failoverCluster  |  +--------------------+  | - channels         | |
|  | - rooms (Supabase) |                          | - liveRadios       | |
|  | - videoPreviews    |                          | - genres           | |
|  +--------------------+                          +--------------------+ |
+-------------------------------------------------------------------------+
```

---

## 3. Audio Playback & Media Engine

| Technology | Purpose & Capabilities |
|---|---|
| **`expo-av`** (`Audio.Sound`) | Hardware-accelerated audio streaming, background audio sessions, position tracking, buffer status, and playback rate modulation. |
| **Multi-Bitrate Stream Selector** | Dynamic stream URL swapping across 12kbps, 48kbps, 96kbps, 160kbps, and 320kbps AAC streams. |
| **Resilient Failover Interceptor** | Transparent retry across 4 redundancy mirrors on network disconnects or 404/403/502 gateway errors. |
| **LrcLib & Worker Synced Lyrics Engine** | Microsecond LRC timestamp parser with dynamic active line computation during track playback. |

---

## 4. UI, Styling & Design System

| Technology | Purpose |
|---|---|
| **Vanilla `StyleSheet` Tokens** | Predictable, zero-runtime-overhead styling conforming to strict modular best practices. |
| **`expo-linear-gradient`** | Rich multi-stop gradients for backgrounds, glowing buttons, player backdrops, and active sliders. |
| **`lucide-react-native` / Vector Icons** | Modern icon set (Play, Pause, Skip, Radio, Sparkles, Sliders, Heart, Globe, Flame, Music, etc.). |
| **`expo-blur` / Glassmorphism** | Frosted glass backdrops for docked mini-players, top header switcher, and lyric drawer overlays. |
| **`expo-status-bar`** | Adaptive light/dark status bar styling synchronized with active engine theme. |
| **`react-native-safe-area-context`** | Edge-to-edge layout management respecting notches, dynamic islands, and home indicators. |

---

## 5. API Integrations & Backend Endpoints

### 5.1 ListenFree API Stack
- **Primary Cluster**: `https://backend.listenfree.in/api` & `https://backend2.listenfree.in/api`
- **Failover Mirrors**: `https://music-api.albatross0071.workers.dev/api` & `https://music-api2.albatross0071.workers.dev/api`
- **Lyrics Providers**: `https://listenfreelyrics.abdulazeezmd060.workers.dev/api` and `https://lrclib.net/api`
- **YouTube Stream Scraper**: `https://yt-url-ecru.vercel.app/getUrl`
- **Supabase Instance #1 (Rooms & Queue)**: `https://xxahwpvlaxszbvyijluv.supabase.co/rest/v1`
- **Supabase Instance #2 (Video Previews)**: `https://hkjbosczsvkxvqkvazap.supabase.co/rest/v1`
- **Appwrite Backend**: `https://auth.listenfree.in/v1` (Project: `67ca82ad003dcdb46378`)

### 5.2 Freefy API Stack
- **Core REST API**: `https://freefy.app/api/v1`
- **Curated Channels**: `/channel/discover`
- **Live Global Radios**: `/live-radios` & Radio-Browser.info directory
- **Playlist Importer**: `/playlists/import` (Spotify & YouTube converter)
- **Artist Backstage**: `/backstage-request`

---

## 6. Build, Linting & Development Toolchain

- **Package Manager**: NPM (`npm`)
- **Bundler**: Metro Bundler (Expo CLI)
- **Linting & Type Checking**: TypeScript Compiler (`tsc --noEmit`), ESLint with React Hooks rule enforcement.
