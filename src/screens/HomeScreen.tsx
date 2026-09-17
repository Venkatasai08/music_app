// Glassmorphic Multi-Engine Continuous Discovery Feed
// Features: Square Trending PageView, Multi-Language Top Charts Horizontal Swiper,
// Viral Trends, Live Radios, Albums Carousel, Artist Circles & Video Previews

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  Pause,
  Sparkles,
  Flame,
  Radio,
  Video,
  Disc3,
  Star,
  Trophy,
  Users,
  ListMusic,
  Globe2,
  Headphones,
} from 'lucide-react-native';
import { useEngineStore } from '../stores/useEngineStore';
import { useListenFreeStore, LanguageCategory } from '../stores/useListenFreeStore';
import { useFreefyStore } from '../stores/useFreefyStore';
import { useTuneFreeStore, TUNEFREE_GENRES } from '../stores/useTuneFreeStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useAppTheme } from '../theme';
import { TrackCard } from '../components/cards/TrackCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ArtistCard } from '../components/cards/ArtistCard';
import { RadioCard } from '../components/cards/RadioCard';
import { VideoPreviewCard } from '../components/cards/VideoPreviewCard';
import { TrackArtwork } from '../components/common/TrackArtwork';
import { Skeleton } from '../components/common/Skeleton';
import { DetailScreenParams } from '../types/engine';
import { Track } from '../types/music';

interface HomeScreenProps {
  onNavigateDetail: (params: DetailScreenParams) => void;
  onSearchPress?: () => void;
}

const { width } = Dimensions.get('window');
const SQUARE_HERO_SIZE = Math.min(width - 40, 360);
const HITS_PAGE_WIDTH = width - 40;
const CHART_PAGE_WIDTH = width - 36;

const LANGUAGES: { key: LanguageCategory; label: string }[] = [
  { key: 'all', label: 'All Hits' },
  { key: 'hindi', label: 'Hindi' },
  { key: 'english', label: 'English' },
  { key: 'telugu', label: 'Telugu' },
  { key: 'tamil', label: 'Tamil' },
  { key: 'punjabi', label: 'Punjabi' },
];

// ================= 1. SQUARE-SHAPED TRENDING HERO CAROUSEL =================
interface SquareHeroPageViewProps {
  tracks: Track[];
  queue: Track[];
  colors: any;
  currentTrackId?: string;
  isAudioPlaying?: boolean;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onTogglePlayPause: () => void;
}

