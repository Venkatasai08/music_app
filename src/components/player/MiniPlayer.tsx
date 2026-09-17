import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Radio, Heart } from 'lucide-react-native';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAppTheme, getEngineTheme } from '../../theme';
import { extractString } from '../../utils/audioUtils';
import { MarqueeText } from '../common/MarqueeText';
import { TrackArtwork } from '../common/TrackArtwork';

interface MiniPlayerProps {
  hasBottomTabBar?: boolean;
}

// Isolated Progress Bar component so position ticks don't re-render MiniPlayer UI
const MiniProgressBar: React.FC<{ primaryGradient: [string, string] }> = React.memo(({ primaryGradient }) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const getEffectivePlayRange = usePlayerStore((s) => s.getEffectivePlayRange);

  const totalDurationSec = Math.max(
    1,
    currentTrack?.duration || (durationMs > 0 ? durationMs / 1000 : 180)
  );

  const effectiveRange = getEffectivePlayRange(currentTrack);
  const hasCustomRange = Boolean(effectiveRange.hasCustomRange);

  const startRatio = hasCustomRange ? Math.max(0, Math.min(1, effectiveRange.startSec / totalDurationSec)) : 0;
  const endRatio = hasCustomRange ? Math.max(startRatio, Math.min(1, effectiveRange.endSec / totalDurationSec)) : 0;

  const progressRatio = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const preRangeRatio = hasCustomRange ? Math.min(progressRatio, startRatio) : progressRatio;
  const inRangeRatio = hasCustomRange ? Math.max(0, Math.min(progressRatio, endRatio) - startRatio) : 0;
  const postRangeRatio = hasCustomRange && progressRatio > endRatio ? progressRatio - endRatio : 0;

  return (
    <View style={styles.progressBarBackground}>
      {/* 1. Selected Range Highlight Segment in Gold */}
      {hasCustomRange && endRatio > startRatio && (
        <View
          style={[
            styles.rangeMarkerMini,
            {
              left: `${startRatio * 100}%`,
              width: `${(endRatio - startRatio) * 100}%`,
            },
          ]}
        />
      )}

      {/* 2. Pre-Range Progress Fill (Theme Color) */}
      {preRangeRatio > 0 && (
        <LinearGradient
          colors={primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progressBarFill,
            {
              left: 0,
              width: `${preRangeRatio * 100}%`,
            },
          ]}
        />
      )}

      {/* 3. In-Range Active Progress Fill (Bright Gold) */}
      {hasCustomRange && inRangeRatio > 0 && (
        <View
          style={[
            styles.progressBarFill,
            {
              left: `${startRatio * 100}%`,
              width: `${inRangeRatio * 100}%`,
              backgroundColor: '#FFE082',
            },
          ]}
        />
      )}

      {/* 4. Post-Range Progress Fill (Theme Color) */}
      {hasCustomRange && postRangeRatio > 0 && (
        <LinearGradient
          colors={primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progressBarFill,
            {
              left: `${endRatio * 100}%`,
              width: `${postRangeRatio * 100}%`,
            },
          ]}
        />
      )}
    </View>
  );
});

