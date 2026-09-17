// Supabase Collaborative Room Creator Modal

import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, X } from 'lucide-react-native';
import { useListenFreeStore } from '../../stores/useListenFreeStore';
import { useAppTheme } from '../../theme';
import { Button } from '../common/Button';

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onRoomCreated?: (room: any) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = React.memo(({
  visible,
  onClose,
  onRoomCreated,
}) => {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const createLiveRoom = useListenFreeStore((s) => s.createLiveRoom);
  const { colors, radius } = useAppTheme();

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setLoading(true);
    try {
      const room = await createLiveRoom(roomName.trim());
      if (room) {
        setRoomName('');
        onClose();
        if (onRoomCreated) onRoomCreated(room);
      }
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
              <Users size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Create Live Party Room</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Host a real-time collaborative listening space on Supabase. Friends can queue songs and sync playback.
          </Text>

          <TextInput
            placeholder="Room Name (e.g. Midnight Cyber Beats)"
            placeholderTextColor={colors.textMuted}
            value={roomName}
            onChangeText={setRoomName}
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

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Launch Room"
              variant="primary"
              loading={loading}
              disabled={!roomName.trim()}
              onPress={handleCreate}
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
    fontSize: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
