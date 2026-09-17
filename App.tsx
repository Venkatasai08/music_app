// Root Application Entry with Dual-Engine Dynamic Theming & Navigation
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, BackHandler } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './src/components/common/Header';
import { BottomTabBar } from './src/navigation/BottomTabBar';
import { MiniPlayer } from './src/components/player/MiniPlayer';
import { PlayerScreen } from './src/components/player/FullPlayerModal';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { MyMusicScreen } from './src/screens/MyMusicScreen';
import { SongOptionsModal } from './src/components/modals/SongOptionsModal';
import { useSongOptionsStore } from './src/stores/useSongOptionsStore';
import { useEngineStore } from './src/stores/useEngineStore';
import { useLibraryStore } from './src/stores/useLibraryStore';
import { usePlayerStore } from './src/stores/usePlayerStore';
import { useAppTheme } from './src/theme';
import { MainTabType, DetailScreenParams } from './src/types/engine';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTabType>('home');
  const [detailParams, setDetailParams] = useState<DetailScreenParams | null>(null);

  const isFullPlayerVisible = usePlayerStore((s) => s.isFullPlayerVisible);
  const setFullPlayerVisible = usePlayerStore((s) => s.setFullPlayerVisible);
  const loadSavedPlayRanges = usePlayerStore((s) => s.loadSavedPlayRanges);
  const loadSavedEngine = useEngineStore((s) => s.loadSavedEngine);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const { colors } = useAppTheme();

  useEffect(() => {
    loadSavedEngine();
    loadLibrary();
    loadSavedPlayRanges();
  }, []);

  const isSongOptionsOpen = useSongOptionsStore((s) => s.isOpen);
  const closeSongOptions = useSongOptionsStore((s) => s.closeSongOptions);

  // Hardware Back Button handling on Android
  useEffect(() => {
    const onBackPress = () => {
      if (isSongOptionsOpen) {
        closeSongOptions();
        return true;
      }
      if (isFullPlayerVisible) {
        setFullPlayerVisible(false);
        return true;
      }
      if (detailParams) {
        setDetailParams(null);
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [detailParams, isFullPlayerVisible, activeTab, isSongOptionsOpen]);

  const handleNavigateDetail = (params: DetailScreenParams) => {
    setDetailParams(params);
  };

  const handleBackFromDetail = () => {
    setDetailParams(null);
  };

  const handleSearchShortcut = () => {
    setDetailParams(null);
    setActiveTab('search');
  };

  // When Fullscreen Player is active, render as dedicated screen (no header, no bottom bar)
  if (isFullPlayerVisible) {
    return (
      <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
          translucent={false}
        />
        <PlayerScreen onBack={() => setFullPlayerVisible(false)} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.rootContainer,
        { backgroundColor: colors.background, paddingTop: detailParams ? 0 : insets.top },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent={false}
      />

      {/* Global Top Header with Switcher (hidden when in detail view) */}
      {!detailParams && <Header onSearchPress={handleSearchShortcut} />}

      {/* Screen Switcher */}
      <View style={styles.screenContainer}>
        {detailParams ? (
          <DetailScreen params={detailParams} onBack={handleBackFromDetail} />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                onNavigateDetail={handleNavigateDetail}
                onSearchPress={handleSearchShortcut}
              />
            )}
            {activeTab === 'search' && <SearchScreen onNavigateDetail={handleNavigateDetail} />}
            {activeTab === 'explore' && <ExploreScreen onNavigateDetail={handleNavigateDetail} />}
            {activeTab === 'artist' && <ExploreScreen onNavigateDetail={handleNavigateDetail} />}
            {activeTab === 'playlist' && <PlaylistScreen onNavigateDetail={handleNavigateDetail} />}
            {activeTab === 'library' && <MyMusicScreen />}
          </>
        )}
      </View>

      {/* Floating MiniPlayer */}
      <MiniPlayer hasBottomTabBar={!detailParams} />

      {/* Bottom Tab Bar (hidden when in detail view) */}
      {!detailParams && (
        <BottomTabBar
          activeTab={activeTab}
          onTabPress={(tab) => {
            setDetailParams(null);
            setActiveTab(tab);
          }}
        />
      )}

      {/* Global Song Options Bottom Sheet */}
      <SongOptionsModal onNavigateDetail={handleNavigateDetail} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});
