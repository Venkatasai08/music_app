// Glassmorphic Real-Time Playback Speed Control Dialog (0.5x - 2.0x)

import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Dimensions,
  Animated,
} from 'react-native';
import { X, Gauge, RotateCcw, Check, Zap, Minus, Plus } from 'lucide-react-native';
import { useAppTheme } from '../../theme';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface PlaybackSpeedModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;

const PRESET_SPEEDS = [
  { value: 0.5, label: '0.5x', sub: 'Slow' },
  { value: 0.75, label: '0.75x', sub: 'Relaxed' },
  { value: 1.0, label: '1.0x', sub: 'Normal' },
  { value: 1.25, label: '1.25x', sub: 'Brisk' },
  { value: 1.5, label: '1.5x', sub: 'Fast' },
  { value: 2.0, label: '2.0x', sub: '2x Speed' },
];

export const PlaybackSpeedModal: React.FC<PlaybackSpeedModalProps> = React.memo(({ visible, onClose }) => {
  const { colors, radius } = useAppTheme();
  const playbackSpeed = usePlayerStore((s) => s.playbackSpeed);

  const sliderTrackRef = useRef<View>(null);
  const trackLayoutRef = useRef<{ pageX: number; width: number }>({ pageX: 0, width: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(playbackSpeed);

  // Sync local speed with store when modal opens or store changes
  React.useEffect(() => {
    setLocalSpeed(playbackSpeed);
  }, [playbackSpeed, visible]);

  const updateTrackLayout = () => {
    sliderTrackRef.current?.measureInWindow((x, _y, w, _h) => {
      if (w > 0) {
        trackLayoutRef.current = { pageX: x, width: w };
      }
    });
  };

  const calculateSpeedFromPageX = (pageX: number) => {
    const { pageX: startX, width: trackWidth } = trackLayoutRef.current;
    const safeTrackWidth = trackWidth > 0 ? trackWidth : width - 96;
    const safeStartX = startX > 0 ? startX : 48;
    const touchX = pageX - safeStartX;
    const ratio = Math.max(0, Math.min(1, touchX / safeTrackWidth));
    const rawSpeed = MIN_SPEED + ratio * (MAX_SPEED - MIN_SPEED);
    // Round to nearest 0.05
    return Math.round(rawSpeed * 20) / 20;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => {
          setIsDragging(true);
          updateTrackLayout();
          const speed = calculateSpeedFromPageX(evt.nativeEvent.pageX);
          setLocalSpeed(speed);
          usePlayerStore.getState().setPlaybackSpeed(speed);
        },
        onPanResponderMove: (evt) => {
          const speed = calculateSpeedFromPageX(evt.nativeEvent.pageX);
          setLocalSpeed(speed);
          usePlayerStore.getState().setPlaybackSpeed(speed);
        },
        onPanResponderRelease: (evt) => {
          const speed = calculateSpeedFromPageX(evt.nativeEvent.pageX);
          setIsDragging(false);
          setLocalSpeed(speed);
          usePlayerStore.getState().setPlaybackSpeed(speed);
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
        },
      }),
    []
  );

  const currentSpeed = isDragging ? localSpeed : playbackSpeed;
  const progressRatio = Math.max(0, Math.min(1, (currentSpeed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));

  const handlePresetSelect = (speedVal: number) => {
    setLocalSpeed(speedVal);
    usePlayerStore.getState().setPlaybackSpeed(speedVal);
  };

  const handleStepSpeed = (delta: number) => {
    const next = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round((currentSpeed + delta) * 20) / 20));
    setLocalSpeed(next);
    usePlayerStore.getState().setPlaybackSpeed(next);
  };

  const getSpeedDescription = (s: number) => {
    if (s === 1.0) return 'Standard Normal Pitch & Tempo';
    if (s < 0.8) return '0.5x Slow Tempo (Detailed Listening)';
    if (s < 1.0) return 'Relaxed Pace';
    if (s <= 1.3) return 'Brisk & Energetic';
    if (s <= 1.7) return '1.5x Fast Tempo';
    return '2.0x Double Speed Maximum';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.dialogCard, { backgroundColor: '#101622', borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Gauge size={20} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Playback Speed</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => handlePresetSelect(1.0)}
                style={[styles.headerResetBtn, { borderColor: colors.border, backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <RotateCcw size={13} color={colors.textSecondary} />
                <Text style={[styles.headerResetText, { color: colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Large Speed Live Display with Step Controls */}
          <View style={styles.displaySection}>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={() => handleStepSpeed(-0.1)}
                style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}
                disabled={currentSpeed <= MIN_SPEED}
                activeOpacity={0.7}
              >
                <Minus size={18} color={currentSpeed <= MIN_SPEED ? colors.textMuted : colors.text} />
              </TouchableOpacity>

              <View style={styles.speedBadgeContainer}>
                <Text style={[styles.speedLargeValue, { color: colors.primary }]}>
                  {currentSpeed.toFixed(2)}x
                </Text>
                <Text style={[styles.speedSubtext, { color: colors.textSecondary }]}>
                  {getSpeedDescription(currentSpeed)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleStepSpeed(0.1)}
                style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}
                disabled={currentSpeed >= MAX_SPEED}
                activeOpacity={0.7}
              >
                <Plus size={18} color={currentSpeed >= MAX_SPEED ? colors.textMuted : colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Continuous Slider (0.5x to 2.0x) */}
          <View style={styles.sliderSection}>
            <View
              ref={sliderTrackRef}
              style={styles.sliderContainer}
              onLayout={updateTrackLayout}
              {...panResponder.panHandlers}
            >
              <View style={styles.sliderTouchArea}>
                <View style={[styles.sliderTrackBg, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        width: `${progressRatio * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* Draggable Thumb */}
                <View
                  style={[
                    styles.sliderThumb,
                    {
                      left: `${progressRatio * 100}%`,
                      backgroundColor: '#FFFFFF',
                      borderColor: colors.primary,
                      transform: [{ scale: isDragging ? 1.3 : 1 }],
                      shadowColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Slider Scale Labels / Ticks */}
            <View style={styles.ticksRow}>
              {['0.5x', '1.0x', '1.5x', '2.0x'].map((tickLabel, idx) => (
                <TouchableOpacity
                  key={tickLabel}
                  onPress={() => handlePresetSelect([0.5, 1.0, 1.5, 2.0][idx])}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.tickText,
                      {
                        color:
                          Math.abs(currentSpeed - [0.5, 1.0, 1.5, 2.0][idx]) < 0.05
                            ? colors.primary
                            : colors.textMuted,
                        fontWeight:
                          Math.abs(currentSpeed - [0.5, 1.0, 1.5, 2.0][idx]) < 0.05 ? '700' : '500',
                      },
                    ]}
                  >
                    {tickLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Preset Options Grid (0.5x, 1x, 1.5x, 2x) */}
          <View style={styles.presetSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              {PRESET_SPEEDS.map((preset) => {
                const isSelected = Math.abs(currentSpeed - preset.value) < 0.02;
                return (
                  <TouchableOpacity
                    key={preset.value}
                    onPress={() => handlePresetSelect(preset.value)}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={styles.presetHeader}>
                      <Text
                        style={[
                          styles.presetLabel,
                          {
                            color: isSelected ? '#070B14' : colors.text,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                      {isSelected && <Check size={14} color="#070B14" strokeWidth={3} />}
                    </View>
                    <Text
                      style={[
                        styles.presetSub,
                        { color: isSelected ? '#1E293B' : colors.textMuted },
                      ]}
                    >
                      {preset.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerResetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displaySection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBadgeContainer: {
    alignItems: 'center',
  },
  speedLargeValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  speedSubtext: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sliderSection: {
    marginBottom: 22,
  },
  sliderContainer: {
    paddingVertical: 10,
  },
  sliderTouchArea: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  sliderTrackBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    marginLeft: -10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  tickText: {
    fontSize: 12,
  },
  presetSection: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetCard: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetLabel: {
    fontSize: 15,
  },
  presetSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
