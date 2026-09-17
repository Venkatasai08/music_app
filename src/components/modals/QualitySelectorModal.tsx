// Audio Quality / Bitrate Selector Modal

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, X, Sparkles } from 'lucide-react-native';
import { AudioQuality } from '../../types/music';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAppTheme } from '../../theme';

interface QualitySelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUALITY_OPTIONS: { quality: AudioQuality; label: string; desc: string }[] = [
  { quality: '320kbps', label: '320 kbps (Ultra HD)', desc: 'Lossless AAC audio for audiophiles' },
  { quality: '160kbps', label: '160 kbps (High Quality)', desc: 'Balanced fidelity and bandwidth' },
  { quality: '96kbps', label: '96 kbps (Medium)', desc: 'Ideal for standard cellular data' },
  { quality: '48kbps', label: '48 kbps (Data Saver)', desc: 'Ultra-low data consumption' },
  { quality: '12kbps', label: '12 kbps (Ultra Lite)', desc: 'Extreme low-bandwidth voice quality' },
];

export const QualitySelectorModal: React.FC<QualitySelectorModalProps> = React.memo(({
  visible,
  onClose,
}) => {
  const preferredQuality = usePlayerStore((s) => s.preferredQuality);
  const { colors, radius } = useAppTheme();

  const handleSelect = (quality: AudioQuality) => {
    usePlayerStore.getState().setPreferredQuality(quality);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.cardBorder,
              borderRadius: radius.lg,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Audio Streaming Quality</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {QUALITY_OPTIONS.map((item) => {
              const isSelected = preferredQuality === item.quality;

              return (
                <TouchableOpacity
                  key={item.quality}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'transparent',
                      borderColor: isSelected ? colors.primary : 'transparent',
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={() => handleSelect(item.quality)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionInfo}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      {item.desc}
                    </Text>
                  </View>

                  {isSelected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
  },
  optionInfo: {
    flex: 1,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
});
