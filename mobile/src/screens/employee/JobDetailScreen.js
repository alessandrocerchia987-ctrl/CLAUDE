import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import VerifiedBadge from '../../components/VerifiedBadge';
import Avatar from '../../components/Avatar';
import { api, ApiError } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { job: fetched } = await api.get(`/jobs/${jobId}`);
        setJob(fetched);
      } catch (err) {
        Alert.alert('Erro', err.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  async function handleApply() {
    setApplying(true);
    try {
      // TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this call — free for now.
      await api.post('/applications', { jobId });
      setApplied(true);
      Alert.alert('Candidatura enviada', 'O empregador foi notificado da sua candidatura.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setApplied(true);
      } else {
        Alert.alert('Não foi possível candidatar-se', err.message);
      }
    } finally {
      setApplying(false);
    }
  }

  async function handleReport() {
    try {
      await api.post(`/jobs/${jobId}/report`);
      Alert.alert('Obrigado', 'A vaga foi reportada para revisão.');
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  }

  if (loading || !job) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Vaga" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Vaga"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handleReport} hitSlop={10}>
            <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {job.photoUrl ? (
          <Image source={{ uri: job.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : null}

        <View style={styles.content}>
          <Text style={styles.title}>{job.title}</Text>

          <View style={styles.employerRow}>
            <Avatar uri={job.employer?.photoUrl} size={40} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <View style={styles.employerNameRow}>
                <Text style={styles.employerName}>{job.employer?.name}</Text>
                {job.employer?.verified ? <VerifiedBadge size={13} /> : null}
              </View>
              {job.employer?.location ? <Text style={styles.employerLocation}>{job.employer.location}</Text> : null}
            </View>
          </View>

          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{job.sector}</Text>
            </View>
            {job.availability ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{job.availability}</Text>
              </View>
            ) : null}
          </View>

          {job.location ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
          ) : null}

          {job.payText ? (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, styles.pay]}>{job.payText}</Text>
            </View>
          ) : null}

          {job.requirements ? (
            <>
              <Text style={styles.sectionTitle}>Requisitos</Text>
              <Text style={styles.paragraph}>{job.requirements}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={applied ? 'Candidatura enviada ✓' : 'Candidatar-me'}
          onPress={handleApply}
          loading={applying}
          disabled={applied}
          variant="coral"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  photo: { width: '100%', height: 220, backgroundColor: colors.navy },
  content: { padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  employerLocation: { fontSize: 12, color: colors.textMuted },
  tagsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  tag: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.teal },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  infoText: { fontSize: 14, color: colors.text },
  pay: { color: colors.coral, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: spacing.xl, marginBottom: spacing.xs },
  paragraph: { fontSize: 14, color: colors.text, lineHeight: 21 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
