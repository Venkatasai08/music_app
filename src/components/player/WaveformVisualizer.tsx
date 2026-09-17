import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useAppTheme } from '../../theme';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface WaveformVisualizerProps {
  height?: number;
  activeColor?: string;
  rangeColor?: string;
}

const { width } = Dimensions.get('window');
const TOTAL_BARS = 38;

// Static baseline waveform heights to give realistic frequency spectrum look
const BASE_HEIGHTS = [
  0.35, 0.5, 0.7, 0.45, 0.85, 0.6, 0.95, 0.75, 1.0, 0.65,
  0.8, 0.55, 0.9, 0.7, 0.4, 0.85, 0.6, 1.0, 0.75, 0.5,
  0.9, 0.65, 0.8, 0.45, 0.95, 0.7, 0.6, 0.85, 0.5, 0.75,
  0.6, 0.4, 0.7, 0.55, 0.45, 0.35, 0.5, 0.3,
];

// Radiant Gold Palette for Range Highlighting across all themes
const GOLD_RANGE_ACTIVE = '#FFE082'; // Bright gold when playing within range
const GOLD_RANGE_INACTIVE = '#FFD700'; // Pure radiant gold for selected range segment
const GOLD_RANGE_WASH = 'rgba(255, 215, 0, 0.15)'; // Translucent background highlight for range

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = React.memo(({
  height = 48,
  activeColor,
  rangeColor = GOLD_RANGE_INACTIVE,
}) => {
  const { colors } = useAppTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const trackPlayRanges = usePlayerStore((s) => s.trackPlayRanges);
  const isPlayRangeEnabled = usePlayerStore((s) => s.isPlayRangeEnabled);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const getEffectivePlayRange = usePlayerStore((s) => s.getEffectivePlayRange);

  const highlightColor = activeColor || colors.primary || '#FF3B6D';

  const totalDurationSec = Math.max(
    1,
    currentTrack?.duration || (durationMs > 0 ? durationMs / 1000 : 180)
  );

  const effectiveRange = getEffectivePlayRange(currentTrack);
  const hasCustomRange = Boolean(effectiveRange.hasCustomRange);

  const startRatio = hasCustomRange ? Math.max(0, Math.min(1, effectiveRange.startSec / totalDurationSec)) : 0;
  const endRatio = hasCustomRange ? Math.max(startRatio, Math.min(1, effectiveRange.endSec / totalDurationSec)) : 0;

  const startBarIdx = hasCustomRange ? Math.floor(startRatio * TOTAL_BARS) : -1;
  const endBarIdx = hasCustomRange ? Math.ceil(endRatio * TOTAL_BARS) : -1;

  const progressRatio = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
  const activeBarIndex = Math.floor(progressRatio * TOTAL_BARS);

  // Subtle pulsing animation when audio is actively playing
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isPlaying) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isPlaying]);

  const handleTouchSeek = (event: any) => {
    const touchX = event.nativeEvent.locationX;
    const containerWidth = width - 48;
    const targetRatio = Math.max(0, Math.min(1, touchX / containerWidth));
    usePlayerStore.getState().seekTo(targetRatio * (durationMs || totalDurationSec * 1000));
  };

  return (
    <View style={styles.container}>
      {/* Interactive Waveform Bar Row */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTouchSeek}
        style={[styles.barsWrapper, { height }]}
      >
        {/* Subtle glowing gold wash underlay for selected range region */}
        {hasCustomRange && endRatio > startRatio && (
          <View
            style={[
              styles.rangeWash,
              {
                left: `${startRatio * 100}%`,
                width: `${Math.max(2, (endRatio - startRatio) * 100)}%`,
              },
            ]}
            pointerEvents="none"
          >
            {/* Top boundary gold dots */}
            <View style={styles.rangeStartDot} />
            <View style={styles.rangeEndDot} />
          </View>
        )}

        {BASE_HEIGHTS.slice(0, TOTAL_BARS).map((h, i) => {
          const isPassed = i <= activeBarIndex;
          const isInRange = hasCustomRange && i >= startBarIdx && i <= endBarIdx;
          const barHeight = Math.max(6, h * height);

          // Determine bar color
          let barBgColor = 'rgba(255, 255, 255, 0.18)';
          if (isInRange) {
            // Selected range is highlighted in distinctive radiant gold
            barBgColor = isPassed ? GOLD_RANGE_ACTIVE : rangeColor;
          } else if (isPassed) {
            barBgColor = highlightColor;
          }

          return (
            <Animated.View
              key={`bar-${i}`}
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor: barBgColor,
                  shadowColor: isInRange ? '#FFD700' : 'transparent',
                  shadowOpacity: isInRange ? 0.7 : 0,
                  shadowRadius: isInRange ? 3 : 0,
                  transform: [
                    {
                      scaleY: isPlaying && isPassed ? pulseAnim : 1,
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 24,
    marginVertical: 4,
    alignItems: 'center',
  },
  barsWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    position: 'relative',
  },
  rangeWash: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    backgroundColor: GOLD_RANGE_WASH,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    borderWidth: 1.2,
    borderRadius: 6,
    zIndex: 1,
  },
  rangeStartDot: {
    position: 'absolute',
    top: -3,
    left: -2.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFD700',
  },
  rangeEndDot: {
    position: 'absolute',
    top: -3,
    right: -2.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFD700',
  },
  bar: {
    width: 3.2,
    borderRadius: 2,
    zIndex: 2,
  },
});
