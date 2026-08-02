import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';

export default function EmployerJobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ job: fetchedJob }, { applicants: fetchedApplicants }] = await Promise.all([
          api.get(`/jobs/${jobId}`),
          api.get(`/applications/job/${jobId}`),
        ]);
        setJob(fetchedJob);
        setApplicants(fetchedApplicants);
      } catch (err) {
        Alert.alert('Erro', err.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

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
      <ScreenHeader title="A sua vaga" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {job.photoUrl ? <Image source={{ uri: job.photoUrl }} style={styles.photo} contentFit="cover" /> : null}
        <View style={styles.content}>
          <Text style={styles.title}>{job.title}</Text>

          <View style={[styles.deadlineBanner, job.expired && styles.deadlineBannerExpired]}>
            <Ionicons
              name={job.expired ? 'alert-circle-outline' : 'time-outline'}
              size={16}
              color={job.expired ? colors.danger : colors.teal}
            />
            <Text style={[styles.deadlineText, job.expired && styles.deadlineTextExpired]}>
              {job.expired
                ? 'Esta vaga expirou e já não é visível para candidatos.'
                : `Expira em ${job.daysRemaining} dia${job.daysRemaining === 1 ? '' : 's'} — deixará de aparecer automaticamente.`}
            </Text>
          </View>

          {job.expired ? (
            <Button
              title="Publicar vaga novamente"
              variant="coral"
              onPress={() => navigation.navigate('Tabs', { screen: 'PostJob' })}
              style={{ marginTop: spacing.md }}
            />
          ) : null}

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
          {job.location ? <Text style={styles.meta}>{job.location}</Text> : null}
          {job.payText ? <Text style={styles.pay}>{job.payText}</Text> : null}
          {job.requirements ? <Text style={styles.paragraph}>{job.requirements}</Text> : null}

          <Text style={styles.sectionTitle}>Candidatos ({applicants.length})</Text>

          {applicants.length === 0 ? (
            <Text style={styles.empty}>Ainda não há candidaturas para esta vaga.</Text>
          ) : (
            applicants.map((item) => (
              <TouchableOpacity
                key={item.applicationId}
                style={styles.applicantRow}
                onPress={() => navigation.navigate('CandidateDetail', { candidateId: item.candidate.id })}
              >
                <Avatar uri={item.candidate.photoUrl} size={44} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.applicantName}>{item.candidate.name}</Text>
                  {item.candidate.profession ? (
                    <Text style={styles.applicantProfession}>{item.candidate.profession}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  photo: { width: '100%', height: 200, backgroundColor: colors.navy },
  content: { padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  deadlineBannerExpired: {
    backgroundColor: '#FBEAEA',
    borderColor: colors.danger,
  },
  deadlineText: { flex: 1, fontSize: 12, color: colors.teal, fontWeight: '600' },
  deadlineTextExpired: { color: colors.danger },
  tagsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  tag: { backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.teal },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  pay: { fontSize: 15, fontWeight: '700', color: colors.coral, marginTop: spacing.xs },
  paragraph: { fontSize: 14, color: colors.text, marginTop: spacing.md, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: spacing.xl, marginBottom: spacing.sm },
  empty: { fontSize: 13, color: colors.textMuted },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  applicantName: { fontSize: 14, fontWeight: '700', color: colors.text },
  applicantProfession: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
