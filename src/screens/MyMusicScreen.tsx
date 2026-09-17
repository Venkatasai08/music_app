import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library/legacy';
import {
  HardDrive,
  Download,
  Play,
  Shuffle,
  RefreshCw,
  Search,
  X,
  Trash2,
  Music,
  Folder,
  Scissors,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useAppTheme } from '../theme';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { TrackCard } from '../components/cards/TrackCard';
import { Track } from '../types/music';
import { formatTime } from '../utils/audioUtils';
import { artworkService, cleanDeviceTrackInfo } from '../services/artworkService';

type MyMusicTab = 'downloads' | 'device_audio';

export const MyMusicScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [activeTab, setActiveTab] = useState<MyMusicTab>('downloads');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanningDevice, setIsScanningDevice] = useState(false);
  const [deviceAudioTracks, setDeviceAudioTracks] = useState<Track[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const downloadedTracks = useDownloadStore((s) => s.downloadedTracks);
  const removeDownloadedTrack = useDownloadStore((s) => s.removeDownloadedTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);

  // App Downloaded tracks list (sorted by most recently downloaded first)
  const downloadedList: Track[] = useMemo(() => {
    return Object.values(downloadedTracks)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .map((d) => d.track)
      .filter(Boolean);
  }, [downloadedTracks]);

  // Scan Device Audio Files via expo-media-library (sorted by most recently created/modified first)
  const scanDeviceAudio = useCallback(async () => {
    setIsScanningDevice(true);
    try {
      if (Platform.OS === 'android') {
        try {
          if (Platform.Version >= 33) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
              {
                title: 'Audio Files Permission',
                message: 'Music App needs access to your device storage to play your phone audios.',
                buttonNeutral: 'Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'Grant',
              }
            );
          } else {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
              {
                title: 'Storage Permission',
                message: 'Music App needs access to your storage to play your phone audios.',
                buttonNeutral: 'Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'Grant',
              }
            );
          }
        } catch (err) {
          console.warn('[MyMusic] Android permission error:', err);
        }
      }

      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
      if (status !== 'granted') {
        setHasPermission(false);
        setIsScanningDevice(false);
        return;
      }
      setHasPermission(true);

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: ['audio'],
        first: 2000,
        sortBy: [['creationTime', false]],
      });

      if (media && media.assets) {
        const localTracks: Track[] = media.assets
          .filter((asset) => {
            const filename = (asset.filename || '').toLowerCase();
            return (
              asset.mediaType === 'audio' ||
              filename.endsWith('.mp3') ||
              filename.endsWith('.m4a') ||
              filename.endsWith('.aac') ||
              filename.endsWith('.flac') ||
              filename.endsWith('.wav') ||
              filename.endsWith('.ogg') ||
              filename.endsWith('.opus')
            );
          })
          .map((asset) => {
            // Intelligently clean filename to extract real artist and title
            const { title: cleanTitle, artist: cleanArtist } = cleanDeviceTrackInfo(
              asset.filename || '',
              asset.albumId ? undefined : undefined
            );

            // Check if we already have this artwork in cache
            const cachedArt = artworkService.getCachedArtwork(cleanTitle, cleanArtist);

            const timestamp = Math.max(
              asset.modificationTime || 0,
              asset.creationTime || 0
            );

            return {
              id: `device_${asset.id}`,
              name: cleanTitle || 'Local Audio Track',
              artist: cleanArtist || 'Phone Audio',
              duration: Math.round(asset.duration || 0),
              streamUrl: asset.uri,
              image: cachedArt || '',
              thumbnailImage: cachedArt || '',
              sourceEngine: 'listen_free' as const,
              _fileTimestamp: timestamp,
            };
          })
          .sort((a: any, b: any) => (b._fileTimestamp || 0) - (a._fileTimestamp || 0));

        setDeviceAudioTracks(localTracks);

        // Batch resolve authentic artwork in background with progressive UI updates
        artworkService.resolveDeviceTracksArtwork(localTracks, (trackId, artworkUrl) => {
          setDeviceAudioTracks((prev) =>
            prev.map((t) =>
              t.id === trackId ? { ...t, image: artworkUrl, thumbnailImage: artworkUrl } : t
            )
          );
        });
      }
    } catch (e) {
      console.warn('[MyMusic] Failed to scan device audio:', e);
    } finally {
      setIsScanningDevice(false);
    }
  }, []);

  useEffect(() => {
    scanDeviceAudio();
  }, [scanDeviceAudio]);

  // Active list based on selected sub-tab
  const currentList = activeTab === 'downloads' ? downloadedList : deviceAudioTracks;

  // Filtered by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase();
    return currentList.filter(
      (t) => t.name.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [currentList, searchQuery]);

  // Handle Delete Downloaded Track
  const handleDeleteDownload = (track: Track) => {
    Alert.alert(
      'Delete Downloaded Track',
      `Delete "${track.name}" from your phone's offline storage?`,
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
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>My Music</Text>
          <Text style={styles.screenSubtitle}>
            {downloadedList.length} Downloaded • {deviceAudioTracks.length} On-Device Audios
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={scanDeviceAudio}
          disabled={isScanningDevice}
          activeOpacity={0.7}
        >
          {isScanningDevice ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Segment Tabs: Downloads / Device Audio */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[
            styles.segmentPill,
            activeTab === 'downloads' && [
              styles.segmentPillActive,
              { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('downloads')}
          activeOpacity={0.7}
        >
          <Download
            size={14}
            color={activeTab === 'downloads' ? colors.primary : 'rgba(255, 255, 255, 0.5)'}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'downloads' ? colors.primary : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            Downloaded ({downloadedList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentPill,
            activeTab === 'device_audio' && [
              styles.segmentPillActive,
              { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('device_audio')}
          activeOpacity={0.7}
        >
          <HardDrive
            size={14}
            color={activeTab === 'device_audio' ? colors.primary : 'rgba(255, 255, 255, 0.5)'}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'device_audio' ? colors.primary : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            All Phone Audio ({deviceAudioTracks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Filter Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color="rgba(255, 255, 255, 0.4)" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search in ${activeTab === 'downloads' ? 'downloads' : 'device music'}...`}
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

      {/* Track List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          filteredList.length > 0 ? (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.playAllBtn, { backgroundColor: colors.primary }]}
                onPress={() => playTrack(filteredList[0], filteredList)}
                activeOpacity={0.8}
              >
                <Play size={14} color="#070B14" fill="#070B14" />
                <Text style={styles.playAllText}>Play All ({filteredList.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shuffleBtn}
                onPress={() => {
                  const shuffled = [...filteredList].sort(() => Math.random() - 0.5);
                  playTrack(shuffled[0], shuffled);
                }}
                activeOpacity={0.8}
              >
                <Shuffle size={14} color="#FFFFFF" />
                <Text style={styles.shuffleText}>Shuffle</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            {activeTab === 'downloads' ? (
              <>
                <Download size={48} color="rgba(255, 255, 255, 0.2)" />
                <Text style={styles.emptyStateTitle}>No downloaded songs yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Download songs in 320k / 160k high quality from the 3-dots menu to listen completely offline anytime!
                </Text>
              </>
            ) : hasPermission === false ? (
              <>
                <Folder size={48} color="rgba(255, 255, 255, 0.2)" />
                <Text style={styles.emptyStateTitle}>Storage Permission Needed</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Please grant media/audio permission to scan and play audio files from your device.
                </Text>
                <TouchableOpacity
                  style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                  onPress={scanDeviceAudio}
                >
                  <Text style={styles.permissionBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Folder size={48} color="rgba(255, 255, 255, 0.2)" />
                <Text style={styles.emptyStateTitle}>No audio files found on device</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Add MP3/M4A music files to your device storage or download songs in the app.
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackCard
            track={item}
            queueContext={filteredList}
            showIndex={index}
            showDelete={activeTab === 'downloads'}
            onDeletePress={activeTab === 'downloads' ? handleDeleteDownload : undefined}
          />
        )}
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
  refreshBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    marginBottom: 10,
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  playAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070B14',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  shuffleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
  permissionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 8,
  },
  permissionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070B14',
  },
});
