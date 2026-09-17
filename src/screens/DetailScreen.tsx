import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Disc3,
} from 'lucide-react-native';
import { DetailScreenParams } from '../types/engine';
import { Track } from '../types/music';
import { SupabaseQueueSong } from '../types/supabase';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useEngineStore } from '../stores/useEngineStore';
import { listenFreeApi } from '../api/listenFreeApi';
import { freefyApi } from '../api/freefyApi';
import { tuneFreeApi } from '../api/tuneFreeApi';
import { useAppTheme, getEngineTheme } from '../theme';
import { TrackCard } from '../components/cards/TrackCard';
import { Badge } from '../components/common/Badge';
import { extractString, sanitizeImageUrl } from '../utils/audioUtils';
import { artworkService } from '../services/artworkService';

const { width } = Dimensions.get('window');

interface DetailScreenProps {
  params: DetailScreenParams;
  onBack: () => void;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({ params, onBack }) => {
  const insets = useSafeAreaInsets();
  const { type, id, title: rawTitle, subtitle: rawSubtitle, image, itemData } = params;
  const title = extractString(rawTitle, 'Details');
  const subtitle = extractString(rawSubtitle, '');
  const { colors, radius, isListenFree, isFreefy, isTuneFree } = useAppTheme();
  const activeEngine = useEngineStore((s) => s.activeEngine);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const itemEngine =
    itemData?.sourceEngine ||
    (isListenFree ? 'listen_free' : isTuneFree ? 'tune_free' : 'freefy');
  const itemEngineTheme = getEngineTheme(itemEngine);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [roomQueue, setRoomQueue] = useState<SupabaseQueueSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [id, type, activeEngine]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      // 1. If itemData already contains an array of tracks, sanitize and deduplicate them immediately
      if (itemData?.tracks && Array.isArray(itemData.tracks) && itemData.tracks.length > 0) {
        const seen = new Set<string>();
        const unique = itemData.tracks
          .map((t: Track) => ({
            ...t,
            name: extractString(t.name, 'Untitled Track'),
            artist: extractString(t.artist, 'Unknown Artist'),
            image: sanitizeImageUrl(t.image || t.thumbnailImage),
            thumbnailImage: sanitizeImageUrl(t.thumbnailImage || t.image),
          }))
          .filter((t: Track) => {
            if (!t || !t.name) return false;
            const key = t.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        const finalItemTracks = unique.length > 0 ? unique : itemData.tracks;
        setTracks(finalItemTracks);
        setLoading(false);

        if (finalItemTracks.length > 0 && (type === 'album' || type === 'playlist')) {
          artworkService.resolveAlbumTracksArtwork(finalItemTracks, image, (trackId, artworkUrl) => {
            setTracks((prev) =>
              prev.map((t) => (t.id === trackId ? { ...t, image: artworkUrl, thumbnailImage: artworkUrl } : t))
            );
          });
        }
        return;
      }

      // Determine the target engine for this item
      const itemEngine =
        itemData?.sourceEngine ||
        (isListenFree ? 'listen_free' : isTuneFree ? 'tune_free' : 'freefy');

      let loadedTracks: Track[] = [];

      // 2. ALBUM HANDLING
      if (type === 'album') {
        if (itemEngine === 'listen_free') {
          const res = await listenFreeApi.getAlbumDetails(id, title);
          if (res?.tracks && res.tracks.length > 0) {
            loadedTracks = res.tracks;
          } else {
            const searchRes = await listenFreeApi.searchSongs(title || subtitle || id, 30);
            if (searchRes.length > 0) loadedTracks = searchRes;
          }
        } else if (itemEngine === 'tune_free') {
          const res = await tuneFreeApi.getAlbum(id, title);
          if (res?.tracks && res.tracks.length > 0) {
            loadedTracks = res.tracks;
          } else {
            const searchRes = await tuneFreeApi.search(title || subtitle || id, 'track');
            if (searchRes.tracks.length > 0) loadedTracks = searchRes.tracks;
          }
        } else {
          const res = await freefyApi.getAlbum(id, title);
          if (res?.tracks && res.tracks.length > 0) {
            loadedTracks = res.tracks;
          } else {
            const searchRes = await freefyApi.searchUnified(title || subtitle || id);
            if (searchRes.tracks.length > 0) loadedTracks = searchRes.tracks;
          }
        }

        // Cross-Engine Fallback: If still 0 tracks, query ListenFree and TuneFree search
        if (loadedTracks.length === 0 && (title || subtitle)) {
          const query = title ? (subtitle ? `${title} ${subtitle}` : title) : subtitle || id;
          const lfFallback = await listenFreeApi.searchSongs(query, 25);
          if (lfFallback.length > 0) {
            loadedTracks = lfFallback;
          } else {
            const tfFallback = await tuneFreeApi.search(query, 'track');
            if (tfFallback.tracks.length > 0) loadedTracks = tfFallback.tracks;
          }
        }
      }
      // 3. PLAYLIST / MIX HANDLING
      else if (type === 'playlist') {
        if (itemEngine === 'listen_free') {
          const res = await listenFreeApi.getPlaylistDetails(id, title);
          if (res?.tracks && res.tracks.length > 0) {
            loadedTracks = res.tracks;
          } else {
            const searchRes = await listenFreeApi.searchSongs(title || subtitle || id, 30);
            if (searchRes.length > 0) loadedTracks = searchRes;
          }
        } else if (itemEngine === 'tune_free') {
          const res = await tuneFreeApi.getPlaylist(id, title);
          if (res?.tracks && res.tracks.length > 0) {
            loadedTracks = res.tracks;
          } else {
            const searchRes = await tuneFreeApi.search(title || subtitle || id, 'track');
            if (searchRes.tracks.length > 0) loadedTracks = searchRes.tracks;
          }
        } else {
          const res = await freefyApi.getPlaylist(id, title);
          if (res?.tracks && res.tracks.length > 0) {
            loadedTracks = res.tracks;
          } else {
            const searchRes = await freefyApi.searchUnified(title || subtitle || id);
            if (searchRes.tracks.length > 0) loadedTracks = searchRes.tracks;
          }
        }

        // Cross-Engine Fallback: If still 0 tracks, query ListenFree & TuneFree search
        if (loadedTracks.length === 0 && (title || subtitle)) {
          const query = title || subtitle || id;
          const lfFallback = await listenFreeApi.searchSongs(query, 25);
          if (lfFallback.length > 0) {
            loadedTracks = lfFallback;
          } else {
            const tfFallback = await tuneFreeApi.search(query, 'track');
            if (tfFallback.tracks.length > 0) loadedTracks = tfFallback.tracks;
          }
        }
      }
      // 4. ARTIST SPOTLIGHT HANDLING
      else if (type === 'artist') {
        if (itemEngine === 'listen_free') {
          const res = await listenFreeApi.getArtistDetails(id, title);
          if (res?.topTracks && res.topTracks.length > 0) {
            loadedTracks = res.topTracks;
          } else {
            const searchRes = await listenFreeApi.searchSongs(title || id, 30);
            if (searchRes.length > 0) loadedTracks = searchRes;
          }
        } else if (itemEngine === 'tune_free') {
          const res = await tuneFreeApi.getArtist(title || id);
          if (res?.topTracks && res.topTracks.length > 0) {
            loadedTracks = res.topTracks;
          } else {
            const searchRes = await tuneFreeApi.search(title || id, 'track');
            if (searchRes.tracks.length > 0) loadedTracks = searchRes.tracks;
          }
        } else {
          const res = await freefyApi.getArtist(id);
          if (res?.topTracks && res.topTracks.length > 0) {
            loadedTracks = res.topTracks;
          } else {
            const searchRes = await freefyApi.searchUnified(title || id);
            if (searchRes.tracks.length > 0) loadedTracks = searchRes.tracks;
          }
        }

        // Cross-Engine Fallback
        if (loadedTracks.length === 0 && title) {
          const lfFallback = await listenFreeApi.searchSongs(title, 25);
          if (lfFallback.length > 0) {
            loadedTracks = lfFallback;
          } else {
            const tfFallback = await tuneFreeApi.search(title, 'track');
            if (tfFallback.tracks.length > 0) loadedTracks = tfFallback.tracks;
          }
        }
      }
      // 5. INDIVIDUAL TRACK HANDLING
      else if (type === 'track') {
        if (itemData && itemData.id) {
          loadedTracks = [itemData];
          // Try to fetch suggestions / more tracks from the same artist/query
          try {
            const suggestions = await listenFreeApi.getSongSuggestions(itemData.id, 15);
            if (suggestions.length > 0) {
              loadedTracks = [itemData, ...suggestions];
            } else if (itemData.artist) {
              const moreSongs = await listenFreeApi.searchSongs(itemData.artist, 15);
              const filtered = moreSongs.filter((s) => s.id !== itemData.id);
              loadedTracks = [itemData, ...filtered];
            }
          } catch (e) {
            // Keep at least the itemData track
          }
        } else if (title) {
          const results = await listenFreeApi.searchSongs(title, 20);
          if (results.length > 0) loadedTracks = results;
        }
      }
      // 6. LIVE ROOM HANDLING
      else if (type === 'room') {
        const queue = await listenFreeApi.getRoomQueue(id);
        setRoomQueue(queue);
        loadedTracks = queue.map((q) => ({
          id: q.song_id,
          name: q.song_name,
          artist: q.artist,
          image: q.image_url,
          streamUrl: q.song_download_url?.[0] || '',
          duration: q.duration_seconds || 180,
          sourceEngine: 'listen_free',
        }));
      }

      // Sanitize and deduplicate loaded tracks by title/id to prevent identical repeated song listings
      const seenTitles = new Set<string>();
      const finalUniqueTracks = loadedTracks
        .map((t) => ({
          ...t,
          name: extractString(t.name, 'Untitled Track'),
          artist: extractString(t.artist, 'Unknown Artist'),
          image: sanitizeImageUrl(t.image || t.thumbnailImage),
          thumbnailImage: sanitizeImageUrl(t.thumbnailImage || t.image),
        }))
        .filter((t) => {
          if (!t || !t.name) return false;
          const normalized = t.name.toLowerCase().trim();
          if (seenTitles.has(normalized)) return false;
          seenTitles.add(normalized);
          return true;
        });

      const finalTracks = finalUniqueTracks.length > 0 ? finalUniqueTracks : loadedTracks;
      setTracks(finalTracks);

      // If tracks share the compilation album artwork, progressively resolve authentic single/movie artwork
      if (finalTracks.length > 0 && (type === 'album' || type === 'playlist')) {
        artworkService.resolveAlbumTracksArtwork(finalTracks, image, (trackId, artworkUrl) => {
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, image: artworkUrl, thumbnailImage: artworkUrl } : t))
          );
        });
      }
    } catch (err) {
      console.warn('[DetailScreen] loadDetails error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[randomIndex], tracks);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Floating Back Bar */}
      <View style={[styles.navBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: colors.cardGlass, borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.navTitle, { color: colors.text }]}>
          {title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        ListHeaderComponent={
          <View style={styles.headerHero}>
            {/* Banner Artwork */}
            <View
              style={[
                styles.artWrapper,
                {
                  borderRadius: type === 'artist' ? width * 0.25 : radius.lg,
                  borderColor: itemEngineTheme.cardBorder,
                },
              ]}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.bannerArt} />
              ) : (
                <Disc3 size={64} color={itemEngineTheme.primary} />
              )}
            </View>

            {/* Type badge */}
            <Badge
              label={
                type === 'room'
                  ? 'LIVE ROOM'
                  : type === 'album'
                  ? 'ALBUM'
                  : type === 'artist'
                  ? 'ARTIST'
                  : 'PLAYLIST'
              }
              variant={type === 'room' ? 'live' : 'primary'}
              style={{ marginTop: 12 }}
            />

            {/* Title & Subtitle */}
            <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                {subtitle}
              </Text>
            ) : null}

            {/* Action Bar */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: itemEngineTheme.primary }]}
                onPress={handlePlayAll}
                activeOpacity={0.8}
                disabled={tracks.length === 0}
              >
                <Play size={18} color="#070B14" fill="#070B14" />
                <Text style={styles.playBtnText}>Play All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shuffleBtn, { borderColor: colors.border }]}
                onPress={handleShuffle}
                activeOpacity={0.8}
                disabled={tracks.length === 0}
              >
                <Shuffle size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Section Count Header */}
            <View style={[styles.tracklistHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tracklistHeaderText, { color: colors.textSecondary }]}>
                {tracks.length} Songs {type === 'room' ? 'in Live Supabase Queue' : ''}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackCard track={item} queueContext={tracks} showIndex={index} albumImage={image} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={itemEngineTheme.primary} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {type === 'room'
                  ? 'No tracks currently queued in this live space.'
                  : 'No tracks available.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: width * 0.6,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  headerHero: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  artWrapper: {
    width: width * 0.48,
    height: width * 0.48,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerArt: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    gap: 8,
  },
  playBtnText: {
    color: '#070B14',
    fontSize: 14,
    fontWeight: '700',
  },
  shuffleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tracklistHeader: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tracklistHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
