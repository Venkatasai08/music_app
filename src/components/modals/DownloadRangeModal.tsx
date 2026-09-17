// Audio Download & Trim Range Selection Dialog
// Enables choosing between downloading the Full Song or the Custom Cut Version (Ringtone/Snippet)

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Download,
  Scissors,
  X,
  Sparkles,
  Music,
  CheckCircle2,
  Layers,
} from 'lucide-react-native';
import { useAppTheme, getEngineTheme } from '../../theme';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { Track, AudioQuality } from '../../types/music';
import { formatTime } from '../../utils/audioUtils';
import { AudioWaveformCutter } from '../player/AudioWaveformCutter';

interface DownloadRangeModalProps {
  visible: boolean;
  track?: Track | null;
  onClose: () => void;
}

export const DownloadRangeModal: React.FC<DownloadRangeModalProps> = React.memo(({
  visible,
  track,
  onClose,
}) => {
  const currentTrack = usePlayerStore((s) => track || s.currentTrack);
  const preferredQuality = usePlayerStore((s) => s.preferredQuality);
  const getEffectivePlayRange = usePlayerStore((s) => s.getEffectivePlayRange);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const downloadCutTrack = useDownloadStore((s) => s.downloadCutTrack);

  const { colors, radius } = useAppTheme();
  const activeTheme = getEngineTheme(currentTrack?.sourceEngine);

  const effective = getEffectivePlayRange(currentTrack);
  const totalDurationSec = currentTrack?.duration || 180;

  const [selectedStart, setSelectedStart] = useState(effective.startSec);
  const [selectedEnd, setSelectedEnd] = useState(
    effective.endSec > 0 ? effective.endSec : totalDurationSec
  );
  const [downloadMode, setDownloadMode] = useState<'full' | 'cut' | null>(null);

  // Sync state when modal opens
  React.useEffect(() => {
    if (visible && currentTrack) {
      const eff = getEffectivePlayRange(currentTrack);
      setSelectedStart(eff.startSec);
      setSelectedEnd(eff.endSec > 0 ? eff.endSec : totalDurationSec);
    }
  }, [visible, currentTrack?.id, totalDurationSec]);

  const snippetDuration = Math.max(0, selectedEnd - selectedStart);

  const handleDownloadFull = async () => {
    if (!currentTrack) return;
    setDownloadMode('full');
    try {
      const success = await downloadTrack(currentTrack, preferredQuality);
      if (success) {
        Alert.alert(
          'Download Complete',
          `"${currentTrack.name}" has been saved in high quality (${preferredQuality}) to your phone's Music gallery!`,
          [{ text: 'Great!', onPress: onClose }]
        );
      } else {
        Alert.alert('Download Error', 'Could not complete download. Please check your connection.');
      }
    } finally {
      setDownloadMode(null);
    }
  };

  const handleDownloadCut = async () => {
    if (!currentTrack) return;
    setDownloadMode('cut');
    try {
      const success = await downloadCutTrack(
        currentTrack,
        selectedStart,
        selectedEnd,
        preferredQuality
      );
      if (success) {
        Alert.alert(
          'Snippet Saved',
          `"${currentTrack.name} (Snippet)" [${formatTime(selectedStart)} - ${formatTime(selectedEnd)}] was trimmed and saved directly to your phone's Music gallery!`,
          [{ text: 'Awesome!', onPress: onClose }]
        );
      } else {
        Alert.alert('Download Error', 'Could not trim and download snippet. Please check connection.');
      }
    } finally {
      setDownloadMode(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />

        <View style={[styles.dialogCard, { backgroundColor: '#0A0C14', borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: `${activeTheme.primary}22` }]}>
                <Download size={20} color={activeTheme.primary} />
              </View>
              <View>
                <Text style={styles.title}>Download Audio</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {currentTrack?.name || 'Select audio track'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </View>

          {/* Interactive Audio Frequency Graph Cutter */}
          <View style={styles.cutterSection}>
            <AudioWaveformCutter
              track={currentTrack}
              height={260}
              onApply={(s, e) => {
                setSelectedStart(s);
                setSelectedEnd(e);
              }}
            />
          </View>

          {/* Dual Action Buttons: Download Full vs Download Cut Version */}
          <View style={styles.actionsContainer}>
            {/* 1. Download Cut Version Button */}
            <TouchableOpacity
              onPress={handleDownloadCut}
              disabled={downloadMode !== null}
              style={[
                styles.cutDownloadBtn,
                {
                  backgroundColor: activeTheme.primary,
                  shadowColor: activeTheme.primary,
                },
              ]}
              activeOpacity={0.85}
            >
              {downloadMode === 'cut' ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <View style={styles.btnIconWrap}>
                    <Scissors size={18} color="#000000" strokeWidth={2.5} />
                  </View>
                  <View style={styles.btnTextCol}>
                    <Text style={styles.primaryBtnTitle}>
                      Download Cut Version ({snippetDuration}s)
                    </Text>
                    <Text style={styles.primaryBtnSub}>
                      {formatTime(selectedStart)} to {formatTime(selectedEnd)} • {preferredQuality} Ringtone
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* 2. Download Full Song Button */}
            <TouchableOpacity
              onPress={handleDownloadFull}
              disabled={downloadMode !== null}
              style={styles.fullDownloadBtn}
              activeOpacity={0.8}
            >
              {downloadMode === 'full' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Music size={17} color="#FFFFFF" />
                  <Text style={styles.secondaryBtnTitle}>
                    Download Full Song ({formatTime(totalDurationSec)})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dismissArea: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    elevation: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutterSection: {
    width: '100%',
    marginVertical: 4,
  },
  actionsContainer: {
    marginTop: 10,
    gap: 10,
  },
  cutDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    gap: 10,
  },
  btnIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextCol: {
    alignItems: 'flex-start',
  },
  primaryBtnTitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryBtnSub: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  fullDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 8,
  },
  secondaryBtnTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
