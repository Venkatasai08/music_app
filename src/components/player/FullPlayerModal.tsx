import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  BackHandler,
  Animated,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  ListMusic,
  Mic2,
  Share2,
  Gauge,
  SlidersHorizontal,
  RotateCcw,
  RotateCw,
  Download,
  CheckCircle2,
} from 'lucide-react-native';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useAppTheme, getEngineTheme } from '../../theme';
import { extractString, formatTime } from '../../utils/audioUtils';
import { SyncedLyricsView } from './SyncedLyricsView';
import { QueueDrawer } from './QueueDrawer';
import { QualitySelectorModal } from '../modals/QualitySelectorModal';
import { PlaybackSpeedModal } from './PlaybackSpeedModal';
import { PlayRangeModal } from './PlayRangeModal';
import { DownloadRangeModal } from '../modals/DownloadRangeModal';
import { AudioWaveformCutter } from './AudioWaveformCutter';
import { MarqueeText } from '../common/MarqueeText';
import { CircularPlayerDial } from './CircularPlayerDial';
import { WaveformVisualizer } from './WaveformVisualizer';

const { width, height } = Dimensions.get('window');

const CARD_SIZE = Math.min(width * 0.70, 275);
const ITEM_SPACING = 16;
const ITEM_FULL_WIDTH = CARD_SIZE + ITEM_SPACING;
const SIDE_INSET = (width - ITEM_FULL_WIDTH) / 2;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Isolated Time Text component so 400ms position ticks don't re-render FullPlayerModal
const PlayerTimeText: React.FC = React.memo(() => {
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  return (
    <Text style={styles.actionTimeText}>
      {formatTime(Math.floor(positionMs / 1000))} / {formatTime(Math.floor(durationMs / 1000))}
    </Text>
  );
});

