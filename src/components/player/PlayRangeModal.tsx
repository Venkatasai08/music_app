// Glassmorphic Audio Play Range (Snippet Playback) Modal
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import {
  X,
  RotateCcw,
  SlidersHorizontal,
  Play,
  Clock,
  Sparkles,
  Check,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useAppTheme } from '../../theme';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { formatTime } from '../../utils/audioUtils';

interface PlayRangeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PlayRangeModal: React.FC<PlayRangeModalProps> = React.memo(({ visible, onClose }) => {
  const { colors, radius } = useAppTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlayRangeEnabled = usePlayerStore((s) => s.isPlayRangeEnabled);
  const togglePlayRangeMode = usePlayerStore((s) => s.togglePlayRangeMode);
  const setTrackPlayRange = usePlayerStore((s) => s.setTrackPlayRange);
  const getEffectivePlayRange = usePlayerStore((s) => s.getEffectivePlayRange);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const totalDurationSec =
    currentTrack?.duration ||
    (durationMs > 0 ? Math.round(durationMs / 1000) : 180);

  const effective = getEffectivePlayRange(currentTrack);

  const [localStart, setLocalStart] = useState(effective.startSec);
  const [localEnd, setLocalEnd] = useState(effective.endSec);

  // Sync state whenever modal becomes visible or track changes
  useEffect(() => {
    if (visible && currentTrack) {
      const eff = getEffectivePlayRange(currentTrack);
      setLocalStart(eff.startSec);
      setLocalEnd(eff.endSec);
    }
  }, [visible, currentTrack?.id, isPlayRangeEnabled]);

  const updateLocalRange = (start: number, end: number) => {
    const clampedStart = Math.max(0, Math.min(start, totalDurationSec - 1));
    const clampedEnd = Math.min(totalDurationSec, Math.max(clampedStart + 1, end));
    setLocalStart(clampedStart);
    setLocalEnd(clampedEnd);
  };

  const handleApply = () => {
    const clampedStart = Math.max(0, Math.min(localStart, totalDurationSec - 1));
    const clampedEnd = Math.min(totalDurationSec, Math.max(clampedStart + 1, localEnd));
    if (currentTrack?.id) {
      setTrackPlayRange(currentTrack.id, {
        startSec: clampedStart,
        endSec: clampedEnd,
        enabled: true,
      });
    }
    onClose();
  };

  const handleStepStart = (delta: number) => {
    const nextStart = Math.max(0, Math.min(localStart + delta, localEnd - 1));
    updateLocalRange(nextStart, localEnd);
  };

  const handleStepEnd = (delta: number) => {
    const nextEnd = Math.min(totalDurationSec, Math.max(localStart + 1, localEnd + delta));
    updateLocalRange(localStart, nextEnd);
  };

  const handleSetStartToCurrent = () => {
    const curSec = Math.round(positionMs / 1000);
    const nextStart = Math.max(0, Math.min(curSec, localEnd - 1));
    updateLocalRange(nextStart, localEnd);
  };

  const handleSetEndToCurrent = () => {
    const curSec = Math.round(positionMs / 1000);
    const nextEnd = Math.min(totalDurationSec, Math.max(localStart + 1, curSec));
    updateLocalRange(localStart, nextEnd);
  };

  const handleReset = () => {
    updateLocalRange(60, Math.min(120, totalDurationSec));
  };

  const handlePreview = async () => {
    await usePlayerStore.getState().seekTo(localStart * 1000);
    if (!isPlaying) {
      await usePlayerStore.getState().togglePlayPause();
    }
  };

  const PRESETS = [
    { label: '1m to 2m', start: 60, end: Math.min(120, totalDurationSec), desc: '1-2 Min Standard' },
    { label: '0:30 - 1:30', start: 30, end: Math.min(90, totalDurationSec), desc: 'Chorus Snippet' },
    { label: '0:00 - 1:00', start: 0, end: Math.min(60, totalDurationSec), desc: 'Intro 1 Min' },
    { label: '1:00 - 3:00', start: 60, end: Math.min(180, totalDurationSec), desc: '2 Min Extended' },
    { label: 'Full Track', start: 0, end: totalDurationSec, desc: 'Full Song Duration' },
  ];

  const snippetDuration = Math.max(0, localEnd - localStart);
  const startRatio = totalDurationSec > 0 ? (localStart / totalDurationSec) * 100 : 0;
  const widthRatio =
    totalDurationSec > 0 ? ((localEnd - localStart) / totalDurationSec) * 100 : 100;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.dialogCard, { backgroundColor: '#0E1420', borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <SlidersHorizontal size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Audio Play Range</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleReset}
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

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Master Mode Switch */}
            <TouchableOpacity
              style={[
                styles.switchCard,
                {
                  backgroundColor: isPlayRangeEnabled
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(255, 255, 255, 0.04)',
                  borderColor: isPlayRangeEnabled ? 'rgba(245, 158, 11, 0.4)' : colors.border,
                },
              ]}
              onPress={() => togglePlayRangeMode()}
              activeOpacity={0.8}
            >
              <View style={styles.switchTextCol}>
                <View style={styles.switchTitleRow}>
                  <Sparkles
                    size={15}
                    color={isPlayRangeEnabled ? '#F59E0B' : colors.textSecondary}
                  />
                  <Text style={[styles.switchTitle, { color: colors.text }]}>
                    Play Range Mode
                  </Text>
                </View>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  {isPlayRangeEnabled
                    ? 'Active: Plays snippet & auto-skips to next song'
                    : 'Disabled: Plays entire song normally'}
                </Text>
              </View>
              <View pointerEvents="none">
                <Switch
                  value={isPlayRangeEnabled}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.15)', true: '#F59E0B' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </TouchableOpacity>

            {/* Visual Timeline Slice */}
            <View style={styles.visualSection}>
              <View style={styles.timeBadgeRow}>
                <View style={[styles.timeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                  <Text style={[styles.timeBadgeLabel, { color: colors.textMuted }]}>START</Text>
                  <Text style={[styles.timeBadgeValue, { color: '#F59E0B' }]}>
                    {formatTime(localStart)}
                  </Text>
                </View>

                <View style={styles.durationPill}>
                  <Clock size={12} color="#F59E0B" />
                  <Text style={styles.durationPillText}>{formatTime(snippetDuration)} snippet</Text>
                </View>

                <View style={[styles.timeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                  <Text style={[styles.timeBadgeLabel, { color: colors.textMuted }]}>END</Text>
                  <Text style={[styles.timeBadgeValue, { color: '#F59E0B' }]}>
                    {formatTime(localEnd)}
                  </Text>
                </View>
              </View>

              {/* Graphical Timeline Bar */}
              <View style={styles.timelineTrackBg}>
                <View
                  style={[
                    styles.timelineActiveSlice,
                    {
                      left: `${startRatio}%`,
                      width: `${Math.max(4, widthRatio)}%`,
                      backgroundColor: '#F59E0B',
                    },
                  ]}
                />
              </View>
              <View style={styles.timelineBoundaryRow}>
                <Text style={[styles.boundaryText, { color: colors.textMuted }]}>0:00</Text>
                <Text style={[styles.boundaryText, { color: colors.textMuted }]}>
                  {formatTime(totalDurationSec)}
                </Text>
              </View>
            </View>

            {/* Stepper Controllers */}
            <View style={styles.steppersContainer}>
              {/* Start Time Controller */}
              <View style={[styles.controlBox, { borderColor: colors.border }]}>
                <View style={styles.controlHeaderRow}>
                  <Text style={[styles.controlBoxTitle, { color: colors.textSecondary }]}>
                    START TIME
                  </Text>
                  <TouchableOpacity
                    onPress={handleSetStartToCurrent}
                    style={styles.currentPositionBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.currentPositionBtnText, { color: colors.primary }]}>
                      Set to current ({formatTime(positionMs / 1000)})
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.stepperActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleStepStart(-10)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Text style={styles.smallStepText}>-10s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStepStart(-1)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Minus size={14} color={colors.text} />
                  </TouchableOpacity>

                  <Text style={[styles.stepperDisplayValue, { color: colors.text }]}>
                    {formatTime(localStart)}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleStepStart(1)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Plus size={14} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStepStart(10)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Text style={styles.smallStepText}>+10s</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Time Controller */}
              <View style={[styles.controlBox, { borderColor: colors.border }]}>
                <View style={styles.controlHeaderRow}>
                  <Text style={[styles.controlBoxTitle, { color: colors.textSecondary }]}>
                    END TIME
                  </Text>
                  <TouchableOpacity
                    onPress={handleSetEndToCurrent}
                    style={styles.currentPositionBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.currentPositionBtnText, { color: colors.primary }]}>
                      Set to current ({formatTime(positionMs / 1000)})
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.stepperActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleStepEnd(-10)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Text style={styles.smallStepText}>-10s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStepEnd(-1)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Minus size={14} color={colors.text} />
                  </TouchableOpacity>

                  <Text style={[styles.stepperDisplayValue, { color: colors.text }]}>
                    {formatTime(localEnd)}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleStepEnd(1)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Plus size={14} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStepEnd(10)}
                    style={[styles.smallStepBtn, { borderColor: colors.border }]}
                  >
                    <Text style={styles.smallStepText}>+10s</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Presets Grid */}
            <View style={styles.presetSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                QUICK RANGE PRESETS
              </Text>
              <View style={styles.presetsGrid}>
                {PRESETS.map((p) => {
                  const isSelected =
                    Math.abs(localStart - p.start) <= 1 && Math.abs(localEnd - p.end) <= 1;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      onPress={() => updateLocalRange(p.start, p.end)}
                      style={[
                        styles.presetCard,
                        {
                          backgroundColor: isSelected
                            ? '#F59E0B'
                            : 'rgba(255, 255, 255, 0.05)',
                          borderColor: isSelected ? '#F59E0B' : colors.cardBorder,
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
                          {p.label}
                        </Text>
                        {isSelected && <Check size={13} color="#070B14" strokeWidth={3} />}
                      </View>
                      <Text
                        style={[
                          styles.presetSub,
                          { color: isSelected ? '#1E293B' : colors.textMuted },
                        ]}
                      >
                        {p.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Actions: Preview & Save */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={handlePreview}
                style={[styles.previewBtn, { flex: 1, marginTop: 0, backgroundColor: 'rgba(245, 158, 11, 0.16)', borderColor: '#F59E0B' }]}
                activeOpacity={0.8}
              >
                <Play size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.previewBtnText}>Preview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApply}
                style={[styles.previewBtn, { flex: 1, marginTop: 0, backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]}
                activeOpacity={0.8}
              >
                <Check size={16} color="#070B14" strokeWidth={2.8} />
                <Text style={[styles.previewBtnText, { color: '#070B14', fontWeight: '700' }]}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    paddingHorizontal: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
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
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 10,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  visualSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeBadgeValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  timelineTrackBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  timelineActiveSlice: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  timelineBoundaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  boundaryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  steppersContainer: {
    gap: 12,
    marginBottom: 16,
  },
  controlBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  controlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentPositionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  currentPositionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepperActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  smallStepBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  stepperDisplayValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  presetSection: {
    marginBottom: 16,
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
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetLabel: {
    fontSize: 14,
  },
  presetSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
});
