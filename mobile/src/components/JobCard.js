import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';
import VerifiedBadge from './VerifiedBadge';

export default function JobCard({ job, onPress }) {
  const photo = job.photoUrl || job.employer?.photoUrl;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.photoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="briefcase" size={36} color={colors.white} />
          </View>
        )}
        {job.featured ? (
          <View style={styles.featuredTag}>
            <Text style={styles.featuredText}>Destaque</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {job.title}
        </Text>

        <View style={styles.employerRow}>
          <Text style={styles.employerName} numberOfLines={1}>
            {job.employer?.name}
          </Text>
          {job.employer?.verified ? <VerifiedBadge size={12} /> : null}
        </View>

        <View style={styles.sectorTag}>
          <Text style={styles.sectorTagText} numberOfLines={1}>
            {job.sector}
          </Text>
        </View>

        {job.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {job.location}
            </Text>
          </View>
        ) : null}

        {typeof job.daysRemaining === 'number' ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="time-outline"
              size={12}
              color={job.expired ? colors.danger : job.daysRemaining <= 3 ? colors.coral : colors.textMuted}
            />
            <Text
              style={[
                styles.metaText,
                (job.expired || job.daysRemaining <= 3) && { color: colors.danger, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {job.expired ? 'Vaga expirada' : `Expira em ${job.daysRemaining} dia${job.daysRemaining === 1 ? '' : 's'}`}
            </Text>
          </View>
        ) : null}

        {job.payText ? (
          <Text style={styles.pay} numberOfLines={1}>
            {job.payText}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.applyBtn} onPress={onPress}>
          <Text style={styles.applyBtnText}>Ver vaga</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    margin: spacing.xs,
  },
  photoWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.navy,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  featuredTag: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  featuredText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  employerName: {
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  sectorTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  sectorTagText: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
    flexShrink: 1,
  },
  pay: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coral,
    marginTop: spacing.xs,
  },
  applyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 7,
    alignItems: 'center',
  },
  applyBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