export const MiniPlayer: React.FC<MiniPlayerProps> = React.memo(({ hasBottomTabBar = true }) => {
  const insets = useSafeAreaInsets();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentRadio = usePlayerStore((s) => s.currentRadio);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const favorited = useLibraryStore((s) => (currentTrack ? s.favorites.some((f) => f.id === currentTrack.id) : false));

  // Animation values for fluid gesture feedback
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Reset animations when active track or radio changes
  useEffect(() => {
    panX.setValue(0);
    panY.setValue(0);
    opacity.setValue(1);
  }, [currentTrack?.id, currentRadio?.id]);

  // PanResponder for 4-directional swipe gestures:
  // 1. Swipe Down  -> Dismiss/remove mini player & stop playback
  // 2. Swipe Up    -> Open Full-Screen Player
  // 3. Swipe Right -> Play Previous Song
  // 4. Swipe Left  -> Play Next Song
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12,
        onPanResponderGrant: () => {
          panX.stopAnimation();
          panY.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dy) > Math.abs(g.dx)) {
            // Vertical movement dominant
            panY.setValue(g.dy);
            if (g.dy > 0) {
              // Fade subtly when dragging downwards to dismiss
              opacity.setValue(Math.max(0.3, 1 - g.dy / 140));
            }
          } else {
            // Horizontal movement dominant
            panX.setValue(g.dx * 0.7);
          }
        },
        onPanResponderRelease: (_, g) => {
          const isVertical = Math.abs(g.dy) > Math.abs(g.dx);

          if (isVertical) {
            if (g.dy > 35 || g.vy > 0.35) {
              // 1. SWIPE DOWN -> Dismiss / Remove Mini Player
              Animated.parallel([
                Animated.timing(panY, {
                  toValue: 120,
                  duration: 180,
                  useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: 180,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                usePlayerStore.getState().closePlayer();
              });
              return;
            } else if (g.dy < -30 || g.vy < -0.3) {
              // 2. SWIPE UP -> Open Full Screen Player
              Animated.spring(panY, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
              }).start();
              usePlayerStore.getState().setFullPlayerVisible(true);
              return;
            }
          } else {
            if (g.dx > 40 || g.vx > 0.35) {
              // 3. SWIPE RIGHT -> Play Previous Song
              Animated.sequence([
                Animated.timing(panX, {
                  toValue: 60,
                  duration: 120,
                  useNativeDriver: true,
                }),
                Animated.spring(panX, {
                  toValue: 0,
                  friction: 7,
                  tension: 60,
                  useNativeDriver: true,
                }),
              ]).start();
              usePlayerStore.getState().previousTrack(true);
              return;
            } else if (g.dx < -40 || g.vx < -0.35) {
              // 4. SWIPE LEFT -> Play Next Song
              Animated.sequence([
                Animated.timing(panX, {
                  toValue: -60,
                  duration: 120,
                  useNativeDriver: true,
                }),
                Animated.spring(panX, {
                  toValue: 0,
                  friction: 7,
                  tension: 60,
                  useNativeDriver: true,
                }),
              ]).start();
              usePlayerStore.getState().nextTrack();
              return;
            }
          }

          // Incomplete gesture: Spring smoothly back to rest
          Animated.parallel([
            Animated.spring(panX, { toValue: 0, friction: 8, useNativeDriver: true }),
            Animated.spring(panY, { toValue: 0, friction: 8, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(panX, { toValue: 0, friction: 8, useNativeDriver: true }),
            Animated.spring(panY, { toValue: 0, friction: 8, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        },
      }),
    [panX, panY, opacity]
  );

  if (!currentTrack && !currentRadio) return null;

  const activeTheme = getEngineTheme(currentTrack?.sourceEngine || (currentRadio ? 'freefy' : undefined));

  const title = extractString(currentTrack?.name || currentRadio?.name, 'Nothing Playing');
  const subtitle = extractString(currentTrack?.artist || (currentRadio ? 'Live Radio Stream' : ''), '');
  const image =
    currentTrack?.image ||
    currentTrack?.thumbnailImage ||
    currentRadio?.favicon ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80';

  const handleTogglePlayPause = () => {
    usePlayerStore.getState().togglePlayPause();
  };

  const handleNextTrack = () => {
    usePlayerStore.getState().nextTrack();
  };

  const handleOpenFullPlayer = () => {
    usePlayerStore.getState().setFullPlayerVisible(true);
  };

  const handleToggleFavorite = () => {
    if (currentTrack) {
      useLibraryStore.getState().toggleFavorite(currentTrack);
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(17, 18, 26, 0.96)',
          borderColor: `${activeTheme.primary}33`,
          borderRadius: 20,
          marginBottom: hasBottomTabBar ? 8 : Math.max(insets.bottom, 12),
          transform: [{ translateX: panX }, { translateY: panY }],
          opacity: opacity,
        },
      ]}
    >
      {/* Progress Bar Top Line */}
      <MiniProgressBar primaryGradient={activeTheme.primaryGradient} />

      <View style={styles.contentRow}>
        {/* Clickable Info Area to open Full Player */}
        <TouchableOpacity
          style={styles.infoArea}
          onPress={handleOpenFullPlayer}
          activeOpacity={0.8}
        >
          {/* Circular Artwork */}
          <View style={styles.artWrapper}>
            <TrackArtwork
              imageUri={image}
              title={title}
              artist={subtitle}
              size={46}
              borderRadius={23}
            />
          </View>

          {/* Marquee Info */}
          <View style={styles.info}>
            <MarqueeText
              text={title}
              style={[styles.title, { color: '#FFFFFF' }]}
              speed={30}
              delay={1500}
            />
            <MarqueeText
              text={subtitle}
              style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.55)' }]}
              speed={26}
              delay={2000}
            />
          </View>
        </TouchableOpacity>

        {/* Action Controls */}
        <View style={styles.controls}>
          {currentTrack && (
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                size={18}
                color={favorited ? activeTheme.primary : 'rgba(255, 255, 255, 0.5)'}
                fill={favorited ? activeTheme.primary : 'transparent'}
              />
            </TouchableOpacity>
          )}

          {/* Master Glowing Play Button */}
          <TouchableOpacity
            onPress={handleTogglePlayPause}
            style={[styles.playBtnTouch, { shadowColor: activeTheme.primary }]}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <LinearGradient
              colors={activeTheme.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playBtnGradient}
            >
              {isPlaying ? (
                <Pause size={16} color="#FFFFFF" />
              ) : (
                <Play size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {currentTrack && (
            <TouchableOpacity
              onPress={handleNextTrack}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SkipForward size={19} color="rgba(255, 255, 255, 0.85)" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  progressBarBackground: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    position: 'relative',
  },
  rangeMarkerMini: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FFD700',
    zIndex: 2,
    opacity: 0.85,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  artWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E202B',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 6,
  },
  playBtnTouch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowColor: '#FF3B6D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  playBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
