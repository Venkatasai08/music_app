import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  ListMusic,
  History,
  Plus,
  DownloadCloud,
  Play,
  Trash2,
  Download,
} from 'lucide-react-native';
import { useLibraryStore } from '../stores/useLibraryStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useAppTheme } from '../theme';
import { TrackCard } from '../components/cards/TrackCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ImportPlaylistModal } from '../components/modals/ImportPlaylistModal';
import { DetailScreenParams } from '../types/engine';
import { Track } from '../types/music';

interface LibraryScreenProps {
  onNavigateDetail: (params: DetailScreenParams) => void;
}

type LibraryTab = 'favorites' | 'playlists' | 'downloads' | 'history';

export const LibraryScreen: React.FC<LibraryScreenProps> = React.memo(({ onNavigateDetail }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LibraryTab>('favorites');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const favorites = useLibraryStore((s) => s.favorites);
  const customPlaylists = useLibraryStore((s) => s.customPlaylists);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const clearHistory = useLibraryStore((s) => s.clearHistory);

  const downloadedTracks = useDownloadStore((s) => s.downloadedTracks);
  const removeDownloadedTrack = useDownloadStore((s) => s.removeDownloadedTrack);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const { colors } = useAppTheme();

  const downloadedList = React.useMemo(
    () => Object.values(downloadedTracks).map((d) => d.track),
    [downloadedTracks]
  );

  const handleDeleteDownloaded = React.useCallback((track: Track) => {
    Alert.alert(
      'Delete Downloaded Song',
      `Are you sure you want to delete "${track.name}" from your downloaded songs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeDownloadedTrack(track.id);
          },
        },
      ]
    );
  }, [removeDownloadedTrack]);

  const handleCreatePlaylist = React.useCallback(() => {
    const name = `Playlist #${customPlaylists.length + 1}`;
    const newP = createPlaylist(name, 'My awesome collection');
    onNavigateDetail({
      type: 'playlist',
      id: newP.id,
      title: newP.name,
      subtitle: newP.description,
      image: newP.image,
      itemData: newP,
    });
  }, [customPlaylists.length, createPlaylist, onNavigateDetail]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header & Quick Action */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Your Library</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {favorites.length} Liked Tracks • {customPlaylists.length} Playlists
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: colors.border }]}
            onPress={() => setImportModalVisible(true)}
            activeOpacity={0.7}
          >
            <DownloadCloud size={16} color={colors.primary} />
            <Text style={[styles.headerBtnText, { color: colors.primary }]}>Import</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={handleCreatePlaylist}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#070B14" />
            <Text style={[styles.headerBtnText, { color: '#070B14' }]}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segment Tabs: Favorites / Playlists / Downloads / History */}
      <View style={[styles.tabBarWrapper, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'favorites' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.7}
        >
          <Heart
            size={14}
            color={activeTab === 'favorites' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'favorites' ? colors.primary : colors.textSecondary },
            ]}
          >
            Liked ({favorites.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'playlists' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('playlists')}
          activeOpacity={0.7}
        >
          <ListMusic
            size={14}
            color={activeTab === 'playlists' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'playlists' ? colors.primary : colors.textSecondary },
            ]}
          >
            Playlists ({customPlaylists.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'downloads' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('downloads')}
          activeOpacity={0.7}
        >
          <Download
            size={14}
            color={activeTab === 'downloads' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'downloads' ? colors.primary : colors.textSecondary },
            ]}
          >
            Downloaded ({downloadedList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'history' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <History
            size={14}
            color={activeTab === 'history' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'history' ? colors.primary : colors.textSecondary },
            ]}
          >
            History ({recentlyPlayed.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {activeTab === 'favorites' && (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          renderItem={({ item, index }) => (
            <TrackCard track={item} queueContext={favorites} showIndex={index} />
          )}
          ListHeaderComponent={
            favorites.length > 0 ? (
              <TouchableOpacity
                style={[styles.playHeaderBtn, { backgroundColor: colors.primary }]}
                onPress={() => playTrack(favorites[0], favorites)}
                activeOpacity={0.8}
              >
                <Play size={16} color="#070B14" fill="#070B14" />
                <Text style={styles.playHeaderText}>Play All Favorites</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Heart size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No liked songs yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap the heart icon on any song to save it to your local offline library.
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'downloads' && (
        <FlatList
          data={downloadedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          renderItem={({ item, index }) => (
            <TrackCard
              track={item}
              queueContext={downloadedList}
              showIndex={index}
              showDelete={true}
              onDeletePress={handleDeleteDownloaded}
            />
          )}
          ListHeaderComponent={
            downloadedList.length > 0 ? (
              <TouchableOpacity
                style={[styles.playHeaderBtn, { backgroundColor: colors.primary }]}
                onPress={() => playTrack(downloadedList[0], downloadedList)}
                activeOpacity={0.8}
              >
                <Play size={16} color="#070B14" fill="#070B14" />
                <Text style={styles.playHeaderText}>Play All Downloaded Songs</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Download size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No downloaded songs</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap the download button on any song or in the player screen to save it directly to your phone.
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'playlists' && (
        <FlatList
          data={customPlaylists}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <AlbumCard
                album={{
                  id: item.id,
                  name: item.name,
                  artist: `${item.trackCount || item.tracks?.length || 0} songs`,
                  image: item.image,
                  sourceEngine: 'listen_free',
                }}
                size={160}
                onPress={() =>
                  onNavigateDetail({
                    type: 'playlist',
                    id: item.id,
                    title: item.name,
                    subtitle: item.description,
                    image: item.image,
                    itemData: item,
                  })
                }
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ListMusic size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No playlists created</Text>
            </View>
          }
        />
      )}

      {activeTab === 'history' && (
        <FlatList
          data={recentlyPlayed}
          keyExtractor={(item, idx) => `${item.id}_${idx}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          renderItem={({ item, index }) => (
            <TrackCard track={item} queueContext={recentlyPlayed} showIndex={index} />
          )}
          ListHeaderComponent={
            recentlyPlayed.length > 0 ? (
              <View style={styles.historyHeader}>
                <TouchableOpacity
                  onPress={clearHistory}
                  style={styles.clearHistoryBtn}
                >
                  <Trash2 size={14} color={colors.textMuted} />
                  <Text style={[styles.clearHistoryText, { color: colors.textMuted }]}>
                    Clear History
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <History size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No recently played tracks</Text>
            </View>
          }
        />
      )}

      {/* Import Playlist Modal */}
      <ImportPlaylistModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportSuccess={(p) => {
          onNavigateDetail({
            type: 'playlist',
            id: p.id,
            title: p.name,
            image: p.image,
            itemData: p,
          });
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
    gap: 4,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabBarWrapper: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {},
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 120,
  },
  gridItem: {
    flex: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  playHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 14,
    gap: 8,
  },
  playHeaderText: {
    color: '#070B14',
    fontSize: 14,
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
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
