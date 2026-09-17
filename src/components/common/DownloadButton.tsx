// Download Button Component with Animated Progress and Media Library Integration

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Track } from '../../types/music';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAppTheme, getEngineTheme } from '../../theme';

interface DownloadButtonProps {
  track: Track;
  size?: number;
  showLabel?: boolean;
  style?: any;
}

export const DownloadButton: React.FC<DownloadButtonProps> = React.memo(({
  track,
  size = 22,
  showLabel = false,
  style,
}) => {
  const { colors } = useAppTheme();
  const trackTheme = getEngineTheme(track?.sourceEngine);
  const preferredQuality = usePlayerStore((s) => s.preferredQuality);
  const downloaded = useDownloadStore((s) => Boolean(s.downloadedTracks[track?.id]));
  const progress = useDownloadStore((s) => s.downloadingProgress[track?.id] ?? null);
  const isDownloading = progress !== null;

  const handlePress = async () => {
    if (isDownloading) return;

    if (downloaded) {
      Alert.alert(
        'Downloaded',
        `"${track.name}" is already saved in your device's Music Library and phone gallery.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const success = await useDownloadStore.getState().downloadTrack(track, preferredQuality);
    if (success) {
      Alert.alert(
        'Download Complete',
        `"${track.name}" by ${track.artist} has been saved to your phone's Music gallery!`,
        [{ text: 'Great!' }]
      );
    } else {
      Alert.alert(
        'Download Failed',
        'Could not save this track. Please check your network and storage permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isDownloading) {
    const percent = Math.round((progress ?? 0) * 100);
    return (
      <View style={[styles.downloadingContainer, style]}>
        <ActivityIndicator size="small" color={trackTheme.primary} />
        {showLabel && (
          <Text style={[styles.progressText, { color: trackTheme.primary }]}>{percent}%</Text>
        )}
      </View>
    );
  }

  if (downloaded) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.btn, style]}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <CheckCircle2 size={size} color={trackTheme.primary} />
        {showLabel && (
          <Text style={[styles.label, { color: trackTheme.primary }]}>Saved</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.btn, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Download size={size} color={colors.textSecondary} />
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>Download</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    zIndex: 20,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    zIndex: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
