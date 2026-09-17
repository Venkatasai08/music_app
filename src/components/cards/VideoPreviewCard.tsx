import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Play } from 'lucide-react-native';
import { VideoPreview } from '../../types/music';
import { useAppTheme } from '../../theme';
import { extractString } from '../../utils/audioUtils';

interface VideoPreviewCardProps {
  video: VideoPreview;
  onPress: (video: VideoPreview) => void;
  style?: StyleProp<ViewStyle>;
  width?: number;
  height?: number;
}

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80';

export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = React.memo(({
  video,
  onPress,
  style,
  width: customWidth,
  height: customHeight,
}) => {
  const { radius } = useAppTheme();
  const [imgUri, setImgUri] = React.useState(video.thumbnailUrl || FALLBACK_THUMBNAIL);

  React.useEffect(() => {
    if (video.thumbnailUrl) {
      setImgUri(video.thumbnailUrl);
    }
  }, [video.thumbnailUrl]);

  const videoTitle = extractString(video.title, 'Video');
  const videoArtist = extractString(video.artist, '');

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderRadius: radius.md },
        customWidth ? { width: customWidth } : null,
        customHeight ? { height: customHeight } : null,
        style,
      ]}
      onPress={() => onPress(video)}
      activeOpacity={0.8}
    >
      <View style={[styles.thumbnailContainer, { borderRadius: radius.md }]}>
        <Image
          source={{ uri: imgUri }}
          style={styles.thumbnail}
          onError={() => setImgUri(FALLBACK_THUMBNAIL)}
        />
        <View style={styles.playBadge}>
          <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <View style={styles.overlay}>
          <Text numberOfLines={1} style={styles.title}>
            {videoTitle}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {videoArtist}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 190,
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  artist: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
