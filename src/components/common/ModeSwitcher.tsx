// Interactive 3-Way Mode Switcher Toggle (ListenFree <-> Freefy <-> TuneFree)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Sparkles, Flame } from 'lucide-react-native';
import { useEngineStore } from '../../stores/useEngineStore';
import { useAppTheme } from '../../theme';

export const ModeSwitcher: React.FC = () => {
  const { activeEngine, setEngine } = useEngineStore();
  const { colors, radius } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderColor: colors.border }]}>
      {/* 1. ListenFree Option */}
      <TouchableOpacity
        style={[styles.segment, activeEngine === 'listen_free' && styles.activeSegment]}
        onPress={() => setEngine('listen_free')}
        activeOpacity={0.8}
      >
        {activeEngine === 'listen_free' ? (
          <LinearGradient
            colors={['#00D2FF', '#007AFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.activeGradient, { borderRadius: radius.full }]}
          >
            <Sparkles size={12} color="#070B14" strokeWidth={2.5} />
            <Text numberOfLines={1} style={[styles.activeText, { color: '#070B14' }]}>ListenFree</Text>
          </LinearGradient>
        ) : (
          <View style={styles.inactiveContent}>
            <Sparkles size={12} color={colors.textSecondary} />
            <Text numberOfLines={1} style={[styles.inactiveText, { color: colors.textSecondary }]}>ListenFree</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Freefy Option */}
      <TouchableOpacity
        style={[styles.segment, activeEngine === 'freefy' && styles.activeSegment]}
        onPress={() => setEngine('freefy')}
        activeOpacity={0.8}
      >
        {activeEngine === 'freefy' ? (
          <LinearGradient
            colors={['#00E676', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.activeGradient, { borderRadius: radius.full }]}
          >
            <Zap size={12} color="#060E0A" strokeWidth={2.5} />
            <Text numberOfLines={1} style={[styles.activeText, { color: '#060E0A' }]}>Freefy</Text>
          </LinearGradient>
        ) : (
          <View style={styles.inactiveContent}>
            <Zap size={12} color={colors.textSecondary} />
            <Text numberOfLines={1} style={[styles.inactiveText, { color: colors.textSecondary }]}>Freefy</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 3. TuneFree Option */}
      <TouchableOpacity
        style={[styles.segment, activeEngine === 'tune_free' && styles.activeSegment]}
        onPress={() => setEngine('tune_free')}
        activeOpacity={0.8}
      >
        {activeEngine === 'tune_free' ? (
          <LinearGradient
            colors={['#FF3B6D', '#FF4757']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.activeGradient, { borderRadius: radius.full }]}
          >
            <Flame size={12} color="#FFFFFF" strokeWidth={2.5} />
            <Text numberOfLines={1} style={[styles.activeText, { color: '#FFFFFF' }]}>TuneFree</Text>
          </LinearGradient>
        ) : (
          <View style={styles.inactiveContent}>
            <Flame size={12} color={colors.textSecondary} />
            <Text numberOfLines={1} style={[styles.inactiveText, { color: colors.textSecondary }]}>TuneFree</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2.5,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
  },
  segment: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  activeSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  activeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
    gap: 4,
  },
  inactiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  inactiveText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