const SquareHeroPageView: React.FC<SquareHeroPageViewProps> = React.memo(({
  tracks,
  queue,
  colors,
  currentTrackId,
  isAudioPlaying,
  onPlayTrack,
  onTogglePlayPause,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const displayTracks = tracks.slice(0, 6);

  if (displayTracks.length === 0) return null;

  return (
    <View style={styles.squareHeroContainer}>
      <FlatList
        horizontal
        data={displayTracks}
        keyExtractor={(item, index) => `hero-${item.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        snapToInterval={SQUARE_HERO_SIZE + 14}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.squareHeroScrollContent}
        getItemLayout={(_, index) => ({
          length: SQUARE_HERO_SIZE + 14,
          offset: (SQUARE_HERO_SIZE + 14) * index,
          index,
        })}
        onScroll={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const idx = Math.round(offsetX / (SQUARE_HERO_SIZE + 14));
          const clamped = Math.max(0, Math.min(displayTracks.length - 1, idx));
          if (clamped !== activeIndex) {
            setActiveIndex(clamped);
          }
        }}
        scrollEventThrottle={16}
        renderItem={({ item: track, index }) => {
          const isThisTrackPlaying = isAudioPlaying && currentTrackId === track.id;
          const isThisCurrent = currentTrackId === track.id;

          return (
            <View
              style={[
                styles.squareHeroCard,
                {
                  width: SQUARE_HERO_SIZE,
                  height: SQUARE_HERO_SIZE,
                  borderColor: isThisCurrent ? colors.primary : 'rgba(255, 255, 255, 0.12)',
                },
              ]}
            >
              <TouchableOpacity
                style={styles.squareHeroTouchable}
                onPress={() => {
                  if (isThisCurrent) {
                    onTogglePlayPause();
                  } else {
                    onPlayTrack(track, queue);
                  }
                }}
                activeOpacity={0.9}
              >
                {/* 1:1 Square Cover Artwork */}
                <TrackArtwork
                  imageUri={track.image || track.thumbnailImage}
                  title={track.name}
                  artist={track.artist}
                  size={SQUARE_HERO_SIZE}
                  borderRadius={26}
                  style={styles.squareHeroArtwork}
                />

                {/* Watermark Song Title */}
                <View style={styles.heroWatermarkContainer}>
                  <Text numberOfLines={1} style={styles.squareHeroWatermarkText}>
                    {(track.name || '').toUpperCase()}
                  </Text>
                </View>

                {/* Multi-Stop Cinematic Gradient Overlay */}
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0.25)', 'transparent', 'rgba(9, 10, 15, 0.7)', '#090A0F']}
                  locations={[0, 0.35, 0.65, 1]}
                  style={styles.heroGradientOverlay}
                />

                {/* Top Badge Row */}
                <View style={styles.squareHeroTopRow}>
                  <View style={[styles.squareTrendingBadge, { borderColor: `${colors.primary}55` }]}>
                    <Flame size={12} color={colors.primary} />
                    <Text style={[styles.squareTrendingBadgeText, { color: colors.primary }]}>
                      TRENDING #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.squareAudioBadge}>
                    <Text style={styles.squareAudioBadgeText}>320K LOSSLESS</Text>
                  </View>
                </View>

                {/* Bottom Song Info & Glowing Play Button */}
                <View style={styles.squareHeroBottom}>
                  <View style={styles.heroCardTextCol}>
                    <Text numberOfLines={1} style={styles.squareHeroTitle}>
                      {track.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.squareHeroSubtitle}>
                      Song by {track.artist}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.heroPlayCircle, { shadowColor: colors.primary }]}
                    onPress={() => {
                      if (isThisCurrent) {
                        onTogglePlayPause();
                      } else {
                        onPlayTrack(track, queue);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={colors.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroPlayGradient}
                    >
                      {isThisTrackPlaying ? (
                        <Pause size={20} color="#FFFFFF" fill="#FFFFFF" />
                      ) : (
                        <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Pagination Indicator Dots */}
      {displayTracks.length > 1 && (
        <View style={styles.paginationDotsContainer}>
          {displayTracks.map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <View
                key={`hero-dot-${i}`}
                style={[
                  styles.paginationDot,
                  isActive
                    ? [styles.paginationDotActive, { backgroundColor: colors.primary, width: 22 }]
                    : styles.paginationDotInactive,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
});

// ================= 2. MULTI-LANGUAGE TOP CHARTS HORIZONTAL PAGEVIEW SWIPER =================
interface MultiLanguageTopChartsProps {
  languageCharts: Record<LanguageCategory, Track[]>;
  colors: any;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onLanguageSelect?: (lang: LanguageCategory) => void;
}

const MultiLanguageTopCharts: React.FC<MultiLanguageTopChartsProps> = React.memo(({
  languageCharts,
  colors,
  onPlayTrack,
  onLanguageSelect,
}) => {
  const [selectedLangIndex, setSelectedLangIndex] = useState(0);
  const pagerRef = useRef<FlatList>(null);
  const tabsScrollRef = useRef<ScrollView>(null);

  const handleTabPress = (idx: number) => {
    setSelectedLangIndex(idx);
    pagerRef.current?.scrollToOffset({ offset: idx * (CHART_PAGE_WIDTH + 14), animated: true });
    tabsScrollRef.current?.scrollTo({ x: Math.max(0, idx * 80 - 40), animated: true });
    if (onLanguageSelect) {
      onLanguageSelect(LANGUAGES[idx].key);
    }
  };

  return (
    <View style={styles.chartsSectionContainer}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Trophy size={20} color="#FBBF24" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Charts</Text>
          <Text style={[styles.countBadge, { color: '#FBBF24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
            {LANGUAGES[selectedLangIndex].label}
          </Text>
        </View>
      </View>

      {/* Horizontal Language Selection Tabs */}
      <ScrollView
        ref={tabsScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.langTabsScrollContent}
      >
        {LANGUAGES.map((lang, idx) => {
          const isActive = idx === selectedLangIndex;
          return (
            <TouchableOpacity
              key={`lang-tab-${lang.key}`}
              style={[
                styles.langTabPill,
                isActive && [
                  styles.langTabPillActive,
                  { backgroundColor: `${colors.primary}25`, borderColor: colors.primary },
                ],
              ]}
              onPress={() => handleTabPress(idx)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langTabText,
                  { color: isActive ? colors.primary : 'rgba(255, 255, 255, 0.55)' },
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Horizontal Swipeable Multi-Language Tracklists */}
      <FlatList
        ref={pagerRef}
        horizontal
        data={LANGUAGES}
        keyExtractor={(item) => `chart-page-${item.key}`}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        snapToInterval={CHART_PAGE_WIDTH + 14}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.chartPagesScrollContent}
        getItemLayout={(_, index) => ({
          length: CHART_PAGE_WIDTH + 14,
          offset: (CHART_PAGE_WIDTH + 14) * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const idx = Math.round(offsetX / (CHART_PAGE_WIDTH + 14));
          const clamped = Math.max(0, Math.min(LANGUAGES.length - 1, idx));
          if (clamped !== selectedLangIndex) {
            setSelectedLangIndex(clamped);
            tabsScrollRef.current?.scrollTo({ x: Math.max(0, clamped * 80 - 40), animated: true });
            if (onLanguageSelect) {
              onLanguageSelect(LANGUAGES[clamped].key);
            }
          }
        }}
        onScroll={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const idx = Math.round(offsetX / (CHART_PAGE_WIDTH + 14));
          const clamped = Math.max(0, Math.min(LANGUAGES.length - 1, idx));
          if (clamped !== selectedLangIndex) {
            setSelectedLangIndex(clamped);
            tabsScrollRef.current?.scrollTo({ x: Math.max(0, clamped * 80 - 40), animated: true });
            if (onLanguageSelect) {
              onLanguageSelect(LANGUAGES[clamped].key);
            }
          }
        }}
        scrollEventThrottle={16}
        renderItem={({ item: lang }) => {
          const tracks = (languageCharts && languageCharts[lang.key as LanguageCategory]) || [];
          const displayList = tracks.slice(0, 5);

          return (
            <View
              style={[
                styles.chartPageCard,
                {
                  width: CHART_PAGE_WIDTH,
                  backgroundColor: 'rgba(18, 19, 28, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              {/* Card Header with Play All */}
              <View style={styles.chartCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Globe2 size={15} color={colors.primary} />
                  <Text style={styles.chartCardHeaderTitle}>{lang.label} Top Billboard</Text>
                  {tracks.length > 0 && (
                    <Text style={styles.chartTrackCountTag}>{tracks.length} Songs</Text>
                  )}
                </View>

                {tracks.length > 0 && (
                  <TouchableOpacity
                    onPress={() => onPlayTrack(tracks[0], tracks)}
                    style={[styles.chartPlayAllBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Play size={11} color="#070B14" fill="#070B14" />
                    <Text style={styles.chartPlayAllText}>Play All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Tracks with Top 5 Rank badging */}
              {displayList.length > 0 ? (
                displayList.map((track: Track, trackIdx: number) => (
                  <TrackCard
                    key={`chart-${lang.key}-${track.id}-${trackIdx}`}
                    track={track}
                    queueContext={tracks}
                    showIndex={trackIdx}
                  />
                ))
              ) : (
                <View style={styles.chartLoadingWrapper}>
                  <Skeleton width="100%" height={56} borderRadius={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="100%" height={56} borderRadius={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="100%" height={56} borderRadius={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="100%" height={56} borderRadius={14} />
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
});

// ================= 3. TRENDING TOP HITS 15-SONG PAGEVIEW =================
interface TrendingTopHitsPageViewProps {
  tracks: Track[];
  colors: any;
  onPlayTrack: (track: Track, queue: Track[]) => void;
}

const TrendingTopHitsPageView: React.FC<TrendingTopHitsPageViewProps> = React.memo(({
  tracks,
  colors,
  onPlayTrack,
}) => {
  const [activePageIndex, setActivePageIndex] = useState(0);

  const pages = useMemo(() => {
    const list = tracks.slice(0, 15);
    const chunks: { pageIndex: number; items: { track: Track; globalIndex: number }[] }[] = [];
    for (let i = 0; i < list.length; i += 3) {
      chunks.push({
        pageIndex: Math.floor(i / 3),
        items: list.slice(i, i + 3).map((track, subIdx) => ({
          track,
          globalIndex: i + subIdx,
        })),
      });
    }
    return chunks;
  }, [tracks]);

  if (tracks.length === 0) return null;

  return (
    <View style={styles.trendingHitsSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Flame size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Top Hits</Text>
          <Text style={[styles.countBadge, { color: colors.primary, backgroundColor: `${colors.primary}18` }]}>
            {tracks.length} Songs • Page {activePageIndex + 1}/{pages.length}
          </Text>
        </View>

        {tracks.length > 0 && (
          <TouchableOpacity
            onPress={() => onPlayTrack(tracks[0], tracks)}
            style={[styles.playAllBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Play size={12} color="#070B14" fill="#070B14" />
            <Text style={styles.playAllTextDark}>Play All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={pages}
        keyExtractor={(item) => `hits-page-${item.pageIndex}`}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        snapToInterval={HITS_PAGE_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.hitsPageScrollContent}
        getItemLayout={(_, index) => ({
          length: HITS_PAGE_WIDTH + 12,
          offset: (HITS_PAGE_WIDTH + 12) * index,
          index,
        })}
        onScroll={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const idx = Math.round(offsetX / (HITS_PAGE_WIDTH + 12));
          const clamped = Math.max(0, Math.min(pages.length - 1, idx));
          if (clamped !== activePageIndex) {
            setActivePageIndex(clamped);
          }
        }}
        scrollEventThrottle={16}
        renderItem={({ item: page }) => (
          <View
            style={[
              styles.hitsPageCard,
              {
                width: HITS_PAGE_WIDTH,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(18, 19, 28, 0.75)',
              },
            ]}
          >
            {page.items.map(({ track, globalIndex }) => (
              <TrackCard
                key={`${track.id}-${globalIndex}`}
                track={track}
                queueContext={tracks}
                showIndex={globalIndex}
              />
            ))}
          </View>
        )}
      />

      {pages.length > 1 && (
        <View style={styles.paginationDotsContainer}>
          {pages.map((_, i) => {
            const isActive = i === activePageIndex;
            return (
              <View
                key={`hits-dot-${i}`}
                style={[
                  styles.paginationDot,
                  isActive
                    ? [styles.paginationDotActive, { backgroundColor: colors.primary, width: 22 }]
                    : styles.paginationDotInactive,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
});

// ================= MAIN HOME SCREEN =================
export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateDetail }) => {
  const activeEngine = useEngineStore((s) => s.activeEngine);
  const { colors, isListenFree, isFreefy, isTuneFree } = useAppTheme();

  // ListenFree state
  const {
    trendingTracks,
    topHitsTracks,
    mostSearchedTracks,
    featuredAlbums,
    topArtists,
    featuredPlaylists,
    videoPreviews,
    languageCharts,
    isFeedLoading,
    fetchLanguageChart,
    fetchHomeFeed,
  } = useListenFreeStore();

  // Freefy state
  const {
    featuredTracks,
    featuredPlaylists: freefyPlaylists,
    featuredAlbums: freefyAlbums,
    topArtists: freefyArtists,
    liveRadios,
    isChannelLoading,
    fetchCuratedChannels,
  } = useFreefyStore();

  // TuneFree state
  const {
    popularArtists: tuneFreeArtists,
    newReleases: tuneFreeNewReleases,
    selectedGenre,
    genreTracks,
    isLoading: isTuneFreeLoading,
    fetchBrowseFeed: fetchTuneFreeFeed,
    selectGenre,
  } = useTuneFreeStore();

  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isAudioPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  useEffect(() => {
    if (isListenFree) {
      fetchHomeFeed();
    } else if (isFreefy) {
      fetchCuratedChannels();
    } else if (isTuneFree) {
      fetchTuneFreeFeed();
    }
  }, [activeEngine]);

  const handleRefresh = async () => {
    if (isListenFree) {
      await fetchHomeFeed(true);
    } else if (isFreefy) {
      await fetchCuratedChannels();
    } else if (isTuneFree) {
      await fetchTuneFreeFeed();
    }
  };

  const handlePlayTrack = (track: Track, queue: Track[]) => {
    playTrack(track, queue);
  };

  const isLoading = isListenFree ? isFeedLoading : isFreefy ? isChannelLoading : isTuneFreeLoading;

  // Flattened new releases for TuneFree
  const flattenedTuneFreeTracks: Track[] = useMemo(() => {
    if (!tuneFreeNewReleases || tuneFreeNewReleases.length === 0) return [];
    const list: Track[] = [];
    tuneFreeNewReleases.forEach((sec) => {
      if (sec.items) {
        list.push(...sec.items);
      }
    });
    return list;
  }, [tuneFreeNewReleases]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* ========================================================= */}
      {/* 1. LISTEN FREE CONTINUOUS DISCOVERY STREAM                */}
      {/* ========================================================= */}
      {isListenFree && (
        <View style={styles.engineContentWrapper}>
          {/* A. Square Trending Hero PageView */}
          <SquareHeroPageView
            tracks={trendingTracks}
            queue={trendingTracks}
            colors={colors}
            currentTrackId={currentTrack?.id}
            isAudioPlaying={isAudioPlaying}
            onPlayTrack={handlePlayTrack}
            onTogglePlayPause={togglePlayPause}
          />

          {/* B. Multi-Language Top Charts Horizontal Swiper */}
          <MultiLanguageTopCharts
            languageCharts={languageCharts}
            colors={colors}
            onPlayTrack={handlePlayTrack}
            onLanguageSelect={(lang) => fetchLanguageChart(lang)}
          />

          {/* C. Trending Top Hits 15-Song PageView */}
          <TrendingTopHitsPageView
            tracks={topHitsTracks}
            colors={colors}
            onPlayTrack={handlePlayTrack}
          />

          {/* D. Viral Hits & Explosive Trends */}
          {mostSearchedTracks.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Viral Hits & Trends</Text>
                  <Text style={[styles.countBadge, { color: colors.primary, backgroundColor: `${colors.primary}18` }]}>
                    {mostSearchedTracks.length} Hits
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handlePlayTrack(mostSearchedTracks[0], mostSearchedTracks)}
                  style={[styles.playAllBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Play size={12} color="#070B14" fill="#070B14" />
                  <Text style={styles.playAllTextDark}>Play All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {mostSearchedTracks.slice(0, 10).map((track, idx) => (
                  <TouchableOpacity
                    key={`viral-${track.id}-${idx}`}
                    style={[styles.viralTrackCard, { borderColor: 'rgba(255, 255, 255, 0.08)' }]}
                    onPress={() => handlePlayTrack(track, mostSearchedTracks)}
                    activeOpacity={0.8}
                  >
                    <TrackArtwork
                      imageUri={track.image || track.thumbnailImage}
                      title={track.name}
                      artist={track.artist}
                      size={135}
                      borderRadius={18}
                    />
                    <Text numberOfLines={1} style={styles.viralTitle}>
                      {track.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.viralArtist}>
                      {track.artist}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* E. Blockbuster Albums & Soundtracks */}
          {featuredAlbums.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Disc3 size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Albums & Soundtracks</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {featuredAlbums.map((album) => (
                  <AlbumCard
                    key={`alb-${album.id}`}
                    album={album}
                    onPress={(a) =>
                      onNavigateDetail({
                        type: 'album',
                        id: a.id,
                        title: a.name,
                        subtitle: a.artist,
                        image: a.image,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* F. Artist Spotlight & Top Stars */}
          {topArtists.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Star size={20} color="#EC4899" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Artists & Icons</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {topArtists.map((artist) => (
                  <ArtistCard
                    key={`art-${artist.id}`}
                    artist={artist}
                    onPress={(a) =>
                      onNavigateDetail({
                        type: 'artist',
                        id: a.id,
                        title: a.name,
                        image: a.image,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* G. Curated Mixes & Playlists */}
          {featuredPlaylists.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <ListMusic size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Curated Mixes & Playlists</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {featuredPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={`pl-${playlist.id}`}
                    style={[styles.playlistCard, { borderColor: 'rgba(255, 255, 255, 0.08)' }]}
                    onPress={() =>
                      onNavigateDetail({
                        type: 'playlist',
                        id: playlist.id,
                        title: playlist.name,
                        subtitle: playlist.description,
                        image: playlist.image,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <TrackArtwork
                      imageUri={playlist.image}
                      title={playlist.name}
                      size={135}
                      borderRadius={18}
                    />
                    <Text numberOfLines={1} style={styles.playlistName}>
                      {playlist.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.playlistDesc}>
                      {playlist.trackCount ? `${playlist.trackCount} Tracks` : 'Curated Collection'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* H. Music Videos & Visual Previews */}
          {videoPreviews.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Video size={20} color="#06B6D4" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Music Videos & Reels</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {videoPreviews.map((video) => (
                  <VideoPreviewCard
                    key={`vid-${video.id}`}
                    video={video}
                    onPress={() =>
                      handlePlayTrack(
                        {
                          id: video.songId || video.id,
                          name: video.title,
                          artist: video.artist,
                          duration: video.duration || 210,
                          image: video.thumbnailUrl,
                          streamUrl: video.videoUrl,
                          sourceEngine: 'listen_free',
                        },
                        trendingTracks
                      )
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ========================================================= */}
      {/* 2. FREEFY CONTINUOUS DISCOVERY STREAM                     */}
      {/* ========================================================= */}
      {isFreefy && (
        <View style={styles.engineContentWrapper}>
          {/* A. Freefy Trending PageView Hero */}
          <SquareHeroPageView
            tracks={featuredTracks}
            queue={featuredTracks}
            colors={colors}
            currentTrackId={currentTrack?.id}
            isAudioPlaying={isAudioPlaying}
            onPlayTrack={handlePlayTrack}
            onTogglePlayPause={togglePlayPause}
          />

          {/* B. Today's Top Global Hits */}
          <TrendingTopHitsPageView
            tracks={featuredTracks}
            colors={colors}
            onPlayTrack={handlePlayTrack}
          />

          {/* C. Live Global Radio Stations */}
          {liveRadios.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Radio size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Global Radios</Text>
                  <Text style={[styles.countBadge, { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    LIVE
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {liveRadios.slice(0, 10).map((radio) => (
                  <View key={`radio-${radio.id}`} style={{ width: 220, marginRight: 12 }}>
                    <RadioCard radio={radio} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* D. Featured Spotify Curated Playlists */}
          {freefyPlaylists.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <ListMusic size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Spotify Playlists</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {freefyPlaylists.map((pl) => (
                  <TouchableOpacity
                    key={`freefy-pl-${pl.id}`}
                    style={[styles.playlistCard, { borderColor: 'rgba(255, 255, 255, 0.08)' }]}
                    onPress={() =>
                      onNavigateDetail({
                        type: 'playlist',
                        id: pl.id,
                        title: pl.name,
                        subtitle: pl.description,
                        image: pl.image,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <TrackArtwork imageUri={pl.image} title={pl.name} size={135} borderRadius={18} />
                    <Text numberOfLines={1} style={styles.playlistName}>
                      {pl.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.playlistDesc}>
                      Spotify Curated
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* E. Top Albums */}
          {freefyAlbums.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Disc3 size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Global Albums</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {freefyAlbums.map((album) => (
                  <AlbumCard
                    key={`freefy-alb-${album.id}`}
                    album={album}
                    onPress={(a) =>
                      onNavigateDetail({
                        type: 'album',
                        id: a.id,
                        title: a.name,
                        subtitle: a.artist,
                        image: a.image,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* F. Top Artists */}
          {freefyArtists.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Users size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Global Artists</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {freefyArtists.map((artist) => (
                  <ArtistCard
                    key={`freefy-art-${artist.id}`}
                    artist={artist}
                    onPress={(a) =>
                      onNavigateDetail({
                        type: 'artist',
                        id: a.id,
                        title: a.name,
                        image: a.image,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ========================================================= */}
      {/* 3. TUNEFREE CONTINUOUS DISCOVERY STREAM                   */}
      {/* ========================================================= */}
      {isTuneFree && (
        <View style={styles.engineContentWrapper}>
          {/* A. TuneFree New Releases Hero */}
          <SquareHeroPageView
            tracks={flattenedTuneFreeTracks}
            queue={flattenedTuneFreeTracks}
            colors={colors}
            currentTrackId={currentTrack?.id}
            isAudioPlaying={isAudioPlaying}
            onPlayTrack={handlePlayTrack}
            onTogglePlayPause={togglePlayPause}
          />

          {/* B. New Releases Top Hits PageView */}
          <TrendingTopHitsPageView
            tracks={flattenedTuneFreeTracks}
            colors={colors}
            onPlayTrack={handlePlayTrack}
          />

          {/* C. Genres & Vibes Explorer */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Headphones size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Genres & Vibes</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langTabsScrollContent}
            >
              {TUNEFREE_GENRES.map((genre) => {
                const isSelected = selectedGenre === genre;
                return (
                  <TouchableOpacity
                    key={`genre-${genre}`}
                    style={[
                      styles.langTabPill,
                      isSelected && [
                        styles.langTabPillActive,
                        { backgroundColor: `${colors.primary}25`, borderColor: colors.primary },
                      ],
                    ]}
                    onPress={() => selectGenre(genre)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.langTabText,
                        { color: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.55)' },
                      ]}
                    >
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {genreTracks.length > 0 && (
              <View style={{ marginTop: 10, paddingHorizontal: 16 }}>
                {genreTracks.slice(0, 5).map((track, idx) => (
                  <TrackCard
                    key={`genre-track-${track.id}-${idx}`}
                    track={track}
                    queueContext={genreTracks}
                    showIndex={idx}
                  />
                ))}
              </View>
            )}
          </View>

          {/* D. Popular Artists */}
          {tuneFreeArtists.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Users size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Top TuneFree Artists</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalCardsScroll}
              >
                {tuneFreeArtists.map((artist) => (
                  <ArtistCard
                    key={`tunefree-art-${artist.id}`}
                    artist={{
                      id: artist.id,
                      name: artist.name,
                      image: artist.image,
                      sourceEngine: 'tune_free',
                    }}
                    onPress={(a) =>
                      onNavigateDetail({
                        type: 'artist',
                        id: a.id,
                        title: a.name,
                        image: a.image,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  engineContentWrapper: {
    gap: 20,
  },
  // Square Hero PageView Carousel
  squareHeroContainer: {
    marginTop: 6,
    marginBottom: 4,
    alignItems: 'center',
  },
  squareHeroScrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  squareHeroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#12141F',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  squareHeroTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  squareHeroArtwork: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroWatermarkContainer: {
    position: 'absolute',
    top: '35%',
    left: -20,
    right: -20,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.08,
    transform: [{ rotate: '-6deg' }],
  },
  squareHeroWatermarkText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  squareHeroTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 4,
  },
  squareTrendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(9, 10, 15, 0.75)',
    borderWidth: 1,
    gap: 5,
  },
  squareTrendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  squareAudioBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  squareAudioBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
  },
  squareHeroBottom: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 4,
  },
  heroCardTextCol: {
    flex: 1,
    marginRight: 14,
  },
  squareHeroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  squareHeroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  heroPlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  heroPlayGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  paginationDotActive: {
    width: 22,
  },
  paginationDotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Sections Common
  sectionContainer: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  playAllTextDark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#070B14',
  },

  // Top Charts Multi-Language Swiper
  chartsSectionContainer: {
    marginTop: 6,
  },
  langTabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  langTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langTabPillActive: {
    borderWidth: 1,
  },
  langTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartPagesScrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  chartPageCard: {
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  chartCardHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  chartTrackCountTag: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  chartPlayAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  chartPlayAllText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#070B14',
  },
  chartLoadingWrapper: {
    paddingVertical: 8,
  },

  // Trending Top Hits 15-Song PageView
  trendingHitsSection: {
    marginTop: 6,
  },
  hitsPageScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  hitsPageCard: {
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  // Horizontal Scrolling Cards (Viral, Playlists, Albums, Videos)
  horizontalCardsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  viralTrackCard: {
    width: 135,
    backgroundColor: 'rgba(18, 19, 28, 0.7)',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
  },
  viralTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: -0.2,
  },
  viralArtist: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  playlistCard: {
    width: 135,
    backgroundColor: 'rgba(18, 19, 28, 0.7)',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
  },
  playlistName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: -0.2,
  },
  playlistDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
});
