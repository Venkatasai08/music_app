// Live Collaborative Listening Room Card (Supabase Backend)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, Disc3, ArrowRight } from 'lucide-react-native';
import { SupabaseRoomMetadata } from '../../types/supabase';
import { useAppTheme } from '../../theme';
import { Badge } from '../common/Badge';

interface RoomCardProps {
  room: SupabaseRoomMetadata;
  onJoinPress: (room: SupabaseRoomMetadata) => void;
}

export const RoomCard: React.FC<RoomCardProps> = React.memo(({ room, onJoinPress }) => {
  const { colors, radius } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardGlass,
          borderColor: colors.cardBorder,
          borderRadius: radius.md,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.avatarGlow, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
            <Disc3 size={20} color={colors.primary} />
          </View>
          <View>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
              {room.space_name || 'Chill Lounge'}
            </Text>
            <Text style={[styles.hostText, { color: colors.textSecondary }]}>
              Hosted by {room.user_id?.substring(0, 10) || 'Anonymous'}
            </Text>
          </View>
        </View>

        <Badge label="LIVE SPACE" variant="live" />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.bottomRow}>
        <View style={styles.participants}>
          <Users size={14} color={colors.primary} />
          <Text style={[styles.participantCount, { color: colors.text }]}>
            {room.no_of_people || 1} listening together
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, { backgroundColor: colors.primary, borderRadius: radius.full }]}
          onPress={() => onJoinPress(room)}
          activeOpacity={0.8}
        >
          <Text style={[styles.joinText, { color: '#070B14' }]}>Join Room</Text>
          <ArrowRight size={14} color="#070B14" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarGlow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  hostText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
