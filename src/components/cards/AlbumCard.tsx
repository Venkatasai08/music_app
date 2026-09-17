import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { Album } from '../../types/music';
import { useAppTheme } from '../../theme';
import { extractString } from '../../utils/audioUtils';

interface AlbumCardProps {
  album: Album;
  onPress: (album: Album) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const FALLBACK_ALBUM_IMG =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80';

export const AlbumCard: React.FC<AlbumCardProps> = React.memo(({ album, onPress, size = 130, style }) => {
  const { colors, radius } = useAppTheme();
  const [imgUri, setImgUri] = React.useState(album.image || FALLBACK_ALBUM_IMG);

  React.useEffect(() => {
    setImgUri(album.image || FALLBACK_ALBUM_IMG);
  }, [album.image]);

  const albumName = extractString(album.name, 'Album');
  const albumArtist = extractString(album.artist || album.year, '');

  return (
    <TouchableOpacity
      style={[styles.container, { width: size }, style]}
      onPress={() => onPress(album)}
      activeOpacity={0.8}
    >
      <View style={[styles.imageContainer, { width: size, height: size, borderRadius: 18 }]}>
        <Image
          source={{ uri: imgUri }}
          style={styles.image}
          onError={() => setImgUri(FALLBACK_ALBUM_IMG)}
        />
        <LinearGradient
          colors={['transparent', 'rgba(9, 10, 15, 0.6)']}
          style={styles.imageGradient}
        />
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {albumName}
      </Text>
      {albumArtist ? (
        <Text numberOfLines={1} style={styles.artist}>
          {albumArtist}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
  },
  imageContainer: {
    backgroundColor: '#161822',
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  artist: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
