import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme } from '../../theme';
import { extractString } from '../../utils/audioUtils';

interface BadgeProps {
  label: any;
  variant?: 'primary' | 'live' | 'quality' | 'outline';
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', style }) => {
  const { colors, radius } = useAppTheme();
  const safeLabel = extractString(label, '');

  let bg = colors.badgeBg;
  let textCol = colors.primary;
  let borderColor = colors.cardBorder;

  if (variant === 'live') {
    bg = 'rgba(239, 68, 68, 0.2)';
    textCol = '#EF4444';
    borderColor = 'rgba(239, 68, 68, 0.4)';
  } else if (variant === 'quality') {
    bg = 'rgba(255, 255, 255, 0.1)';
    textCol = '#FFFFFF';
    borderColor = 'rgba(255, 255, 255, 0.2)';
  } else if (variant === 'outline') {
    bg = 'transparent';
    textCol = colors.textSecondary;
    borderColor = colors.border;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: radius.xs,
        },
        style,
      ]}
    >
      {variant === 'live' && <View style={styles.liveDot} />}
      <Text style={[styles.text, { color: textCol }]}>{safeLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
