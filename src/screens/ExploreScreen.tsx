import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Radio, Plus, Globe, Sparkles, Disc3 } from 'lucide-react-native';
import { useEngineStore } from '../stores/useEngineStore';
import { useListenFreeStore } from '../stores/useListenFreeStore';
import { useFreefyStore } from '../stores/useFreefyStore';
import { useTuneFreeStore } from '../stores/useTuneFreeStore';
import { useAppTheme } from '../theme';
import { RoomCard } from '../components/cards/RoomCard';
import { RadioCard } from '../components/cards/RadioCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { Button } from '../components/common/Button';
import { CreateRoomModal } from '../components/modals/CreateRoomModal';
import { SupabaseRoomMetadata } from '../types/supabase';
import { DetailScreenParams } from '../types/engine';

interface ExploreScreenProps {
  onNavigateDetail: (params: DetailScreenParams) => void;
}

const RADIO_GENRES = [
  { key: null, label: 'All Genres' },
  { key: 'pop', label: 'Pop' },
  { key: 'rock', label: 'Rock' },
  { key: 'electronic', label: 'Electronic' },
  { key: 'jazz', label: 'Jazz' },
  { key: 'classical', label: 'Classical' },
  { key: 'dance', label: 'Dance' },
];

export const ExploreScreen: React.FC<ExploreScreenProps> = React.memo(({ onNavigateDetail }) => {
  const insets = useSafeAreaInsets();
  const activeEngine = useEngineStore((s) => s.activeEngine);
  const { colors, radius, isListenFree, isFreefy, isTuneFree } = useAppTheme();

  // ListenFree state
  const liveRooms = useListenFreeStore((s) => s.liveRooms);
  const isRoomsLoading = useListenFreeStore((s) => s.isRoomsLoading);
  const fetchLiveRooms = useListenFreeStore((s) => s.fetchLiveRooms);
  const [createRoomVisible, setCreateRoomVisible] = useState(false);

  // Freefy state
  const liveRadios = useFreefyStore((s) => s.liveRadios);
  const countries = useFreefyStore((s) => s.countries);
  const selectedCountry = useFreefyStore((s) => s.selectedCountry);
  const selectedTag = useFreefyStore((s) => s.selectedTag);
  const isRadiosLoading = useFreefyStore((s) => s.isRadiosLoading);
  const fetchLiveRadios = useFreefyStore((s) => s.fetchLiveRadios);
  const filterRadiosByCountry = useFreefyStore((s) => s.filterRadiosByCountry);
  const filterRadiosByTag = useFreefyStore((s) => s.filterRadiosByTag);

  // TuneFree state
  const tuneFreeExplore = useTuneFreeStore((s) => s.exploreSections);
  const isTuneFreeLoading = useTuneFreeStore((s) => s.isLoading);
  const fetchTuneFreeFeed = useTuneFreeStore((s) => s.fetchBrowseFeed);

  useEffect(() => {
    if (isListenFree) {
      fetchLiveRooms();
    } else if (isFreefy) {
      fetchLiveRadios();
    } else {
      fetchTuneFreeFeed();
    }
  }, [activeEngine, isListenFree, isFreefy, isTuneFree]);

  const isLoading = isListenFree ? isRoomsLoading : isFreefy ? isRadiosLoading : isTuneFreeLoading;

  const handleJoinRoom = (room: SupabaseRoomMetadata) => {
    onNavigateDetail({
      type: 'room',
      id: room.id,
      title: room.space_name || 'Listening Space',
      subtitle: `Hosted by ${room.user_id?.substring(0, 10)}`,
      itemData: room,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, { borderBottomColor: colors.border }]}>
        <View>
          <View style={styles.titleRow}>
            {isListenFree ? (
              <Users size={22} color={colors.primary} />
            ) : isFreefy ? (
              <Radio size={22} color={colors.primary} />
            ) : (
              <Sparkles size={22} color={colors.primary} />
            )}
            <Text style={[styles.title, { color: colors.text }]}>
              {isListenFree
                ? 'Live Party Rooms'
                : isFreefy
                ? 'Global Live Radios'
                : 'TuneFree Explore'}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isListenFree
              ? 'Real-time collaborative audio spaces powered by Supabase.'
              : isFreefy
              ? 'Tune into thousands of global live radio streams in real time.'
              : 'Discover viral hits, curated explore playlists & trending artists.'}
          </Text>
        </View>

        {isListenFree && (
          <Button
            title="Create"
            icon={<Plus size={16} color="#070B14" />}
            size="sm"
            onPress={() => setCreateRoomVisible(true)}
          />
        )}
      </View>

      {/* Freefy Filter Bars */}
      {!isListenFree && (
        <View style={styles.filtersSection}>
          {/* Countries Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: !selectedCountry ? colors.primary : 'rgba(255, 255, 255, 0.05)',
                  borderColor: !selectedCountry ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
              onPress={() => filterRadiosByCountry(null)}
            >
              <Globe size={12} color={!selectedCountry ? '#070B14' : colors.textSecondary} />
              <Text
                style={[
                  styles.filterText,
                  { color: !selectedCountry ? '#070B14' : colors.textSecondary },
                ]}
              >
                Worldwide
              </Text>
            </TouchableOpacity>

            {countries.map((c) => {
              const isSelected = selectedCountry === c.code;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    },
                  ]}
                  onPress={() => filterRadiosByCountry(c.code)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: isSelected ? '#070B14' : colors.textSecondary },
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Genre Tags Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterScroll, { marginTop: 8 }]}
          >
            {RADIO_GENRES.map((g) => {
              const isSelected = selectedTag === g.key;
              return (
                <TouchableOpacity
                  key={String(g.key)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? colors.accent : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderRadius: radius.full,
                    },
                  ]}
                  onPress={() => filterRadiosByTag(g.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: isSelected ? '#070B14' : colors.textSecondary },
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {isListenFree ? 'Connecting to Supabase rooms...' : 'Loading live stations...'}
          </Text>
        </View>
      ) : isListenFree ? (
        <FlatList
          data={liveRooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          renderItem={({ item }) => <RoomCard room={item} onJoinPress={handleJoinRoom} />}
          refreshControl={
            <RefreshControl
              refreshing={isRoomsLoading}
              onRefresh={fetchLiveRooms}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No active listening rooms</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Be the first to create a live listening space with Supabase!
              </Text>
              <Button
                title="Create Room Now"
                variant="primary"
                onPress={() => setCreateRoomVisible(true)}
                style={{ marginTop: 16 }}
              />
            </View>
          }
        />
      ) : isTuneFree ? (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isTuneFreeLoading}
              onRefresh={() => fetchTuneFreeFeed(true)}
              tintColor={colors.primary}
            />
          }
        >
          {tuneFreeExplore.length > 0 ? (
            tuneFreeExplore.map((sec, idx) => (
              <View key={`tf-exp-${idx}`} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                  {sec.title}
                </Text>
                <FlatList
                  horizontal
                  data={sec.items}
                  keyExtractor={(it) => `${it.id}-${idx}`}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <AlbumCard
                      album={{
                        id: item.id,
                        name: item.name,
                        artist: item.subtitle || 'TuneFree Playlist',
                        image: item.image || '',
                        sourceEngine: 'tune_free',
                      }}
                      onPress={() =>
                        onNavigateDetail({
                          type:
                            item.model_type === 'album'
                              ? 'album'
                              : item.model_type === 'artist'
                              ? 'artist'
                              : item.model_type === 'track'
                              ? 'track'
                              : 'playlist',
                          id: item.id,
                          title: item.name,
                          subtitle: item.subtitle,
                          image: item.image,
                          itemData: item,
                        })
                      }
                    />
                  )}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Disc3 size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Explore Playlists</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Pull down to refresh and fetch the latest TuneFree explore items.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={liveRadios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          renderItem={({ item }) => <RadioCard radio={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRadiosLoading}
              onRefresh={fetchLiveRadios}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Radio size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No stations found</Text>
            </View>
          }
        />
      )}

      {/* Supabase Create Room Dialog */}
      <CreateRoomModal
        visible={createRoomVisible}
        onClose={() => setCreateRoomVisible(false)}
        onRoomCreated={handleJoinRoom}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    maxWidth: 240,
    lineHeight: 16,
  },
  filtersSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
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
