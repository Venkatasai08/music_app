# Project Folder Structure & Architecture Guide
## Dual-Engine Music Streaming Mobile Application (ListenFree & Freefy)

**Version:** 1.0.0  
**Pattern:** Feature-Based Clean Architecture & Modular Component Division  
**Framework:** React Native + Expo (SDK 57) with TypeScript & Zustand  

---

## 1. Directory Tree Overview

```
c:/D Drive/music_app/
├── freefy_apis.md                 # Original Freefy API Documentation & cURL Collection
├── listen_free_apis.md            # Original ListenFree API Documentation & Architecture
├── prd.md                         # Product Requirements Document
├── tech_stack.md                  # Comprehensive Technology Stack Specification
├── folder_structure.md            # Folder Structure & Component Division Guide (This File)
├── package.json                   # Dependencies, Scripts, and Expo Engine Version
├── tsconfig.json                  # TypeScript Compiler Configuration & Path Aliases
├── app.json                       # Expo Application Configuration & Permissions
├── App.tsx                        # Root Application Component, Theme Provider & Navigation
│
└── src/
    ├── api/                       # API Services, Network Gateways & Multi-Origin Failover
    │   ├── apiClient.ts           # Unified Axios/Fetch Client with Timeout & Retry Interceptors
    │   ├── listenFreeApi.ts       # ListenFree Multi-Mirror Proxy, Lyrics, Supabase & Appwrite
    │   └── freefyApi.ts           # Freefy REST Endpoints, Radio-Browser & Playlist Importer
    │
    ├── components/                # Modular, Reusable UI Components
    │   ├── cards/                 # Visual Media Cards & Feed Tiles
    │   │   ├── TrackCard.tsx      # High-Fidelity Track Row / Card with Artwork & Bitrate Badge
    │   │   ├── AlbumCard.tsx      # Square Album Tile with Release Year & Artist Info
    │   │   ├── ArtistCard.tsx     # Circular Avatar Artist Card with Follower Count
    │   │   ├── RadioCard.tsx      # Live Radio Station Card with Live Badge & Country Tag
    │   │   ├── RoomCard.tsx       # Live Supabase Listening Room Card with Participant Pill
    │   │   └── VideoPreviewCard.tsx # Vertical / Horizontal Video Snippet Preview Card
    │   │
    │   ├── common/                # Shared Atomic & Composite Elements
    │   │   ├── Header.tsx         # Top Navigation Header with Search & Mode Switcher
    │   │   ├── ModeSwitcher.tsx   # Interactive Dual-Engine Pill Switcher with Glowing Accent
    │   │   ├── GlassCard.tsx      # Glassmorphism Card Container with Blur & Border Glow
    │   │   ├── Button.tsx         # Primary, Secondary & Ghost Action Buttons
    │   │   ├── Badge.tsx          # Bitrate, Live Status, and Genre Badges
    │   │   └── Skeleton.tsx       # Content Loading Skeletons for Feeds
    │   │
    │   ├── modals/                # Floating Sheets & Overlay Dialogs
    │   │   ├── CreateRoomModal.tsx    # Supabase Collaborative Room Creator Dialog
    │   │   ├── ImportPlaylistModal.tsx # Spotify/YouTube Playlist Importer Dialog
    │   │   └── QualitySelectorModal.tsx # Stream Bitrate Switcher (12k to 320k)
    │   │
    │   └── player/                # Audio Playback & Media Interaction Components
    │       ├── MiniPlayer.tsx     # Floating Docked Mini-Player with Live Progress Bar
    │       ├── FullPlayerModal.tsx# Fullscreen Player with Artwork Vinyl, Scrub Bar & Controls
    │       ├── SyncedLyricsView.tsx# Auto-Scrolling Real-Time Karaoke Synced Lyrics
    │       └── QueueDrawer.tsx    # Up-Next Queue Manager Sheet
    │
    ├── hooks/                     # Custom React Lifecycle & Utility Hooks
    │   ├── useAudioPlayer.ts      # Hook wrapping expo-av Player Actions & Subscriptions
    │   ├── useSyncedLyrics.ts     # Synced Lyric Parser & Active Line Calculator
    │   └── useDebounce.ts         # Query Debouncer for Instant Search Inputs
    │
    ├── navigation/                # Navigation State & Tab Bar Layouts
    │   ├── BottomTabBar.tsx       # Glassmorphism Floating Bottom Navigation Bar
    │   └── navigationTypes.ts     # Screen Param List & Route Definitions
    │
    ├── screens/                   # Primary Application Screens
    │   ├── HomeScreen.tsx         # Mode-Adaptive Home Feed (ListenFree Trends vs Freefy Channels)
    │   ├── SearchScreen.tsx       # Unified Multi-Category Instant Search
    │   ├── ExploreScreen.tsx      # ListenFree Live Rooms vs Freefy Global Live Radios
    │   ├── LibraryScreen.tsx      # Liked Songs, User Playlists & Playlist Importer
    │   └── DetailScreen.tsx       # Generic Deep-Dive Detail Screen (Album, Playlist, Artist)
    │
    ├── stores/                    # Zustand Global State Management Layer
    │   ├── useEngineStore.ts      # Active Engine Switcher (`listen_free` vs `freefy`)
    │   ├── usePlayerStore.ts      # Central Audio Playback, Track Queue & Bitrate State
    │   ├── useListenFreeStore.ts  # ListenFree Cache, Rooms & Video Previews
    │   ├── useFreefyStore.ts      # Freefy Curated Channels & Live Radios
    │   └── useLibraryStore.ts     # Persistent User Library, Favorites & Custom Playlists
    │
    ├── theme/                     # Design Tokens & Dynamic Theming System
    │   ├── colors.ts              # Cyber-Teal (ListenFree) & Onyx-Emerald (Freefy) Palettes
    │   ├── typography.ts          # Font Sizes, Weights, Line Heights & Letter Spacings
    │   ├── layout.ts              # Spacing Scales, Border Radii, Blur Tokens & Shadows
    │   └── index.ts               # Unified Theme Hook and Theme Provider Exports
    │
    ├── types/                     # TypeScript Type Definitions & Domain Models
    │   ├── music.ts               # Universal Track, Album, Artist, Playlist & Lyric Models
    │   ├── engine.ts              # Engine Types, Filter Enums & API Result Contracts
    │   └── supabase.ts            # Supabase Space Metadata & Song Queue Schemas
    │
    └── utils/                     # Pure Helper Utilities & Math / Formatting Functions
        ├── audioUtils.ts          # Stream URL Formatter, Bitrate Formatter & Time Stringifier
        ├── lyricParser.ts         # LRC Timestamp to Microsecond Parser & Matcher
        └── storage.ts             # AsyncStorage Wrapper with Safe JSON Parsing
```

