import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { RotateCcw, RotateCw, Music2 } from 'lucide-react-native';
import { useAppTheme, getEngineTheme } from '../../theme';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { TrackArtwork } from '../common/TrackArtwork';

interface CircularPlayerDialProps {
  imageUri?: string;
  title?: string;
  artist?: string;
  size?: number;
  isActive?: boolean;
  engine?: string | null;
  primaryColor?: string;
  gradientColors?: [string, string, string];
  onDoubleTapLeft?: () => void;
  onDoubleTapRight?: () => void;
}

const { width } = Dimensions.get('window');

export const CircularPlayerDial: React.FC<CircularPlayerDialProps> = React.memo(({
  imageUri,
  title,
  artist,
  size = Math.min(width * 0.82, 320),
  isActive = true,
  engine,
  primaryColor,
  gradientColors,
  onDoubleTapLeft,
  onDoubleTapRight,
}) => {
  const { colors: defaultColors } = useAppTheme();
  // Only subscribe to position/duration if this dial is currently active, preventing inactive carousel slides from re-rendering
  const positionMs = usePlayerStore((s) => (isActive ? s.positionMs : 0));
  const durationMs = usePlayerStore((s) => (isActive ? s.durationMs : 0));

  // Resolve engine theme
  const activeColors = engine ? (getEngineTheme(engine) as any) : defaultColors;
  const activePrimary = primaryColor || activeColors.primary || '#FF3B6D';
  const stops = gradientColors || activeColors.dialGradient || [activePrimary, '#FF758C', '#FFA07A'];

  // Double-tap visual feedback
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);

  // SVG Geometry calculations
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2 - 24) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Progress ratio (0 to 1) - only when active
  const progressRatio = isActive && durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
  // Circular arc strokeDashoffset
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Selected range check (subscribes to trackPlayRanges & isPlayRangeEnabled for real-time reactivity)
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const trackPlayRanges = usePlayerStore((s) => s.trackPlayRanges);
  const isPlayRangeEnabled = usePlayerStore((s) => s.isPlayRangeEnabled);
  const getEffectivePlayRange = usePlayerStore((s) => s.getEffectivePlayRange);
  const effectiveRange = getEffectivePlayRange(currentTrack);
  const isRangeActive = isActive && effectiveRange.isRangeActive;
  const showRangeVisual = isActive && Boolean(effectiveRange.hasCustomRange);

  const totalDurationSec = Math.max(
    1,
    currentTrack?.duration || (durationMs > 0 ? durationMs / 1000 : 180)
  );

  const rangeStartRatio = showRangeVisual ? Math.max(0, Math.min(1, effectiveRange.startSec / totalDurationSec)) : 0;
  const rangeEndRatio = showRangeVisual ? Math.max(rangeStartRatio, Math.min(1, effectiveRange.endSec / totalDurationSec)) : 0;
  const rangeSpan = Math.max(0, rangeEndRatio - rangeStartRatio);
  const rangeArcLength = rangeSpan * circumference;

  const isThumbInRange = showRangeVisual && progressRatio >= rangeStartRatio && progressRatio <= rangeEndRatio;

  // Thumb coordinates along circumference (starts at top -90 deg / -PI/2)
  const angle = progressRatio * 2 * Math.PI - Math.PI / 2;
  const thumbX = center + radius * Math.cos(angle);
  const thumbY = center + radius * Math.sin(angle);

  // Unique gradient ID per engine/instance
  const gradientId = `dialGradient_${engine || 'default'}_${Math.round(size)}`;

  // Handle Double Tap for 10s Skip
  const handleTouch = (side: 'left' | 'right') => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.side === side && now - lastTap.time < 350) {
      // Double tap detected!
      setDoubleTapSide(side);
      Animated.sequence([
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setDoubleTapSide(null));

      if (side === 'left') {
        if (onDoubleTapLeft) onDoubleTapLeft();
        else usePlayerStore.getState().seekTo(Math.max(0, positionMs - 10000));
      } else {
        if (onDoubleTapRight) onDoubleTapRight();
        else usePlayerStore.getState().seekTo(Math.min(durationMs, positionMs + 10000));
      }

      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, side };
    }
  };

  // Radial tick marks (36 ticks around the dial)
  const totalTicks = 36;
  const ticks = Array.from({ length: totalTicks }).map((_, i) => {
    const tickFraction = i / totalTicks;
    const tickAngle = tickFraction * 2 * Math.PI - Math.PI / 2;
    const innerR = radius + 8;
    const outerR = radius + (i % 3 === 0 ? 16 : 12);
    const x1 = center + innerR * Math.cos(tickAngle);
    const y1 = center + innerR * Math.sin(tickAngle);
    const x2 = center + outerR * Math.cos(tickAngle);
    const y2 = center + outerR * Math.sin(tickAngle);
    const isPassed = tickFraction <= progressRatio;
    const isTickInRange = showRangeVisual && tickFraction >= rangeStartRatio && tickFraction <= rangeEndRatio;

    return {
      id: i,
      x1,
      y1,
      x2,
      y2,
      isPassed,
      isTickInRange,
      isMajor: i % 3 === 0,
    };
  });

  // Multi-segment arc calculations for precise range color separation
  const preRangeProgress = showRangeVisual ? Math.min(progressRatio, rangeStartRatio) : progressRatio;
  const preRangeArcLength = preRangeProgress * circumference;

  const inRangeProgress = showRangeVisual
    ? Math.max(0, Math.min(progressRatio, rangeEndRatio) - rangeStartRatio)
    : 0;
  const inRangeArcLength = inRangeProgress * circumference;

  const postRangeProgress = showRangeVisual && progressRatio > rangeEndRatio
    ? progressRatio - rangeEndRatio
    : 0;
  const postRangeArcLength = postRangeProgress * circumference;

  // Range boundary start and end coordinates on the outer dial
  const rangeStartAngle = rangeStartRatio * 2 * Math.PI - Math.PI / 2;
  const rangeStartPinX = center + radius * Math.cos(rangeStartAngle);
  const rangeStartPinY = center + radius * Math.sin(rangeStartAngle);

  const rangeEndAngle = rangeEndRatio * 2 * Math.PI - Math.PI / 2;
  const rangeEndPinX = center + radius * Math.cos(rangeEndAngle);
  const rangeEndPinY = center + radius * Math.sin(rangeEndAngle);

  const innerArtSize = radius * 2 - 16;

  return (
    <View style={[styles.container, { width: size + 8, height: size + 8 }]}>
      {/* SVG Radial Arc and Ticks */}
      <Svg width={size} height={size} style={styles.svgOverlay}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={stops[0]} />
            <Stop offset="50%" stopColor={stops[1]} />
            <Stop offset="100%" stopColor={stops[2]} />
          </SvgLinearGradient>
          <SvgLinearGradient id="goldRangeDialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFE082" />
            <Stop offset="50%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FFA000" />
          </SvgLinearGradient>
        </Defs>

        {/* 1. Outer Dial Background Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* 2. Selected Custom Range Slot on Outer Dial in Radiant Gold */}
        {showRangeVisual && rangeEndRatio > rangeStartRatio && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#goldRangeDialGradient)"
            strokeWidth={strokeWidth + 2.5}
            strokeDasharray={`${rangeArcLength} ${circumference}`}
            strokeLinecap="round"
            fill="none"
            opacity={0.95}
            transform={`rotate(${-90 + rangeStartRatio * 360} ${center} ${center})`}
          />
        )}

        {/* 3. Radial Tick Marks */}
        {ticks.map((t) => (
          <Path
            key={t.id}
            d={`M ${t.x1} ${t.y1} L ${t.x2} ${t.y2}`}
            stroke={
              t.isTickInRange
                ? t.isPassed
                  ? '#FFE082'
                  : '#FFD700'
                : t.isPassed
                ? activePrimary
                : t.isMajor
                ? 'rgba(255, 255, 255, 0.22)'
                : 'rgba(255, 255, 255, 0.09)'
            }
            strokeWidth={t.isTickInRange ? 2.5 : t.isMajor ? 2 : 1.2}
            strokeLinecap="round"
          />
        ))}

        {/* 4. Pre-Range Progress Arc on Outer Dial (Engine Theme Color) */}
        {preRangeArcLength > 0.1 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${preRangeArcLength} ${circumference}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}

        {/* 5. In-Range Active Progress Arc on Outer Dial (Luminous Bright Gold) */}
        {showRangeVisual && inRangeArcLength > 0.1 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#FFE082"
            strokeWidth={strokeWidth + 2.5}
            strokeDasharray={`${inRangeArcLength} ${circumference}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${-90 + rangeStartRatio * 360} ${center} ${center})`}
          />
        )}

        {/* 6. Post-Range Progress Arc on Outer Dial (Engine Theme Color) */}
        {showRangeVisual && postRangeArcLength > 0.1 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${postRangeArcLength} ${circumference}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${-90 + rangeEndRatio * 360} ${center} ${center})`}
          />
        )}

        {/* 7. Range Boundary Marker Pins on Outer Dial */}
        {showRangeVisual && rangeEndRatio > rangeStartRatio && (
          <>
            <Circle
              cx={rangeStartPinX}
              cy={rangeStartPinY}
              r={4}
              fill="#FFD700"
              stroke="#090A0F"
              strokeWidth={1.5}
            />
            <Circle
              cx={rangeEndPinX}
              cy={rangeEndPinY}
              r={4}
              fill="#FFD700"
              stroke="#090A0F"
              strokeWidth={1.5}
            />
          </>
        )}

        {/* 8. Glowing Indicator Thumb Dot */}
        {progressRatio > 0.005 && (
          <Circle
            cx={thumbX}
            cy={thumbY}
            r={7}
            fill={isThumbInRange ? '#FFE082' : '#FFFFFF'}
            stroke={isThumbInRange ? '#FFD700' : activePrimary}
            strokeWidth={3}
          />
        )}
      </Svg>

      {/* Centerpiece Vinyl Circular Artwork */}
      <View
        style={[
          styles.artworkCircle,
          {
            width: innerArtSize,
            height: innerArtSize,
            borderRadius: innerArtSize / 2,
            backgroundColor: '#12131C',
            borderColor: isRangeActive ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255, 255, 255, 0.12)',
            shadowColor: isRangeActive ? '#FFD700' : activePrimary,
          },
        ]}
      >
        <TrackArtwork
          imageUri={imageUri}
          title={title}
          artist={artist}
          size={innerArtSize}
          borderRadius={innerArtSize / 2}
          iconSize={48}
          showVinylGroove
        />

        {/* Outer Vinyl Ring Grooves Overlay */}
        <View
          style={[
            styles.vinylGrooveRing,
            { borderRadius: innerArtSize / 2, borderColor: 'rgba(255, 255, 255, 0.06)' },
          ]}
        />

        {/* Left/Right Double Tap Target Areas */}
        <View style={styles.touchOverlay}>
          <TouchableOpacity
            style={styles.touchHalf}
            activeOpacity={1}
            onPress={() => handleTouch('left')}
          />
          <TouchableOpacity
            style={styles.touchHalf}
            activeOpacity={1}
            onPress={() => handleTouch('right')}
          />
        </View>

        {/* Double-Tap Feedback Overlay Animation */}
        {doubleTapSide && (
          <Animated.View
            style={[
              styles.feedbackContainer,
              doubleTapSide === 'left' ? styles.feedbackLeft : styles.feedbackRight,
              { opacity: feedbackOpacity },
            ]}
          >
            {doubleTapSide === 'left' ? (
              <View style={styles.feedbackBadge}>
                <RotateCcw size={22} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.feedbackText}>-10s</Text>
              </View>
            ) : (
              <View style={styles.feedbackBadge}>
                <RotateCw size={22} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.feedbackText}>+10s</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  svgOverlay: {
    position: 'absolute',
  },
  artworkCircle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#FF3B6D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  placeholderArt: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylGrooveRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  touchHalf: {
    flex: 1,
    height: '100%',
  },
  feedbackContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  feedbackLeft: {
    left: 0,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  feedbackRight: {
    right: 0,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  feedbackBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
