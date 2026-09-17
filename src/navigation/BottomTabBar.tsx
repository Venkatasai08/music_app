import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Compass, Library, Users, ListMusic } from 'lucide-react-native';
import { MainTabType } from '../types/engine';
import { useAppTheme } from '../theme';

interface BottomTabBarProps {
  activeTab: MainTabType;
  onTabPress: (tab: MainTabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const { colors, radius } = useAppTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
        style={[
          styles.dockContainer,
          {
            backgroundColor: 'rgba(17, 18, 26, 0.94)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: radius.dock,
          },
        ]}
      >
        {/* Tab 1: Browser */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress('explore')}
          activeOpacity={0.7}
        >
          <Compass
            size={20}
            color={activeTab === 'explore' ? colors.primary : '#8E8E93'}
            strokeWidth={activeTab === 'explore' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'explore' ? colors.primary : '#8E8E93',
                fontWeight: activeTab === 'explore' ? '700' : '500',
              },
            ]}
          >
            Browser
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Artist */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress('artist')}
          activeOpacity={0.7}
        >
          <Users
            size={20}
            color={activeTab === 'artist' ? colors.primary : '#8E8E93'}
            strokeWidth={activeTab === 'artist' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'artist' ? colors.primary : '#8E8E93',
                fontWeight: activeTab === 'artist' ? '700' : '500',
              },
            ]}
          >
            Artist
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Center Elevated Glowing FAB (Home) */}
        <View style={styles.centerFabAnchor}>
          <TouchableOpacity
            style={[styles.centerFabBtn, { shadowColor: colors.primary }]}
            onPress={() => onTabPress('home')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerFabGradient}
            >
              <Home size={24} color="#FFFFFF" strokeWidth={2.4} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab 4: Playlist */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress('playlist')}
          activeOpacity={0.7}
        >
          <ListMusic
            size={20}
            color={activeTab === 'playlist' ? colors.primary : '#8E8E93'}
            strokeWidth={activeTab === 'playlist' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'playlist' ? colors.primary : '#8E8E93',
                fontWeight: activeTab === 'playlist' ? '700' : '500',
              },
            ]}
          >
            Playlist
          </Text>
        </TouchableOpacity>

        {/* Tab 5: My Music */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress('library')}
          activeOpacity={0.7}
        >
          <Library
            size={20}
            color={activeTab === 'library' ? colors.primary : '#8E8E93'}
            strokeWidth={activeTab === 'library' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'library' ? colors.primary : '#8E8E93',
                fontWeight: activeTab === 'library' ? '700' : '500',
              },
            ]}
          >
            My Music
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 64,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: -0.1,
  },
  centerFabAnchor: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerFabBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    shadowColor: '#FF3B6D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
  centerFabGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
