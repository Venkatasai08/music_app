import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Settings, Bell, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { ModeSwitcher } from './ModeSwitcher';
import { useAppTheme } from '../../theme';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface HeaderProps {
  onSearchPress?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = React.memo(({ onSearchPress, title = 'Music sfgs Player' }) => {
  const { colors } = useAppTheme();
  const isPlayRangeEnabled = usePlayerStore((s) => s.isPlayRangeEnabled);
  const togglePlayRangeMode = usePlayerStore((s) => s.togglePlayRangeMode);

  return (
    <View style={styles.headerContainer}>
      {/* Top row: Screen Title ("Discover") + Action Pills */}
      <View style={styles.topRow}>
        <View style={styles.titleSection}>``
          <Text style={styles.screenTitle}>{title}</Text>
        </View>

        {/* Action Buttons: Engine Mode Switcher + Play Range Toggle + Settings + Bell */}
        <View style={styles.rightActionsRow}>
          {/* Quick Play Range Mode Toggle Button */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              isPlayRangeEnabled && {
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}25`,
              },
            ]}
            onPress={() => togglePlayRangeMode()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <SlidersHorizontal
              size={17}
              color={isPlayRangeEnabled ? colors.primary : 'rgba(255, 255, 255, 0.75)'}
            />
          </TouchableOpacity>

          {/* Settings Icon */}
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Settings size={18} color="rgba(255, 255, 255, 0.85)" />
          </TouchableOpacity>

          {/* Notifications Icon with Accent Dot */}
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Bell size={18} color="rgba(255, 255, 255, 0.85)" />
            <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Engine Switcher Bar */}
      <View style={styles.switcherRow}>
        <ModeSwitcher />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#090A0F',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rangeBtnActive: {
    borderColor: '#FF3B6D',
    backgroundColor: 'rgba(255, 59, 109, 0.18)',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF3B6D',
  },
  switcherRow: {
    marginTop: 10,
  },
});
