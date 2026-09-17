import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Pause, Heart, MoreVertical, Mic2, Trash2 } from 'lucide-react-native';
import { Track } from '../../types/music';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAppTheme, getEngineTheme } from '../../theme';
import { formatTime, extractString } from '../../utils/audioUtils';
import { Badge } from '../common/Badge';
import { DownloadButton } from '../common/DownloadButton';
import { TrackArtwork } from '../common/TrackArtwork';
import { useSongOptionsStore } from '../../stores/useSongOptionsStore';

interface TrackCardProps {
  track: Track;
  queueContext?: Track[];
  albumImage?: string;
  onMorePress?: (track: Track) => void;
  onDeletePress?: (track: Track) => void;
  showIndex?: number;
  showDelete?: boolean;
}
 
export const TrackCard: React.FC<TrackCardProps> = React.memo(({
  track,
  queueContext,
  albumImage,
  onMorePress,
  onDeletePress,
  showIndex,
  showDelete = false,
}) => {
  const { colors, radius } = useAppTheme();
  const isCurrent = usePlayerStore((s) => s.currentTrack?.id === track.id);
  const isThisPlaying = usePlayerStore((s) => s.isPlaying && s.currentTrack?.id === track.id);
  const favorited = useLibraryStore((s) => s.favorites.some((f) => f.id === track.id));

  const trackTheme = getEngineTheme(track.sourceEngine);

  const trackTitle = extractString(track.name, 'Untitled Track');
  const trackArtist = extractString(track.artist, 'Unknown Artist');

  const handlePlayPress = React.useCallback(() => {
    if (isCurrent) {
      usePlayerStore.getState().togglePlayPause();
    } else {
      usePlayerStore.getState().playTrack(track, queueContext);
    }
  }, [isCurrent, track, queueContext]);

  const handleToggleFavorite = React.useCallback(() => {
    useLibraryStore.getState().toggleFavorite(track);
  }, [track]);

  const handleMorePress = React.useCallback(() => {
    if (onMorePress) {
      onMorePress(track);
    } else {
      useSongOptionsStore.getState().openSongOptions(track, queueContext);
    }
  }, [onMorePress, track, queueContext]);

  const songImage = track.image || track.thumbnailImage || albumImage;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isCurrent ? `${trackTheme.primary}15` : 'transparent',
          borderRadius: 16,
          borderColor: isCurrent ? `${trackTheme.primary}44` : 'transparent',
          borderWidth: isCurrent ? 1 : 0,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.contentPressable}
        onPress={handlePlayPress}
        activeOpacity={0.7}
      >
        {/* Optional Index Number with Rank Badging */}
        {showIndex !== undefined && (
          <View style={styles.rankBadgeWrapper}>
            {showIndex === 0 ? (
              <View style={[styles.rankSpecialBadge, { backgroundColor: 'rgba(245, 158, 11, 0.25)', borderColor: '#F59E0B' }]}>
                <Text style={[styles.rankSpecialText, { color: '#FBBF24' }]}>1</Text>
              </View>
            ) : showIndex === 1 ? (
              <View style={[styles.rankSpecialBadge, { backgroundColor: 'rgba(148, 163, 184, 0.25)', borderColor: '#94A3B8' }]}>
                <Text style={[styles.rankSpecialText, { color: '#CBD5E1' }]}>2</Text>
              </View>
            ) : showIndex === 2 ? (
              <View style={[styles.rankSpecialBadge, { backgroundColor: 'rgba(217, 119, 6, 0.25)', borderColor: '#D97706' }]}>
                <Text style={[styles.rankSpecialText, { color: '#F59E0B' }]}>3</Text>
              </View>
            ) : (
              <Text style={[styles.indexText, { color: isCurrent ? trackTheme.primary : 'rgba(255, 255, 255, 0.45)' }]}>
                {showIndex + 1}
              </Text>
            )}
          </View>
        )}

        {/* Album Artwork & Play overlay */}
        <View style={styles.artContainer}>
          <TrackArtwork
            imageUri={songImage}
            title={trackTitle}
            artist={trackArtist}
            size={50}
            borderRadius={14}
          />
          {isCurrent && (
            <View style={styles.playingOverlay}>
              {isThisPlaying ? (
                <Pause size={16} color={trackTheme.primary} />
              ) : (
                <Play size={16} color={trackTheme.primary} />
              )}
            </View>
          )}
        </View>

        {/* Track Info */}
        <View style={styles.infoContainer}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: isCurrent ? trackTheme.primary : '#FFFFFF' },
            ]}
          >
            {trackTitle}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            Song by {trackArtist}
          </Text>

          {/* Quality or Lyrics Tag */}
          <View style={styles.metaRow}>
            {track.downloadUrls && track.downloadUrls.length > 0 && (
              <Badge label="320k" variant="quality" style={styles.miniBadge} />
            )}
            {track.hasLyrics && (
              <View style={styles.lyricTag}>
                <Mic2 size={10} color="rgba(255, 255, 255, 0.6)" />
              </View>
            )}
            {track.duration > 0 && (
              <Text style={styles.durationText}>
                {formatTime(track.duration)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Actions: Favorite, Delete & More Options Sheet */}
      <View style={styles.actions}>
        {showDelete && onDeletePress ? (
          <TouchableOpacity
            onPress={() => onDeletePress(track)}
            style={styles.actionIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.actionIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                size={18}
                color={favorited ? trackTheme.primary : 'rgba(255, 255, 255, 0.35)'}
                fill={favorited ? trackTheme.primary : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMorePress}
              style={styles.actionIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <MoreVertical size={19} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 3,
  },
  contentPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indexText: {
    width: 22,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  rankBadgeWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankSpecialBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankSpecialText: {
    fontSize: 11,
    fontWeight: '800',
  },
  artContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 10, 15, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  lyricTag: {
    padding: 2,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    padding: 6,
  },
});
