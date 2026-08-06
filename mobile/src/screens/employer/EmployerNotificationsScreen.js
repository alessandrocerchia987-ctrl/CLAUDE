import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import { api } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import { colors, radius, spacing } from '../../theme/colors';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

export default function EmployerNotificationsScreen({ navigation }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUnreadCount } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { applicants: fetched } = await api.get('/applications/received');
          if (active) setApplicants(fetched);
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
          data={applicants}
          keyExtractor={(item) => item.applicationId}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>Ainda não recebeu candidaturas.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('CandidateDetail', { candidateId: item.candidate.id })}
            >
              <Avatar uri={item.candidate.photoUrl} size={46} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.title}>
                  <Text style={styles.name}>{item.candidate.name}</Text> candidatou-se à sua vaga
                </Text>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.jobTitle}</Text>
                <Text style={styles.time}>{timeAgo(item.appliedAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
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
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 13, color: colors.text },
  name: { fontWeight: '700' },
  jobTitle: { fontSize: 12, color: colors.teal, fontWeight: '600', marginTop: 2 },
  time: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl },
});
