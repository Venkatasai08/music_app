import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Trash2, Music2, X, Volume2 } from 'lucide-react-native';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAppTheme, getEngineTheme } from '../../theme';
import { Track } from '../../types/music';
import { extractString } from '../../utils/audioUtils';

interface QueueDrawerProps {
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = React.memo(({ onClose }) => {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentEngine = usePlayerStore((s) => s.currentTrack?.sourceEngine);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { radius } = useAppTheme();
  const activeTheme = getEngineTheme(currentEngine);

  const handleClear = React.useCallback(() => {
    usePlayerStore.getState().clearQueue();
  }, []);

  const handlePlay = React.useCallback((item: Track) => {
    usePlayerStore.getState().playTrack(item);
  }, []);

  const handleRemove = React.useCallback((index: number) => {
    usePlayerStore.getState().removeFromQueue(index);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#0D0E16' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <View>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Up Next Queue</Text>
          <Text style={[styles.count, { color: activeTheme.primary }]}>{queue.length} Tracks In Queue</Text>
        </View>

        <View style={styles.headerActions}>
          {queue.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.clearBtn, { borderColor: `${activeTheme.primary}55`, backgroundColor: `${activeTheme.primary}15` }]}
            >
              <Trash2 size={13} color={activeTheme.primary} />
              <Text style={[styles.clearText, { color: activeTheme.primary }]}>Clear</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Queue List */}
      <FlatList
        data={queue}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const isCurrent = index === queueIndex;
          const itemEngineTheme = getEngineTheme(item.sourceEngine || currentEngine);
          const itemName = extractString(item.name, 'Untitled');
          const itemArtist = extractString(item.artist, 'Unknown Artist');

          return (
            <TouchableOpacity
              style={[
                styles.itemRow,
                {
                  backgroundColor: isCurrent ? `${itemEngineTheme.primary}18` : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: radius.md,
                  borderLeftWidth: isCurrent ? 3.5 : 0,
                  borderLeftColor: itemEngineTheme.primary,
                  borderColor: isCurrent ? `${itemEngineTheme.primary}33` : 'transparent',
                  borderWidth: isCurrent ? 1 : 0,
                },
              ]}
              onPress={() => handlePlay(item)}
              activeOpacity={0.7}
            >
              <Image
                source={{
                  uri:
                    item.image ||
                    item.thumbnailImage ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
                }}
                style={styles.itemArt}
              />
              <View style={styles.itemInfo}>
                <Text
                  numberOfLines={1}
                  style={[styles.itemTitle, { color: isCurrent ? itemEngineTheme.primary : '#FFFFFF' }]}
                >
                  {itemName}
                </Text>
                <Text numberOfLines={1} style={[styles.itemArtist, { color: isCurrent ? `${itemEngineTheme.primary}CC` : 'rgba(255, 255, 255, 0.5)' }]}>
                  {itemArtist}
                </Text>
              </View>

              {isCurrent && isPlaying && (
                <View style={[styles.playingIndicator, { backgroundColor: `${itemEngineTheme.primary}25` }]}>
                  <Volume2 size={14} color={itemEngineTheme.primary} />
                </View>
              )}

              <TouchableOpacity
                onPress={() => handleRemove(index)}
                style={styles.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="rgba(255, 255, 255, 0.4)" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Music2 size={32} color="rgba(255, 255, 255, 0.2)" />
            <Text style={[styles.emptyText, { color: 'rgba(255, 255, 255, 0.45)' }]}>Queue is empty</Text>
          </View>
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  count: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 999,
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 4,
    gap: 12,
  },
  itemArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemArtist: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  playingIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
