import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Radio, Play, Pause } from 'lucide-react-native';
import { LiveRadioStation } from '../../types/music';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAppTheme } from '../../theme';
import { Badge } from '../common/Badge';
import { extractString } from '../../utils/audioUtils';

interface RadioCardProps {
  radio: LiveRadioStation;
}

export const RadioCard: React.FC<RadioCardProps> = React.memo(({ radio }) => {
  const { colors, radius } = useAppTheme();
  const isCurrent = usePlayerStore((s) => s.currentRadio?.id === radio.id);
  const isThisPlaying = usePlayerStore((s) => s.isPlaying && s.currentRadio?.id === radio.id);
  const radioName = extractString(radio.name, 'Live Radio');

  const handlePress = React.useCallback(() => {
    if (isCurrent) {
      usePlayerStore.getState().togglePlayPause();
    } else {
      usePlayerStore.getState().playRadio(radio);
    }
  }, [isCurrent, radio]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.cardGlass,
          borderColor: isCurrent ? colors.primary : colors.cardBorder,
          borderRadius: radius.md,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Radio Logo / Icon */}
      <View style={[styles.logoContainer, { borderRadius: radius.sm }]}>
        {radio.favicon ? (
          <Image source={{ uri: radio.favicon }} style={styles.logo} />
        ) : (
          <Radio size={24} color={colors.primary} />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {radioName}
          </Text>
        </View>

        <View style={styles.tagRow}>
          <Badge label="LIVE" variant="live" />
          {radio.countryCode ? (
            <Badge label={radio.countryCode} variant="outline" />
          ) : null}
          {radio.tags && radio.tags[0] ? (
            <Badge label={radio.tags[0]} variant="outline" />
          ) : null}
        </View>
      </View>

      {/* Play/Pause Button */}
      <View
        style={[
          styles.playBtn,
          {
            backgroundColor: isCurrent ? colors.primary : 'rgba(255, 255, 255, 0.1)',
            borderRadius: radius.full,
          },
        ]}
      >
        {isThisPlaying ? (
          <Pause size={16} color={isCurrent ? '#070B14' : colors.text} />
        ) : (
          <Play size={16} color={isCurrent ? '#070B14' : colors.text} />
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  logoContainer: {
    width: 46,
    height: 46,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
