// Glassmorphic Song Options Bottom Sheet Menu
// Provides rich actions: Play Next, Download, Add to Queue, Trim Snippet, Favorite, Share & Song Details

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Share,
  Alert,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import {
  Play,
  ListPlus,
  ListMusic,
  Download,
  Scissors,
  Heart,
  Share2,
  Info,
  X,
  Sparkles,
  CheckCircle2,
  Mic2,
  SlidersHorizontal,
  Disc3,
  Users,
  FolderPlus,
  Plus,
  Check,
} from 'lucide-react-native';
import { useAppTheme, getEngineTheme } from '../../theme';
import { useSongOptionsStore } from '../../stores/useSongOptionsStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { Track, Playlist } from '../../types/music';
import { formatTime, extractString } from '../../utils/audioUtils';
import { TrackArtwork } from '../common/TrackArtwork';
import { Badge } from '../common/Badge';
import { DownloadRangeModal } from './DownloadRangeModal';
import { AudioWaveformCutter } from '../player/AudioWaveformCutter';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SongOptionsModalProps {
  onNavigateDetail?: (params: any) => void;
}

export const SongOptionsModal: React.FC<SongOptionsModalProps> = React.memo(({ onNavigateDetail }) => {
  const { colors, radius } = useAppTheme();
  const isOpen = useSongOptionsStore((s) => s.isOpen);
  const track = useSongOptionsStore((s) => s.track);
  const queueContext = useSongOptionsStore((s) => s.queueContext);
  const closeSongOptions = useSongOptionsStore((s) => s.closeSongOptions);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const preferredQuality = usePlayerStore((s) => s.preferredQuality);

  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const downloadingProgress = useDownloadStore((s) => (track ? s.downloadingProgress[track.id] : undefined));
  const isDownloaded = useDownloadStore((s) => (track ? s.isDownloaded(track.id) : false));

  const isFavorite = useLibraryStore((s) => (track ? s.favorites.some((f) => f.id === track.id) : false));
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const customPlaylists = useLibraryStore((s) => s.customPlaylists);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);

  // Sub-modal states
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showCutterStudio, setShowCutterStudio] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [newPlaylistInput, setNewPlaylistInput] = useState('');
  const [showNewPlaylistInline, setShowNewPlaylistInline] = useState(false);

  // Slide Animation
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 2000);
  };

  if (!isOpen && !showRangeModal && !showCutterStudio) {
    return null;
  }

  if (!track) return null;

  const trackTheme = getEngineTheme(track.sourceEngine);
  const trackTitle = extractString(track.name, 'Untitled Track');
  const trackArtist = extractString(track.artist, 'Unknown Artist');
  const trackAlbum = extractString(track.album, '');
  const artworkUri =
    track.image ||
    track.thumbnailImage ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';

  const engineLabel =
    track.sourceEngine === 'listen_free'
      ? 'ListenFree • JioSaavn'
      : track.sourceEngine === 'freefy'
      ? 'Freefy • Spotify Match'
      : 'TuneFree • Global';

  // Action handlers
  const handlePlayNow = () => {
    playTrack(track, queueContext);
    closeSongOptions();
  };

  const handlePlayNext = () => {
    playNext(track);
    showToast(`"${trackTitle}" will play next!`);
    setTimeout(() => {
      closeSongOptions();
    }, 400);
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    showToast(`Added "${trackTitle}" to Queue!`);
    setTimeout(() => {
      closeSongOptions();
    }, 400);
  };

  const handleDownload = async () => {
    if (isDownloaded) {
      showToast('Track is already downloaded!');
      return;
    }
    showToast(`Downloading in ${preferredQuality}...`);
    const ok = await downloadTrack(track, preferredQuality);
    if (ok) {
      Alert.alert(
        'Download Complete',
        `"${trackTitle}" saved in high quality (${preferredQuality})!`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleFav = () => {
    toggleFavorite(track);
    showToast(isFavorite ? 'Removed from Favorites' : 'Saved to Favorites ❤️');
  };

  const handleShare = async () => {
    try {
      const shareUrl = track.streamUrl || 'https://musicapp.io';
      await Share.share({
        title: trackTitle,
        message: `🎵 Listen to "${trackTitle}" by ${trackArtist} on Music App:\n${shareUrl}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleOpenSnippetModal = () => {
    closeSongOptions();
    setTimeout(() => {
      setShowRangeModal(true);
    }, 200);
  };

  const handleOpenCutterStudio = () => {
    closeSongOptions();
    setTimeout(() => {
      setShowCutterStudio(true);
    }, 200);
  };

  const handleOpenPlaylistPicker = () => {
    closeSongOptions();
    setTimeout(() => {
      setShowPlaylistPicker(true);
    }, 200);
  };

  const handleSelectPlaylistToAdd = (playlist: Playlist) => {
    if (!track) return;
    addTrackToPlaylist(playlist.id, track);
    setShowPlaylistPicker(false);
    showToast(`Added to "${playlist.name}"!`);
  };

  const handleCreateAndAdd = () => {
    if (!track || !newPlaylistInput.trim()) return;
    const newPl = createPlaylist(
      newPlaylistInput.trim(),
      'Personal playlist collection',
      track.image || track.thumbnailImage
    );
    addTrackToPlaylist(newPl.id, track);
    setNewPlaylistInput('');
    setShowNewPlaylistInline(false);
    setShowPlaylistPicker(false);
    showToast(`Created & added to "${newPl.name}"!`);
  };

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeSongOptions}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeSongOptions}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.sheetContainer,
                  {
                    transform: [{ translateY }],
                    backgroundColor: '#10111A',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  },
                ]}
              >
                {/* Pull Handle Bar */}
                <View style={styles.handleBar} />

                {/* Track Header Card */}
                <View style={[styles.trackHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                  <View style={styles.artworkWrapper}>
                    <TrackArtwork
                      imageUri={artworkUri}
                      title={trackTitle}
                      artist={trackArtist}
                      size={60}
                      borderRadius={14}
                    />
                    <View
                      style={[
                        styles.artworkGlow,
                        { backgroundColor: trackTheme.primary, opacity: 0.25 },
                      ]}
                    />
                  </View>

                  <View style={styles.headerInfo}>
                    <Text numberOfLines={1} style={styles.headerTitle}>
                      {trackTitle}
                    </Text>
                    <Text numberOfLines={1} style={styles.headerArtist}>
                      {trackArtist}
                    </Text>
                    {trackAlbum ? (
                      <Text numberOfLines={1} style={styles.headerAlbum}>
                        {trackAlbum}
                      </Text>
                    ) : null}

                    {/* Metadata Badges */}
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.enginePill,
                          { backgroundColor: `${trackTheme.primary}22`, borderColor: `${trackTheme.primary}55` },
                        ]}
                      >
                        <Text style={[styles.enginePillText, { color: trackTheme.primary }]}>
                          {engineLabel}
                        </Text>
                      </View>

                      {track.duration > 0 && (
                        <View style={styles.metaPill}>
                          <Text style={styles.metaPillText}>{formatTime(track.duration)}</Text>
                        </View>
                      )}

                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{preferredQuality}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={closeSongOptions}
                    style={styles.closeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={20} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>

                {/* Feedback Toast Notification */}
                {feedbackToast && (
                  <View style={[styles.toastBanner, { backgroundColor: trackTheme.primary }]}>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.toastText}>{feedbackToast}</Text>
                  </View>
                )}

                {/* Action Options List */}
                <ScrollView
                  style={styles.actionList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.actionListContent}
                >
                  {/* 1. Play Next */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handlePlayNext}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconCircle, { backgroundColor: `${trackTheme.primary}20` }]}>
                      <ListPlus size={20} color={trackTheme.primary} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: '#FFFFFF' }]}>Play Next</Text>
                      <Text style={styles.actionSubtitle}>Insert right after current playing song</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. Download Track */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleDownload}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIconCircle,
                        {
                          backgroundColor: isDownloaded
                            ? 'rgba(16, 185, 129, 0.2)'
                            : downloadingProgress !== undefined
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <Download
                        size={20}
                        color={
                          isDownloaded
                            ? '#10B981'
                            : downloadingProgress !== undefined
                            ? '#F59E0B'
                            : '#FFFFFF'
                        }
                      />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>
                        {isDownloaded
                          ? 'Downloaded (Offline Available)'
                          : downloadingProgress !== undefined
                          ? `Downloading ${Math.round((downloadingProgress || 0) * 100)}%...`
                          : 'Download Song'}
                      </Text>
                      <Text style={styles.actionSubtitle}>
                        Save {preferredQuality} audio directly to phone storage
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 3. Add to Queue */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleAddToQueue}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionIconCircle}>
                      <ListMusic size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Add to Queue</Text>
                      <Text style={styles.actionSubtitle}>Append to the bottom of playing queue</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 4. Add to Playlist */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleOpenPlaylistPicker}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconCircle, { backgroundColor: `${colors.primary}18` }]}>
                      <FolderPlus size={20} color={colors.primary} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Add to Playlist</Text>
                      <Text style={styles.actionSubtitle}>Save to your personal playlists</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 4. Trim Snippet / Download Range */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleOpenSnippetModal}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(234, 179, 8, 0.18)' }]}>
                      <Scissors size={20} color="#EAB308" />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Trim & Download Snippet</Text>
                      <Text style={styles.actionSubtitle}>
                        Download custom cut audio or ringtone snippet
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 5. Audio Waveform Cutter Studio */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleOpenCutterStudio}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                      <SlidersHorizontal size={20} color={colors.primary} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Waveform Cutter Studio</Text>
                      <Text style={styles.actionSubtitle}>
                        Set visual play range markers with live waveform
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 6. Favorite / Like */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleToggleFav}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIconCircle,
                        {
                          backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <Heart
                        size={20}
                        color={isFavorite ? '#EF4444' : '#FFFFFF'}
                        fill={isFavorite ? '#EF4444' : 'transparent'}
                      />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>
                        {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                      </Text>
                      <Text style={styles.actionSubtitle}>
                        {isFavorite ? 'Saved in your library' : 'Save to your favorite songs'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 7. Share */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleShare}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionIconCircle}>
                      <Share2 size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Share Song</Text>
                      <Text style={styles.actionSubtitle}>Share song details & streaming link</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 8. Audio Metadata Info Toggle */}
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => setShowDetails(!showDetails)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionIconCircle}>
                      <Info size={20} color="rgba(255, 255, 255, 0.7)" />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Audio Details & Codec</Text>
                      <Text style={styles.actionSubtitle}>Bitrate, container & engine specs</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Metadata Details Card */}
                  {showDetails && (
                    <View style={styles.detailsCard}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Track ID:</Text>
                        <Text numberOfLines={1} style={styles.detailValue}>{track.id}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Engine:</Text>
                        <Text style={styles.detailValue}>{track.sourceEngine.toUpperCase()}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bitrate:</Text>
                        <Text style={styles.detailValue}>{preferredQuality} AAC/MP4</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration:</Text>
                        <Text style={styles.detailValue}>{formatTime(track.duration)}</Text>
                      </View>
                      {track.year && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Year:</Text>
                          <Text style={styles.detailValue}>{track.year}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sub-Modal: Trim & Download Snippet Modal */}
      <DownloadRangeModal
        visible={showRangeModal}
        track={track}
        onClose={() => setShowRangeModal(false)}
      />

      {/* Sub-Modal: Audio Waveform Cutter Studio */}
      <Modal
        visible={showCutterStudio}
        animationType="slide"
        onRequestClose={() => setShowCutterStudio(false)}
      >
        <View style={styles.cutterModalContainer}>
          <View style={styles.cutterModalHeader}>
            <View>
              <Text style={styles.cutterModalTitle}>Audio Cutter Studio</Text>
              <Text style={styles.cutterModalSubtitle}>{trackTitle} • {trackArtist}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowCutterStudio(false)}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <AudioWaveformCutter
            track={track}
            onDone={() => setShowCutterStudio(false)}
            onApply={() => setShowCutterStudio(false)}
          />
        </View>
      </Modal>

      {/* Sub-Modal: Add to Playlist Picker */}
      <Modal
        visible={showPlaylistPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlaylistPicker(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setShowPlaylistPicker(false)}>
          <View style={styles.pickerBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.pickerCard,
                  { backgroundColor: '#13141F', borderColor: 'rgba(255, 255, 255, 0.1)' },
                ]}
              >
                {/* Header */}
                <View style={styles.pickerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerTitle}>Add to Playlist</Text>
                    <Text style={styles.pickerSubtitle} numberOfLines={1}>
                      {trackTitle} • {trackArtist}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPlaylistPicker(false)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color="rgba(255, 255, 255, 0.7)" />
                  </TouchableOpacity>
                </View>

                {/* Inline Create Playlist Trigger / Input */}
                {showNewPlaylistInline ? (
                  <View style={styles.inlineCreateBox}>
                    <TextInput
                      style={styles.inlineInput}
                      placeholder="Playlist name..."
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={newPlaylistInput}
                      onChangeText={setNewPlaylistInput}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.inlineCreateBtn, { backgroundColor: colors.primary }]}
                      onPress={handleCreateAndAdd}
                    >
                      <Text style={styles.inlineCreateBtnText}>Create & Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.inlineCancelBtn}
                      onPress={() => setShowNewPlaylistInline(false)}
                    >
                      <X size={16} color="rgba(255, 255, 255, 0.6)" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.newPlaylistBtn, { borderColor: `${colors.primary}50` }]}
                    onPress={() => setShowNewPlaylistInline(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.newPlaylistIcon, { backgroundColor: `${colors.primary}20` }]}>
                      <Plus size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.newPlaylistText, { color: colors.primary }]}>
                      + Create New Playlist
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Playlists List */}
                <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                  {customPlaylists.length === 0 ? (
                    <View style={styles.emptyPickerBox}>
                      <Text style={styles.emptyPickerText}>No playlists created yet.</Text>
                    </View>
                  ) : (
                    customPlaylists.map((pl) => {
                      const isAlreadyIn = (pl.tracks || []).some((t) => t.id === track.id);
                      return (
                        <TouchableOpacity
                          key={pl.id}
                          style={styles.pickerItem}
                          onPress={() => handleSelectPlaylistToAdd(pl)}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={{
                              uri:
                                pl.image ||
                                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
                            }}
                            style={styles.pickerItemThumb}
                          />
                          <View style={styles.pickerItemInfo}>
                            <Text numberOfLines={1} style={styles.pickerItemName}>
                              {pl.name}
                            </Text>
                            <Text style={styles.pickerItemMeta}>
                              {(pl.tracks || []).length} songs
                            </Text>
                          </View>
                          {isAlreadyIn ? (
                            <View style={styles.addedBadge}>
                              <Check size={14} color="#10B981" />
                              <Text style={styles.addedBadgeText}>Added</Text>
                            </View>
                          ) : (
                            <Plus size={18} color="rgba(255, 255, 255, 0.6)" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  cutterModalContainer: {
    flex: 1,
    backgroundColor: '#090A10',
    paddingTop: 40,
  },
  cutterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  cutterModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cutterModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: SCREEN_HEIGHT * 0.82,
    paddingBottom: 24,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  artworkWrapper: {
    width: 58,
    height: 58,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  artworkGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerArtist: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 2,
  },
  headerAlbum: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  enginePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  enginePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionList: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  actionListContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 14,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    maxWidth: '70%',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  pickerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  newPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  newPlaylistIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlaylistText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineCreateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  inlineInput: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
  },
  inlineCreateBtn: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  inlineCancelBtn: {
    padding: 8,
  },
  pickerList: {
    maxHeight: 280,
  },
  emptyPickerBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyPickerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pickerItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pickerItemMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
});
