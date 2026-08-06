import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import { api } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import { colors, radius, spacing } from '../../theme/colors';

const ICONS = {
  new_application: 'document-text-outline',
  contact_unlocked: 'lock-open-outline',
  direct_message: 'chatbubble-outline',
  job_expiring_soon: 'time-outline',
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUnreadCount } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { notifications: fetched } = await api.get('/notifications');
          if (active) setNotifications(fetched);
          api
            .post('/notifications/read-all')
            .then(refreshUnreadCount)
            .catch(() => {});
        } catch (err) {
          console.warn(err.message);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notificações" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>Ainda sem notificações.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.row, !item.read && styles.unreadRow]}>
              <View style={styles.iconWrap}>
                <Ionicons name={ICONS[item.type] || 'notifications-outline'} size={18} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  unreadRow: { borderColor: colors.teal },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: 11, color: colors.placeholder, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl },
});
