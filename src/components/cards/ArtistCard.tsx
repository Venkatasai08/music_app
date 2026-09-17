import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Artist } from '../../types/music';
import { useAppTheme } from '../../theme';
import { formatNumberCompact, extractString } from '../../utils/audioUtils';

interface ArtistCardProps {
  artist: Artist;
  onPress: (artist: Artist) => void;
  size?: number;
}

export const ArtistCard: React.FC<ArtistCardProps> = React.memo(({ artist, onPress, size = 96 }) => {
  const { colors } = useAppTheme();
  const artistName = extractString(artist.name, 'Artist');

  return (
    <TouchableOpacity
      style={[styles.container, { width: size }]}
      onPress={() => onPress(artist)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Image
          source={{ uri: artist.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
          style={styles.avatar}
        />
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {artistName}
      </Text>
      {artist.followerCount ? (
        <Text numberOfLines={1} style={styles.followers}>
          {formatNumberCompact(artist.followerCount)} fans
        </Text>
      ) : (
        <Text numberOfLines={1} style={styles.followers}>
          Artist
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
    alignItems: 'center',
  },
  avatarContainer: {
    backgroundColor: '#161822',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  followers: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
  },
});
