// Auto-Scrolling Real-Time Karaoke Synced Lyrics View

import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Mic2 } from 'lucide-react-native';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAppTheme, getEngineTheme } from '../../theme';
import { LyricLine } from '../../types/music';

export const SyncedLyricsView: React.FC = React.memo(() => {
  const currentEngine = usePlayerStore((s) => s.currentTrack?.sourceEngine);
  const lyrics = usePlayerStore((s) => s.lyrics);
  const plainLyrics = usePlayerStore((s) => s.plainLyrics);
  const activeLyricIndex = usePlayerStore((s) => s.activeLyricIndex);

  const { colors: defaultColors } = useAppTheme();
  const activeTheme = currentEngine ? getEngineTheme(currentEngine) : defaultColors;
  const flatListRef = useRef<FlatList<LyricLine>>(null);

  useEffect(() => {
    if (activeLyricIndex >= 0 && flatListRef.current && lyrics.length > 0) {
      try {
        flatListRef.current.scrollToIndex({
          index: Math.max(0, activeLyricIndex - 2),
          animated: true,
        });
      } catch (e) {
        // index might be out of range temporarily
      }
    }
  }, [activeLyricIndex, lyrics]);

  if (lyrics.length === 0 && plainLyrics) {
    return (
      <View style={styles.plainContainer}>
        <Text style={[styles.plainText, { color: activeTheme.text }]}>{plainLyrics}</Text>
      </View>
    );
  }

  if (lyrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Mic2 size={36} color={activeTheme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: activeTheme.text }]}>No Synced Lyrics Found</Text>
        <Text style={[styles.emptySubtitle, { color: activeTheme.textMuted }]}>
          Sing along with your heart! We are resolving lyrics across LrcLib and Cloudflare providers.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={lyrics}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item, index }) => {
          const isActive = index === activeLyricIndex;
          const isPassed = index < activeLyricIndex;

          return (
            <TouchableOpacity
              style={styles.lineWrapper}
              onPress={() => usePlayerStore.getState().seekTo(item.timeMs)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.lyricLine,
                  {
                    color: isActive
                      ? activeTheme.primary
                      : isPassed
                      ? defaultColors.textSecondary
                      : defaultColors.textMuted,
                    fontSize: isActive ? 22 : 18,
                    fontWeight: isActive ? '800' : '600',
                    opacity: isActive ? 1 : isPassed ? 0.6 : 0.35,
                    transform: [{ scale: isActive ? 1.05 : 1 }],
                  },
                ]}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingVertical: 120,
  },
  lineWrapper: {
    marginVertical: 10,
    alignItems: 'center',
  },
  lyricLine: {
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  plainContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
