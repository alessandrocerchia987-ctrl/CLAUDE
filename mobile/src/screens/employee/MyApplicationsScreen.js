import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import { api } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';

export default function MyApplicationsScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { applications: fetched } = await api.get('/applications/mine');
          if (active) setApplications(fetched);
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
      <ScreenHeader title="As Minhas Candidaturas" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.job.id}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>Ainda não se candidatou a nenhuma vaga.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('JobDetail', { jobId: item.job.id })}
            >
              <View style={styles.photoWrap}>
                {item.job.photoUrl ? (
                  <Image source={{ uri: item.job.photoUrl }} style={styles.photo} contentFit="cover" />
                ) : (
                  <View style={styles.placeholder}>
                    <Ionicons name="briefcase" size={22} color={colors.white} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.job.title}</Text>
                <Text style={styles.employer} numberOfLines={1}>{item.job.employer?.name}</Text>
                <Text style={styles.date}>Candidatou-se em {new Date(item.appliedAt).toLocaleDateString('pt-PT')}</Text>
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
  photoWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.navy,
  },
  photo: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  employer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  date: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl },
});