---

## 2. Component Divisions & Architectural Responsibilities

### 2.1 API Layer (`src/api/`)
- **Separation of Concerns**: Each backend has its own dedicated gateway file.
- **Failover Logic**: `listenFreeApi.ts` implements automatic fallbacks to alternate Cloudflare Worker instances when the primary endpoint experiences latency or downtime.
- **Data Normalization**: Translates raw external JSON responses into clean, strongly typed universal domain models (`Track`, `Album`, `Artist`).

### 2.2 Zustand Store Layer (`src/stores/`)
- **Single Source of Truth**: State is segregated by domain (`useEngineStore`, `usePlayerStore`, `useListenFreeStore`, `useFreefyStore`, `useLibraryStore`).
- **Reactive Decoupling**: Screens do not directly interact with raw API clients; they trigger store actions, ensuring caching, error states, and UI updates are synchronized.
- **Persistence**: High-value state (active engine, user favorites, recent history) is automatically persisted to AsyncStorage.

### 2.3 UI & Design System (`src/theme/` & `src/components/common/`)
- **Dynamic Theming**: Switching the engine immediately recalibrates all color tokens, gradient stops, borders, and badge styles across every mounted component without requiring an app reload.
- **Atomic Modularity**: Components are broken down into single-responsibility units (`TrackCard`, `Badge`, `ModeSwitcher`, `GlassCard`).

### 2.4 Audio & Media Engine (`src/stores/usePlayerStore.ts` & `src/components/player/`)
- **Unified Player Abstraction**: Both ListenFree high-res tracks and Freefy live radio streams play through the exact same `expo-av` Sound instance.
- **Synchronized Lyrics**: Parses `.lrc` strings and computes active lyric lines at 60 FPS based on audio playback milliseconds.