// Isolated Lyrics Preview Card so lyrics index changes don't re-render entire PlayerScreen
const PlayerLyricPreviewCard: React.FC<{ activeTheme: any; onPress: () => void }> = React.memo(
  ({ activeTheme, onPress }) => {
    const lyrics = usePlayerStore((s) => s.lyrics);
    const plainLyrics = usePlayerStore((s) => s.plainLyrics);
    const activeLyricIndex = usePlayerStore((s) => s.activeLyricIndex);

    const currentLyricPreview = React.useMemo(() => {
      if (lyrics && lyrics.length > 0) {
        if (activeLyricIndex >= 0 && activeLyricIndex < lyrics.length) {
          return lyrics[activeLyricIndex].text || '...';
        }
        return lyrics[0]?.text || 'Tap to view full synchronized lyrics';
      }
      if (plainLyrics) {
        const firstLine = plainLyrics.split('\n').find((l) => l.trim().length > 0);
        return firstLine || 'Tap to view full lyrics';
      }
      return 'Lyrics • Tap to view synchronized lyrics';
    }, [lyrics, activeLyricIndex, plainLyrics]);

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.lyricsPreviewCard, { borderColor: `${activeTheme.primary}44` }]}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <LinearGradient
          colors={[`${activeTheme.primary}25`, `${activeTheme.primary}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.lyricsPreviewGradient}
        >
          <View style={styles.lyricsPreviewLeft}>
            <View style={[styles.lyricsIconWrap, { backgroundColor: `${activeTheme.primary}22` }]}>
              <Mic2 size={13} color={activeTheme.primary} />
            </View>
            <View style={styles.lyricsTextWrap}>
              <Text style={[styles.lyricsPreviewLabel, { color: activeTheme.accent || activeTheme.primary }]}>
                LYRICS PREVIEW
              </Text>
              <MarqueeText
                text={currentLyricPreview}
                style={styles.lyricsPreviewText}
                speed={26}
                delay={800}
              />
            </View>
          </View>
          <View style={styles.lyricsExpandBadge}>
            <ChevronUp size={15} color={activeTheme.primary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
);

interface PlayerScreenProps {
  onBack?: () => void;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = React.memo(({ onBack }) => {
  const insets = useSafeAreaInsets();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentRadio = usePlayerStore((s) => s.currentRadio);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const preferredQuality = usePlayerStore((s) => s.preferredQuality);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const playbackSpeed = usePlayerStore((s) => s.playbackSpeed);
  const isPlayRangeEnabled = usePlayerStore((s) => s.isPlayRangeEnabled);
  const trackPlayRanges = usePlayerStore((s) => s.trackPlayRanges);
  const getEffectivePlayRange = usePlayerStore((s) => s.getEffectivePlayRange);
  const fetchLyricsForCurrentTrack = usePlayerStore((s) => s.fetchLyricsForCurrentTrack);
  const setFullPlayerVisible = usePlayerStore((s) => s.setFullPlayerVisible);

  const favorited = useLibraryStore((s) => (currentTrack ? s.favorites.some((f) => f.id === currentTrack.id) : false));
  const isTrackDownloaded = useDownloadStore((s) => (currentTrack ? Boolean(s.downloadedTracks[currentTrack.id]) : false));
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const downloadProgress = useDownloadStore((s) => (currentTrack ? s.downloadingProgress[currentTrack.id] ?? null : null));
  const isDownloading = downloadProgress !== null;
  const { colors } = useAppTheme();

  // Dynamic Theme Palette based on current playing track sourceEngine:
  // ListenFree -> Blue (#00D2FF)
  // Freefy     -> Green (#00E676)
  // TuneFree   -> Red (#FF3B6D)
  const activeTheme = getEngineTheme(currentTrack?.sourceEngine || (currentRadio ? 'freefy' : undefined));

  const [activeSheet, setActiveSheet] = useState<'none' | 'lyrics' | 'queue'>('none');
  const [qualityModalVisible, setQualityModalVisible] = useState(false);
  const [speedModalVisible, setSpeedModalVisible] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [isCutterMode, setIsCutterMode] = useState(false);

  const pagerRef = useRef<FlatList>(null);
  const isUserSwipingRefState = useRef(false);
  const scrollX = useRef(new Animated.Value((queueIndex >= 0 ? queueIndex : 0) * ITEM_FULL_WIDTH)).current;

  // Play range details
  const effectiveRange = getEffectivePlayRange(currentTrack);
  const isRangeActive = effectiveRange.isRangeActive;

  // Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (isCutterMode) {
        setIsCutterMode(false);
        return true;
      }
      if (activeSheet !== 'none') {
        setActiveSheet('none');
        return true;
      }
      setFullPlayerVisible(false);
      if (onBack) onBack();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack, activeSheet, isCutterMode, setFullPlayerVisible]);

  // Fetch lyrics if missing
  useEffect(() => {
    if (currentTrack) {
      const lyrics = usePlayerStore.getState().lyrics;
      if (!lyrics || lyrics.length === 0) {
        fetchLyricsForCurrentTrack();
      }
    }
  }, [currentTrack?.id]);

  // PageView data source from current queue or single item
  const pagerData = React.useMemo(() => {
    if (queue && queue.length > 0) return queue;
    if (currentTrack) return [currentTrack];
    if (currentRadio) return [{ id: currentRadio.id, name: currentRadio.name, image: currentRadio.favicon } as any];
    return [];
  }, [queue, currentTrack, currentRadio]);

  const activeIndex = queueIndex >= 0 && queueIndex < pagerData.length ? queueIndex : 0;

  // Keep Pager in sync when queueIndex updates (e.g. from next/previous buttons or track completion)
  useEffect(() => {
    if (!isUserSwipingRefState.current && pagerRef.current && pagerData.length > 0 && activeIndex >= 0) {
      try {
        pagerRef.current.scrollToOffset({ offset: activeIndex * ITEM_FULL_WIDTH, animated: true });
      } catch (e) {}
    }
  }, [activeIndex, pagerData.length]);

  const title = extractString(currentTrack?.name || currentRadio?.name, 'Nothing Playing');
  const artist = extractString(currentTrack?.artist || (currentRadio ? 'Live Radio Stream' : ''), 'Unknown Artist');
  const album = extractString(currentTrack?.album || '', '');
  const image = currentTrack?.image || currentTrack?.thumbnailImage || currentRadio?.favicon;

  const handleToggleRangeCutter = () => {
    if (isPlaying) {
      usePlayerStore.getState().pause();
    }
    setIsCutterMode((prev) => !prev);
  };

  const handleClose = () => {
    setFullPlayerVisible(false);
    if (onBack) onBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#090A0F',
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      {/* Ambient background glow gradient adapting to song engine */}
      <LinearGradient
        colors={[`${activeTheme.primary}22`, `${activeTheme.secondary}0D`, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 1. Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.circleActionBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ChevronDown size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.topCenterCol}>
          <Text style={styles.topContextSubtitle}>
            {isCutterMode
              ? 'AUDIO RANGE CUTTER'
              : currentRadio
              ? 'LIVE RADIO'
              : album
              ? album
              : currentTrack?.sourceEngine === 'listen_free'
              ? 'Listen Free'
              : currentTrack?.sourceEngine === 'freefy'
              ? 'Freefy Music'
              : 'Tune Free'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setQualityModalVisible(true)}
          style={styles.circleActionBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Share2 size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Centerpiece: Audio Waveform Frequency Cutter Studio (when Cutter Mode active) OR Horizontal Carousel Dial */}
      <View style={styles.dialSection}>
        {isCutterMode ? (
          <View style={{ width: width, paddingHorizontal: 12 }}>
            <AudioWaveformCutter
              track={currentTrack}
              height={CARD_SIZE + 24}
              onDone={() => setIsCutterMode(false)}
              onDownload={() => setDownloadModalVisible(true)}
            />
          </View>
        ) : (
          <AnimatedFlatList
            ref={pagerRef as any}
            data={pagerData}
            keyExtractor={(item: any, index: number) => `${item.id || item.name || 'track'}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_FULL_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: SIDE_INSET,
            }}
            getItemLayout={(_, index) => ({
              length: ITEM_FULL_WIDTH,
              offset: ITEM_FULL_WIDTH * index,
              index,
            })}
            initialScrollIndex={activeIndex}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              isUserSwipingRefState.current = true;
            }}
            onMomentumScrollEnd={(e: any) => {
              isUserSwipingRefState.current = false;
              const pageIndex = Math.round(e.nativeEvent.contentOffset.x / ITEM_FULL_WIDTH);
              if (pageIndex !== queueIndex && pageIndex >= 0 && pageIndex < pagerData.length) {
                const targetTrack = pagerData[pageIndex];
                if (targetTrack && targetTrack.id !== currentTrack?.id) {
                  playTrack(targetTrack);
                }
              }
            }}
            onScrollToIndexFailed={(info: any) => {
              setTimeout(() => {
                try {
                  pagerRef.current?.scrollToOffset({ offset: info.index * ITEM_FULL_WIDTH, animated: false });
                } catch (e) {}
              }, 120);
            }}
            renderItem={({ item, index }: any) => {
              const isCurrent = index === activeIndex;
              const itemImage =
                item.image ||
                item.thumbnailImage ||
                (item as any).favicon ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80';
              const itemTheme = getEngineTheme(item.sourceEngine || currentTrack?.sourceEngine);

              const inputRange = [
                (index - 1) * ITEM_FULL_WIDTH,
                index * ITEM_FULL_WIDTH,
                (index + 1) * ITEM_FULL_WIDTH,
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.80, 1.0, 0.80],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.42, 1.0, 0.42],
                extrapolate: 'clamp',
              });

              const rotate = scrollX.interpolate({
                inputRange,
                outputRange: ['-8deg', '0deg', '8deg'],
                extrapolate: 'clamp',
              });

              const translateY = scrollX.interpolate({
                inputRange,
                outputRange: [6, 0, 6],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  style={[
                    styles.pagerItemWrapper,
                    {
                      transform: [{ scale }, { translateY }, { rotate }],
                      opacity,
                    },
                  ]}
                >
                  <CircularPlayerDial
                    size={CARD_SIZE}
                    imageUri={itemImage}
                    title={item.name}
                    artist={item.artist}
                    isActive={isCurrent}
                    engine={item.sourceEngine || currentTrack?.sourceEngine}
                    primaryColor={itemTheme.primary}
                    gradientColors={itemTheme.dialGradient}
                    onDoubleTapLeft={() => isCurrent && usePlayerStore.getState().seekTo(Math.max(0, usePlayerStore.getState().positionMs - 10000))}
                    onDoubleTapRight={() => isCurrent && usePlayerStore.getState().seekTo(Math.min(usePlayerStore.getState().durationMs, usePlayerStore.getState().positionMs + 10000))}
                  />
                </Animated.View>
              );
            }}
          />
        )}
      </View>

      {/* 3. Track Metadata & Action Cluster with Engine Themed Highlights & Download */}
      <View style={styles.metadataSection}>
        {/* Left: Play count / HD badge + Titles */}
        <View style={styles.metadataTextCol}>
          <View style={styles.playsBadgeRow}>
            <Text style={[styles.playIconChar, { color: activeTheme.primary }]}>▷</Text>
            <Text style={styles.playsCountText}>
              {currentTrack?.sourceEngine === 'listen_free' ? '43,00,563' : preferredQuality}
            </Text>
            {effectiveRange.hasCustomRange && (
              <View style={[
                styles.rangeActivePill,
                !isRangeActive && {
                  backgroundColor: 'rgba(255, 215, 0, 0.12)',
                  borderColor: 'rgba(255, 215, 0, 0.35)',
                },
              ]}>
                <Text style={[
                  styles.rangeActivePillText,
                  !isRangeActive && { color: '#FFE082', opacity: 0.85 },
                ]}>
                  {formatTime(effectiveRange.startSec)}-{formatTime(effectiveRange.endSec)}
                </Text>
              </View>
            )}
          </View>

          <MarqueeText
            text={title}
            style={styles.trackTitleText}
            speed={32}
            delay={1500}
          />
          <MarqueeText
            text={artist}
            style={styles.trackArtistText}
            speed={28}
            delay={2200}
          />
        </View>

        {/* Right: Favorite Button + Running Time */}
        <View style={styles.actionClusterCol}>
          {currentTrack && (
            <TouchableOpacity
              onPress={() => useLibraryStore.getState().toggleFavorite(currentTrack)}
              style={styles.iconCircleBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                size={20}
                color={favorited ? activeTheme.primary : 'rgba(255, 255, 255, 0.65)'}
                fill={favorited ? activeTheme.primary : 'transparent'}
              />
            </TouchableOpacity>
          )}

          {/* Running / Total Time below favorite button */}
          <PlayerTimeText />
        </View>
      </View>

      {/* 4. Audio Waveform Visualizer with Dynamic Engine Color */}
      <WaveformVisualizer activeColor={activeTheme.primary} height={36} />

      {/* 5. Master Playback Controls */}
      <View style={styles.controlsSection}>
        {/* Previous Track */}
        <TouchableOpacity
          onPress={() => usePlayerStore.getState().previousTrack()}
          style={styles.navControlBtn}
          disabled={!currentTrack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <SkipBack size={26} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>

        {/* 10s Backward */}
        <TouchableOpacity
          onPress={() => usePlayerStore.getState().seekTo(Math.max(0, usePlayerStore.getState().positionMs - 10000))}
          style={styles.seekStepBtn}
          disabled={!currentTrack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <View style={styles.seekIconContainer}>
            <RotateCcw size={28} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.seekIconText}>10</Text>
          </View>
        </TouchableOpacity>

        {/* Large Glowing Master Play/Pause Gradient Circle Button */}
        <TouchableOpacity
          onPress={() => usePlayerStore.getState().togglePlayPause()}
          style={[styles.masterPlayWrapper, { shadowColor: activeTheme.primary }]}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={activeTheme.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.masterPlayGradient}
          >
            {isPlaying ? (
              <Pause size={32} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* 10s Forward */}
        <TouchableOpacity
          onPress={() => usePlayerStore.getState().seekTo(Math.min(usePlayerStore.getState().durationMs, usePlayerStore.getState().positionMs + 10000))}
          style={styles.seekStepBtn}
          disabled={!currentTrack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <View style={styles.seekIconContainer}>
            <RotateCw size={28} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.seekIconText}>10</Text>
          </View>
        </TouchableOpacity>

        {/* Next Track */}
        <TouchableOpacity
          onPress={() => usePlayerStore.getState().nextTrack()}
          style={styles.navControlBtn}
          disabled={!currentTrack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <SkipForward size={26} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* 6. Secondary Toolbar: Repeat, Shuffle, Range Cutter, Speed, Download & Cut, Up Next */}
      <View style={styles.secondaryToolbar}>
        <TouchableOpacity
          onPress={() => usePlayerStore.getState().toggleRepeat()}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {repeatMode === 'one' ? (
            <Repeat1 size={20} color={activeTheme.primary} />
          ) : (
            <Repeat
              size={20}
              color={repeatMode === 'all' ? activeTheme.primary : 'rgba(255, 255, 255, 0.45)'}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => usePlayerStore.getState().toggleShuffle()}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Shuffle
            size={20}
            color={isShuffle ? activeTheme.primary : 'rgba(255, 255, 255, 0.45)'}
          />
        </TouchableOpacity>

        {/* Range Cutter Studio Toggle Button */}
        <TouchableOpacity
          onPress={handleToggleRangeCutter}
          style={[
            styles.secondaryBtn,
            isCutterMode && {
              backgroundColor: `${activeTheme.primary}22`,
              borderRadius: 12,
            },
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SlidersHorizontal
            size={20}
            color={isCutterMode || isRangeActive ? activeTheme.primary : 'rgba(255, 255, 255, 0.45)'}
          />
        </TouchableOpacity>

        {/* Playback Speed Icon Button */}
        <TouchableOpacity
          onPress={() => setSpeedModalVisible(true)}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Gauge
            size={20}
            color={playbackSpeed !== 1.0 ? activeTheme.primary : 'rgba(255, 255, 255, 0.45)'}
          />
        </TouchableOpacity>

        {/* Download & Cut Range Modal Trigger */}
        {currentTrack && (
          <TouchableOpacity
            onPress={() => setDownloadModalVisible(true)}
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={activeTheme.primary} />
            ) : isTrackDownloaded ? (
              <CheckCircle2 size={20} color={activeTheme.primary} />
            ) : (
              <Download size={20} color="rgba(255, 255, 255, 0.45)" />
            )}
          </TouchableOpacity>
        )}

        {/* Up Next Queue Drawer Toggle */}
        <TouchableOpacity
          onPress={() => setActiveSheet(activeSheet === 'queue' ? 'none' : 'queue')}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ListMusic
            size={20}
            color={activeSheet === 'queue' ? activeTheme.primary : 'rgba(255, 255, 255, 0.45)'}
          />
        </TouchableOpacity>
      </View>

      {/* 7. Bottom Lyrics Preview Card with Engine Themed Gradient & Border */}
      <PlayerLyricPreviewCard
        activeTheme={activeTheme}
        onPress={() => setActiveSheet('lyrics')}
      />

      {/* Sheets / Drawers for Lyrics & Queue */}
      {activeSheet === 'lyrics' && (
        <View style={styles.sheetModal}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Synchronized Lyrics</Text>
            <TouchableOpacity onPress={() => setActiveSheet('none')}>
              <ChevronDown size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <SyncedLyricsView />
        </View>
      )}

      {activeSheet === 'queue' && (
        <View style={styles.sheetModal}>
          <QueueDrawer onClose={() => setActiveSheet('none')} />
        </View>
      )}

      {/* Quality Modal */}
      <QualitySelectorModal
        visible={qualityModalVisible}
        onClose={() => setQualityModalVisible(false)}
      />

      {/* Playback Speed Modal */}
      <PlaybackSpeedModal
        visible={speedModalVisible}
        onClose={() => setSpeedModalVisible(false)}
      />

      {/* Play Range Modal */}
      <PlayRangeModal
        visible={rangeModalVisible}
        onClose={() => setRangeModalVisible(false)}
      />

      {/* Download & Cut Range Modal */}
      <DownloadRangeModal
        visible={downloadModalVisible}
        track={currentTrack}
        onClose={() => setDownloadModalVisible(false)}
      />
    </View>
  );
});

export const FullPlayerModal = PlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  circleActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenterCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  topContextSubtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dialSection: {
    width: width,
    marginHorizontal: -16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  pagerItemWrapper: {
    width: ITEM_FULL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadataSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  metadataTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  playsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  playIconChar: {
    color: '#FF3B6D',
    fontSize: 11,
    fontWeight: '800',
  },
  playsCountText: {
    color: '#9496A8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rangeActivePill: {
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
  },
  rangeActivePillText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  trackTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  trackArtistText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9496A8',
    marginTop: 2,
  },
  actionClusterCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTimeText: {
    color: '#9496A8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  navControlBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekStepBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seekIconText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    top: 9,
    textAlign: 'center',
  },
  masterPlayWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    shadowColor: '#FF3B6D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
  },
  masterPlayGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  secondaryBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsPreviewCard: {
    marginHorizontal: 8,
    marginBottom: 8,
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 109, 0.28)',
    backgroundColor: 'rgba(17, 18, 26, 0.88)',
  },
  lyricsPreviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  lyricsPreviewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lyricsIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 59, 109, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  lyricsPreviewLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF758C',
    letterSpacing: 0.7,
    marginBottom: 1,
  },
  lyricsPreviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  lyricsExpandBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDrawerIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  sheetModal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 90,
    backgroundColor: '#0F1018',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
