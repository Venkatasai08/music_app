import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Music } from 'lucide-react-native';
import { artworkService } from '../../services/artworkService';

interface TrackArtworkProps {
  imageUri?: string | null;
  title?: string;
  artist?: string;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  iconSize?: number;
  showVinylGroove?: boolean;
}

// Curated harmonious aesthetic gradients for fallback
const DEFAULT_GRADIENTS: [string, string][] = [
  ['#4F46E5', '#7C3AED'], // Indigo - Violet
  ['#EC4899', '#8B5CF6'], // Pink - Purple
  ['#06B6D4', '#3B82F6'], // Cyan - Blue
  ['#10B981', '#059669'], // Emerald - Teal
  ['#F59E0B', '#EF4444'], // Amber - Red
  ['#8B5CF6', '#EC4899'], // Purple - Rose
  ['#14B8A6', '#0EA5E9'], // Teal - Sky
  ['#6366F1', '#D946EF'], // Indigo - Fuchsia
];

function getGradientForTitle(title: string = ''): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DEFAULT_GRADIENTS.length;
  return DEFAULT_GRADIENTS[index];
}

function isValidDirectImageUri(uri?: string | null): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (trimmed.length === 0) return false;
  // Ignore known generic placeholders or broken android albumart content URIs
  if (trimmed.includes('images.unsplash.com')) return false;
  if (trimmed.startsWith('content://media/external/audio/albumart')) return false;
  if (trimmed.startsWith('content://media/external/audio/media/')) return false;
  return true;
}

export const TrackArtwork: React.FC<TrackArtworkProps> = React.memo(({
  imageUri,
  title = '',
  artist = '',
  size = 48,
  borderRadius = 12,
  style,
  imageStyle,
  iconSize,
  showVinylGroove = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string | null>(() => {
    if (isValidDirectImageUri(imageUri)) {
      return imageUri!.trim();
    }
    return artworkService.getCachedArtwork(title, artist);
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update when imageUri or title/artist changes
  useEffect(() => {
    setHasError(false);

    if (isValidDirectImageUri(imageUri)) {
      setResolvedUri(imageUri!.trim());
      return;
    }

    // Check synchronous cache first
    const cached = artworkService.getCachedArtwork(title, artist);
    if (cached) {
      setResolvedUri(cached);
      return;
    }

    // Attempt online resolution if title is provided
    if (title && title.trim().length > 0 && title !== 'Untitled Track') {
      artworkService.resolveArtworkByTitleAndArtist(title, artist).then((art) => {
        if (isMountedRef.current && art) {
          setResolvedUri(art);
        }
      });
    }
  }, [imageUri, title, artist]);

  const gradientColors = useMemo(() => {
    return getGradientForTitle(title || artist);
  }, [title, artist]);

  const calcIconSize = iconSize || Math.max(14, Math.round(size * 0.42));
  const shouldRenderImage = Boolean(resolvedUri) && !hasError;

  const handleImageError = () => {
    setHasError(true);
    // If the image failed to load, attempt to resolve a fresh high-res artwork
    if (title && title.trim().length > 0) {
      artworkService.resolveArtworkByTitleAndArtist(title, artist).then((freshArt) => {
        if (isMountedRef.current && freshArt && freshArt !== resolvedUri) {
          setResolvedUri(freshArt);
          setHasError(false);
        }
      });
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: borderRadius,
        },
        style,
      ]}
    >
      {shouldRenderImage ? (
        <Image
          source={{ uri: resolvedUri! }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: borderRadius,
            },
            imageStyle,
          ]}
          resizeMode="cover"
          onError={handleImageError}
        />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.fallbackContainer,
            {
              width: size,
              height: size,
              borderRadius: borderRadius,
            },
          ]}
        >
          <Music size={calcIconSize} color="#FFFFFF" opacity={0.9} />
          {showVinylGroove && (
            <View
              style={[
                styles.grooveRing,
                {
                  borderRadius: borderRadius,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                },
              ]}
            />
          )}
        </LinearGradient>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#12141F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  grooveRing: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
  },
});
