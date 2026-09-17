import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Music, Sparkles } from 'lucide-react-native';
import { useEngineStore } from '../stores/useEngineStore';
import { useListenFreeStore } from '../stores/useListenFreeStore';
import { useFreefyStore } from '../stores/useFreefyStore';
import { useTuneFreeStore } from '../stores/useTuneFreeStore';
import { useAppTheme } from '../theme';
import { TrackCard } from '../components/cards/TrackCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ArtistCard } from '../components/cards/ArtistCard';
import { RadioCard } from '../components/cards/RadioCard';
import { SearchCategory, DetailScreenParams } from '../types/engine';

interface SearchScreenProps {
  onNavigateDetail: (params: DetailScreenParams) => void;
}

const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'radios', label: 'Live Radios' },
];

const SUGGESTED_QUERIES = [
  'Arijit Singh',
  'Kishore Kumar',
  'Lata Mangeshkar',
  'Mohammed Rafi',
  'Anirudh Ravichander',
  'Taylor Swift',
  'Coldplay',
  '90s Bollywood',
  'Telugu Melody Hits',
  'Tamil Hits',
  'Queen',
  'Lo-Fi Chill',
];

export const SearchScreen: React.FC<SearchScreenProps> = React.memo(({ onNavigateDetail }) => {
  const insets = useSafeAreaInsets();
  const activeEngine = useEngineStore((s) => s.activeEngine);
  const { colors, radius, isListenFree, isFreefy, isTuneFree } = useAppTheme();

  const [inputQuery, setInputQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');

  const lfResults = useListenFreeStore((s) => s.searchResults);
  const lfSearching = useListenFreeStore((s) => s.isSearching);
  const lfSearch = useListenFreeStore((s) => s.search);

  const ffResults = useFreefyStore((s) => s.searchResults);
  const ffSearching = useFreefyStore((s) => s.isSearching);
  const ffSearch = useFreefyStore((s) => s.search);

  const tfResults = useTuneFreeStore((s) => s.searchResults);
  const tfSearching = useTuneFreeStore((s) => s.isSearching);
  const tfSearch = useTuneFreeStore((s) => s.search);
  const tfFetchSuggestions = useTuneFreeStore((s) => s.fetchSuggestions);
  const tfSuggestions = useTuneFreeStore((s) => s.suggestions);

  const isSearching = isListenFree ? lfSearching : isFreefy ? ffSearching : tfSearching;
  const results = isListenFree ? lfResults : isFreefy ? ffResults : tfResults;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputQuery.trim()) {
        if (isListenFree) {
          lfSearch(inputQuery);
        } else if (isFreefy) {
          ffSearch(inputQuery);
        } else {
          tfSearch(inputQuery);
          tfFetchSuggestions(inputQuery);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputQuery, activeEngine, isListenFree, isFreefy, isTuneFree]);

  const handleQuerySelect = (q: string) => {
    setInputQuery(q);
    if (isListenFree) {
      lfSearch(q);
    } else if (isFreefy) {
      ffSearch(q);
    } else {
      tfSearch(q);
    }
  };

  const tracks = results.tracks || [];
  const albums = results.albums || [];
  const artists = results.artists || [];
  const playlists = results.playlists || [];
  const radios = results.radios || [];

  const hasResults =
    tracks.length > 0 ||
    albums.length > 0 ||
    artists.length > 0 ||
    playlists.length > 0 ||
    radios.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar Input */}
      <View style={styles.searchBarContainer}>
        <View
          style={[
            styles.inputBox,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderColor: colors.borderActive,
              borderRadius: radius.full,
            },
          ]}
        >
          <Search size={18} color={colors.primary} />
          <TextInput
            placeholder={
              isListenFree
                ? 'Search songs, 320k tracks, artists, albums...'
                : isFreefy
                ? 'Search tracks, curated channels, live radios...'
                : 'Search TuneFree tracks, artists, playlists...'
            }
            placeholderTextColor={colors.textMuted}
            value={inputQuery}
            onChangeText={setInputQuery}
            style={[styles.input, { color: colors.text }]}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {inputQuery.length > 0 && (
            <TouchableOpacity onPress={() => setInputQuery('')} style={styles.clearBtn}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoriesRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.05)',
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.full,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected ? '#070B14' : colors.textSecondary,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Body: Loading / Suggested / Results */}
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching {isListenFree ? 'ListenFree Multi-Origin Failover Proxy' : 'Freefy Catalog'}...
          </Text>
        </View>
      )}

      {!isSearching && !inputQuery.trim() && (
        <ScrollView
          contentContainerStyle={[
            styles.suggestedContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.suggestedHeader}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={[styles.suggestedTitle, { color: colors.text }]}>Trending & Popular Searches</Text>
          </View>
          <View style={styles.tagGrid}>
            {SUGGESTED_QUERIES.map((q) => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.queryTag,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: colors.border,
                    borderRadius: radius.full,
                  },
                ]}
                onPress={() => handleQuerySelect(q)}
              >
                <Text style={[styles.queryText, { color: colors.text }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {!isSearching && inputQuery.trim() && (
        <ScrollView
          contentContainerStyle={[
            styles.resultsContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Songs Category */}
          {(selectedCategory === 'all' || selectedCategory === 'songs') && tracks.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Songs ({tracks.length})</Text>
              {tracks.map((t, idx) => (
                <TrackCard key={`${t.id}-${idx}`} track={t} queueContext={tracks} showIndex={idx} />
              ))}
            </View>
          )}

          {/* Albums Category */}
          {(selectedCategory === 'all' || selectedCategory === 'albums') && albums.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Albums ({albums.length})</Text>
              <FlatList
                horizontal
                data={albums}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <AlbumCard
                    album={item}
                    onPress={(alb) =>
                      onNavigateDetail({
                        type: 'album',
                        id: alb.id,
                        title: alb.name,
                        subtitle: alb.artist,
                        image: alb.image,
                        itemData: alb,
                      })
                    }
                  />
                )}
              />
            </View>
          )}

          {/* Artists Category */}
          {(selectedCategory === 'all' || selectedCategory === 'artists') && artists.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Artists ({artists.length})</Text>
              <FlatList
                horizontal
                data={artists}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ArtistCard
                    artist={item}
                    onPress={(art) =>
                      onNavigateDetail({
                        type: 'artist',
                        id: art.id,
                        title: art.name,
                        image: art.image,
                        itemData: art,
                      })
                    }
                  />
                )}
              />
            </View>
          )}

          {/* Playlists Category */}
          {(selectedCategory === 'all' || selectedCategory === 'playlists') && playlists.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Playlists ({playlists.length})</Text>
              <FlatList
                horizontal
                data={playlists}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <AlbumCard
                    album={{
                      id: item.id,
                      name: item.name,
                      artist: `${item.trackCount || 50} Songs`,
                      image: item.image,
                      sourceEngine: isListenFree ? 'listen_free' : 'freefy',
                    }}
                    onPress={() =>
                      onNavigateDetail({
                        type: 'playlist',
                        id: item.id,
                        title: item.name,
                        subtitle: 'Curated Playlist',
                        image: item.image,
                        itemData: item,
                      })
                    }
                  />
                )}
              />
            </View>
          )}

          {/* Live Radios Category (Freefy) */}
          {(selectedCategory === 'all' || selectedCategory === 'radios') && radios.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Radios ({radios.length})</Text>
              {radios.map((r: any) => (
                <RadioCard key={r.id} radio={r} />
              ))}
            </View>
          )}

          {!hasResults && (
            <View style={styles.emptyResults}>
              <Music size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching music found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try searching for a different song title or artist name.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  categoriesRow: {
    paddingBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestedContainer: {
    padding: 20,
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  queryTag: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  queryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  resultSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  emptyResults: {
    paddingVertical: 80,
    alignItems: 'center',
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
  },
});
