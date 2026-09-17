// Theme-Adaptive Action Button

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { colors, radius, isListenFree } = useAppTheme();

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const gradientColors: [string, string] = isListenFree
    ? ['#00F2FE', '#4FACFE']
    : ['#10B981', '#059669'];

  const textColor = isPrimary
    ? isListenFree
      ? '#070B14'
      : '#FFFFFF'
    : isOutline || isSecondary
    ? colors.text
    : colors.primary;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
        </>
      )}
    </>
  );

  if (isPrimary) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.btnWrapper, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradient,
            styles[size],
            { borderRadius: radius.full, opacity: disabled ? 0.5 : 1 },
          ]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.btn,
        styles[size],
        {
          borderRadius: radius.full,
          backgroundColor: isSecondary ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          borderColor: isOutline ? colors.border : 'transparent',
          borderWidth: isOutline ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  btnWrapper: {
    borderRadius: 999,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  md: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
