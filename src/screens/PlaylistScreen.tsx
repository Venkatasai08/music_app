// Dedicated Glassmorphic Playlist Hub Screen
// Features: User Playlist Creation, Track Management, Liked Playlists & Download History

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ListMusic,
  Plus,
  Heart,
  History,
  Download,
  Play,
  Shuffle,
  Trash2,
  Edit3,
  Search,
  X,
  Sparkles,
  ChevronRight,
  Music,
  Disc3,
  Check,
} from 'lucide-react-native';
import { useLibraryStore } from '../stores/useLibraryStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useAppTheme } from '../theme';
import { TrackCard } from '../components/cards/TrackCard';
import { GlassCard } from '../components/common/GlassCard';
import { DetailScreenParams } from '../types/engine';
import { Track, Playlist } from '../types/music';
import { formatTime } from '../utils/audioUtils';
import { listenFreeApi } from '../api/listenFreeApi';

const { width } = Dimensions.get('window');

interface PlaylistScreenProps {
  onNavigateDetail: (params: DetailScreenParams) => void;
}

type PlaylistTab = 'my_playlists' | 'liked_playlists' | 'download_history';

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80',
];

export const PlaylistScreen: React.FC<PlaylistScreenProps> = React.memo(({ onNavigateDetail }) => {
  const insets = useSafeAreaInsets();
  const { colors, radius } = useAppTheme();

  const [activeTab, setActiveTab] = useState<PlaylistTab>('my_playlists');
  const [searchQuery, setSearchQuery] = useState('');

  // Store data
  const customPlaylists = useLibraryStore((s) => s.customPlaylists);
  const likedPlaylists = useLibraryStore((s) => s.likedPlaylists);
  const downloadHistory = useLibraryStore((s) => s.downloadHistory);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const favorites = useLibraryStore((s) => s.favorites);

  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);
  const clearDownloadHistory = useLibraryStore((s) => s.clearDownloadHistory);
  const clearHistory = useLibraryStore((s) => s.clearHistory);

  const playTrack = usePlayerStore((s) => s.playTrack);

  // Active Expanded Playlist
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [selectedCover, setSelectedCover] = useState(PRESET_COVERS[0]);

  const [addSongModalVisible, setAddSongModalVisible] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [searchedSongs, setSearchedSongs] = useState<Track[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);

  // Sync selected playlist live from store
  const activeSelectedPlaylist = useMemo(() => {
    if (!selectedPlaylist) return null;
    return (
      customPlaylists.find((p) => p.id === selectedPlaylist.id) ||
      likedPlaylists.find((p) => p.id === selectedPlaylist.id) ||
      selectedPlaylist
    );
  }, [selectedPlaylist, customPlaylists, likedPlaylists]);

  // Combined History List
  const combinedHistory = useMemo(() => {
    const map = new Map<string, Track>();
    downloadHistory.forEach((t) => map.set(t.id, t));
    recentlyPlayed.forEach((t) => {
      if (!map.has(t.id)) map.set(t.id, t);
    });
    return Array.from(map.values());
  }, [downloadHistory, recentlyPlayed]);

  // Filtered Playlists
  const filteredMyPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return customPlaylists;
    const q = searchQuery.toLowerCase();
    return customPlaylists.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
  }, [customPlaylists, searchQuery]);

  const filteredLikedPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return likedPlaylists;
    const q = searchQuery.toLowerCase();
    return likedPlaylists.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
  }, [likedPlaylists, searchQuery]);

  // Handle Create Playlist
  const handleCreateSubmit = () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Playlist Name Required', 'Please enter a name for your playlist.');
      return;
    }
    const created = createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), selectedCover);
    setCreateModalVisible(false);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setSelectedPlaylist(created);
  };

  // Handle Delete Playlist
  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlist.id);
            if (selectedPlaylist?.id === playlist.id) {
              setSelectedPlaylist(null);
            }
          },
        },
      ]
    );
  };

  // Handle Search Songs for Adding
  const handleSearchSongs = async (query: string) => {
    setSongSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchedSongs(favorites.slice(0, 10));
      return;
    }
    setIsSearchingSongs(true);
    try {
      const results = await listenFreeApi.searchSongs(query.trim(), 15);
      setSearchedSongs(results);
    } catch (e) {
      console.warn('Search song error:', e);
    } finally {
      setIsSearchingSongs(false);
    }
  };

  // Open Add Song Modal
  const handleOpenAddSongs = () => {
    setSearchedSongs(favorites.slice(0, 10));
    setSongSearchQuery('');
    setAddSongModalVisible(true);
  };

  // ================= VIEW: EXPANDED PLAYLIST DETAILS =================
  if (activeSelectedPlaylist) {
    const playlistTracks = activeSelectedPlaylist.tracks || [];

    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Back navigation & header */}
        <View style={styles.detailTopBar}>
          <TouchableOpacity
            onPress={() => setSelectedPlaylist(null)}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Text numberOfLines={1} style={styles.topBarTitle}>
            {activeSelectedPlaylist.name}
          </Text>

          <TouchableOpacity
            onPress={() => handleDeletePlaylist(activeSelectedPlaylist)}
            style={styles.trashBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={playlistTracks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.playlistDetailListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.playlistHeroCard}>
              {/* Artwork */}
              <View style={styles.heroArtWrapper}>
                <Image source={{ uri: activeSelectedPlaylist.image }} style={styles.heroArt} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Title & Info */}
              <Text style={styles.playlistHeroTitle}>{activeSelectedPlaylist.name}</Text>
              {activeSelectedPlaylist.description ? (
                <Text style={styles.playlistHeroDesc}>{activeSelectedPlaylist.description}</Text>
              ) : null}

              <Text style={[styles.playlistHeroCount, { color: colors.primary }]}>
                {playlistTracks.length} Songs • Created Playlist
              </Text>

              {/* Action Buttons: Play All / Shuffle / Add Song */}
              <View style={styles.heroActionsRow}>
                {playlistTracks.length > 0 && (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => playTrack(playlistTracks[0], playlistTracks)}
                      activeOpacity={0.8}
                    >
                      <Play size={16} color="#070B14" fill="#070B14" />
                      <Text style={styles.primaryActionText}>Play All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryActionBtn}
                      onPress={() => {
                        const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
                        playTrack(shuffled[0], shuffled);
                      }}
                      activeOpacity={0.8}
                    >
                      <Shuffle size={16} color="#FFFFFF" />
                      <Text style={styles.secondaryActionText}>Shuffle</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { borderColor: `${colors.primary}55` }]}
                  onPress={handleOpenAddSongs}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Add Songs</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <ListMusic size={48} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyStateTitle}>No songs in this playlist yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add your favorite tracks from ListenFree, Freefy, or your library!
              </Text>
              <TouchableOpacity
                style={[styles.addSongsCtaBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenAddSongs}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#070B14" />
                <Text style={styles.addSongsCtaText}>Add Songs Now</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.trackItemRow}>
              <View style={{ flex: 1 }}>
                <TrackCard
                  track={item}
                  queueContext={playlistTracks}
                  showIndex={index}
                />
              </View>
              <TouchableOpacity
                onPress={() => removeTrackFromPlaylist(activeSelectedPlaylist.id, item.id)}
                style={styles.removeTrackBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="rgba(255, 255, 255, 0.4)" />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Add Songs Modal */}
        <Modal
          visible={addSongModalVisible}
          animationType="slide"
          onRequestClose={() => setAddSongModalVisible(false)}
        >
          <View style={[styles.modalScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalHeading}>Add Songs to Playlist</Text>
              <TouchableOpacity
                onPress={() => setAddSongModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                activeOpacity={0.7}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Song Search Input */}
            <View style={styles.songSearchBox}>
              <Search size={18} color="rgba(255, 255, 255, 0.4)" />
              <TextInput
                style={styles.songSearchInput}
                placeholder="Search tracks to add..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={songSearchQuery}
                onChangeText={handleSearchSongs}
                autoFocus
              />
              {songSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchSongs('')}>
                  <X size={16} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={searchedSongs}
              keyExtractor={(item, idx) => `search-${item.id}-${idx}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              renderItem={({ item }) => {
                const isAlreadyIn = (activeSelectedPlaylist.tracks || []).some((t) => t.id === item.id);
                return (
                  <View style={styles.candidateTrackRow}>
                    <View style={{ flex: 1 }}>
                      <TrackCard track={item} />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.addTrackActionBtn,
                        {
                          backgroundColor: isAlreadyIn
                            ? 'rgba(16, 185, 129, 0.18)'
                            : `${colors.primary}22`,
                          borderColor: isAlreadyIn ? '#10B981' : colors.primary,
                        },
                      ]}
                      onPress={() => {
                        if (isAlreadyIn) {
                          removeTrackFromPlaylist(activeSelectedPlaylist.id, item.id);
                        } else {
                          addTrackToPlaylist(activeSelectedPlaylist.id, item);
                        }
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isAlreadyIn ? (
                        <Check size={18} color="#10B981" strokeWidth={2.5} />
                      ) : (
                        <Plus size={18} color={colors.primary} strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        </Modal>
      </View>
    );
  }

  // ================= VIEW: MAIN PLAYLIST HUB =================
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Playlists</Text>
          <Text style={styles.screenSubtitle}>
            {customPlaylists.length} Custom • {likedPlaylists.length} Liked • {combinedHistory.length} History
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createPlaylistBtn, { shadowColor: colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createGradient}
          >
            <Plus size={16} color="#070B14" strokeWidth={2.5} />
            <Text style={styles.createText}>New Playlist</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Segment Tab Switcher */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[
            styles.segmentPill,
            activeTab === 'my_playlists' && [
              styles.segmentPillActive,
              { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('my_playlists')}
          activeOpacity={0.7}
        >
          <ListMusic
            size={14}
            color={activeTab === 'my_playlists' ? colors.primary : 'rgba(255, 255, 255, 0.5)'}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'my_playlists' ? colors.primary : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            My Playlists ({customPlaylists.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentPill,
            activeTab === 'liked_playlists' && [
              styles.segmentPillActive,
              { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('liked_playlists')}
          activeOpacity={0.7}
        >
          <Heart
            size={14}
            color={activeTab === 'liked_playlists' ? colors.primary : 'rgba(255, 255, 255, 0.5)'}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'liked_playlists' ? colors.primary : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            Liked ({likedPlaylists.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentPill,
            activeTab === 'download_history' && [
              styles.segmentPillActive,
              { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('download_history')}
          activeOpacity={0.7}
        >
          <History
            size={14}
            color={activeTab === 'download_history' ? colors.primary : 'rgba(255, 255, 255, 0.5)'}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'download_history' ? colors.primary : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            History ({combinedHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Filter Bar */}
      {activeTab !== 'download_history' && (
        <View style={styles.searchBar}>
          <Search size={16} color="rgba(255, 255, 255, 0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search playlists..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* TAB 1: MY PLAYLISTS */}
      {activeTab === 'my_playlists' && (
        <FlatList
          data={filteredMyPlaylists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.playlistGridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <ListMusic size={48} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyStateTitle}>No custom playlists yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create your first playlist and collect all your favorite tracks in one place!
              </Text>
              <TouchableOpacity
                style={[styles.addSongsCtaBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#070B14" />
                <Text style={styles.addSongsCtaText}>Create Playlist</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistCard}
              onPress={() => setSelectedPlaylist(item)}
              activeOpacity={0.8}
            >
              <View style={styles.playlistArtWrapper}>
                <Image source={{ uri: item.image }} style={styles.playlistArt} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.playlistTrackCountPill}>
                  <Text style={styles.playlistTrackCountText}>
                    {item.tracks?.length || item.trackCount || 0} tracks
                  </Text>
                </View>
              </View>

              <View style={styles.playlistInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.playlistCardTitle}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.playlistCardDesc}>
                    {item.description || 'Custom playlist collection'}
                  </Text>
                </View>
                <ChevronRight size={18} color="rgba(255, 255, 255, 0.4)" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* TAB 2: LIKED PLAYLISTS */}
      {activeTab === 'liked_playlists' && (
        <FlatList
          data={filteredLikedPlaylists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.playlistGridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Heart size={48} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyStateTitle}>No liked playlists yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Like albums and playlists from the Home and Explore tabs to see them here!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistCard}
              onPress={() => {
                onNavigateDetail({
                  type: 'playlist',
                  id: item.id,
                  title: item.name,
                  subtitle: item.description,
                  image: item.image,
                  itemData: item,
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.playlistArtWrapper}>
                <Image source={{ uri: item.image }} style={styles.playlistArt} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.playlistTrackCountPill}>
                  <Text style={styles.playlistTrackCountText}>
                    {item.tracks?.length || item.trackCount || 0} tracks
                  </Text>
                </View>
              </View>

              <View style={styles.playlistInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.playlistCardTitle}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.playlistCardDesc}>
                    {item.description || 'Curated playlist'}
                  </Text>
                </View>
                <ChevronRight size={18} color="rgba(255, 255, 255, 0.4)" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* TAB 3: DOWNLOAD HISTORY & RECENTLY PLAYED */}
      {activeTab === 'download_history' && (
        <FlatList
          data={combinedHistory}
          keyExtractor={(item, idx) => `hist-${item.id}-${idx}`}
          contentContainerStyle={styles.historyListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            combinedHistory.length > 0 ? (
              <View style={styles.historyHeaderRow}>
                <TouchableOpacity
                  style={[styles.historyPlayAllBtn, { backgroundColor: colors.primary }]}
                  onPress={() => playTrack(combinedHistory[0], combinedHistory)}
                  activeOpacity={0.8}
                >
                  <Play size={14} color="#070B14" fill="#070B14" />
                  <Text style={styles.historyPlayAllText}>Play All History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    clearDownloadHistory();
                    clearHistory();
                  }}
                  style={styles.clearHistoryBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color="rgba(255, 255, 255, 0.5)" />
                  <Text style={styles.clearHistoryText}>Clear</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <History size={48} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyStateTitle}>No history yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Songs you download or stream will automatically appear here for quick access.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TrackCard
              track={item}
              queueContext={combinedHistory}
              showIndex={index}
            />
          )}
        />
      )}

      {/* Modal: Create New Playlist */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.createModalBackdrop}>
          <View style={[styles.createModalCard, { backgroundColor: '#131520' }]}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalHeading}>Create New Playlist</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <TextInput
              style={styles.createInput}
              placeholder="Playlist Name"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <TextInput
              style={[styles.createInput, { height: 64 }]}
              placeholder="Description (optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={newPlaylistDesc}
              onChangeText={setNewPlaylistDesc}
              multiline
            />

            {/* Pick Cover Art */}
            <Text style={styles.pickCoverLabel}>Select Cover Artwork</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coverPickerScroll}>
              {PRESET_COVERS.map((cov, idx) => {
                const isPicked = selectedCover === cov;
                return (
                  <TouchableOpacity
                    key={`cov-${idx}`}
                    onPress={() => setSelectedCover(cov)}
                    style={[
                      styles.coverOption,
                      isPicked && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    <Image source={{ uri: cov }} style={styles.coverOptionImage} />
                    {isPicked && (
                      <View style={[styles.pickedBadge, { backgroundColor: colors.primary }]}>
                        <Check size={12} color="#070B14" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Submit CTA */}
            <TouchableOpacity
              style={[styles.submitCreateBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitCreateText}>Create Playlist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  createPlaylistBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070B14',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  segmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  segmentPillActive: {
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  playlistGridContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  playlistArtWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161822',
  },
  playlistArt: {
    width: '100%',
    height: '100%',
  },
  playlistTrackCountPill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  playlistTrackCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playlistInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  playlistCardDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  historyListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyPlayAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
  },
  historyPlayAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#070B14',
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },
  addSongsCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  addSongsCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070B14',
  },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  trashBtn: {
    padding: 6,
  },
  playlistDetailListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  playlistHeroCard: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  heroArtWrapper: {
    width: 140,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroArt: {
    width: '100%',
    height: '100%',
  },
  playlistHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  playlistHeroDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 4,
  },
  playlistHeroCount: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 14,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070B14',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trackItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  removeTrackBtn: {
    padding: 8,
    marginRight: 4,
  },
  createModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  createModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createModalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  pickCoverLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
    marginBottom: 8,
  },
  coverPickerScroll: {
    marginBottom: 18,
  },
  coverOption: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  coverOptionImage: {
    width: '100%',
    height: '100%',
  },
  pickedBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitCreateBtn: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#070B14',
  },
  modalScreen: {
    flex: 1,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 6,
  },
  songSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  songSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  candidateTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addTrackActionBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 6,
  },
});
