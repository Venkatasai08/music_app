// Freefy External Playlist Importer Modal (Spotify & YouTube)

import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { DownloadCloud, X, CheckCircle, AlertCircle } from 'lucide-react-native';
import { freefyApi } from '../../api/freefyApi';
import { useAppTheme } from '../../theme';
import { Button } from '../common/Button';

interface ImportPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSuccess?: (playlist: any) => void;
}

export const ImportPlaylistModal: React.FC<ImportPlaylistModalProps> = React.memo(({
  visible,
  onClose,
  onImportSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const { colors, radius } = useAppTheme();

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await freefyApi.importExternalPlaylist(url.trim());
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        if (onImportSuccess && res.playlist) {
          onImportSuccess(res.playlist);
        }
        setTimeout(() => {
          setUrl('');
          setFeedback(null);
          onClose();
        }, 1400);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || 'Import failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.cardBorder,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <DownloadCloud size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Import Playlist</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Paste a public Spotify or YouTube playlist link to automatically convert and import it into your Freefy library.
          </Text>

          <TextInput
            placeholder="https://open.spotify.com/playlist/..."
            placeholderTextColor={colors.textMuted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            style={[
              styles.input,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: colors.border,
                color: colors.text,
                borderRadius: radius.md,
              },
            ]}
          />

          {feedback && (
            <View
              style={[
                styles.feedbackRow,
                {
                  backgroundColor:
                    feedback.type === 'success'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  borderRadius: radius.sm,
                },
              ]}
            >
              {feedback.type === 'success' ? (
                <CheckCircle size={16} color="#10B981" />
              ) : (
                <AlertCircle size={16} color="#EF4444" />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  { color: feedback.type === 'success' ? '#10B981' : '#EF4444' },
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Import"
              variant="primary"
              loading={loading}
              disabled={!url.trim()}
              onPress={handleImport}
              style={{ flex: 1.2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    marginBottom: 14,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
