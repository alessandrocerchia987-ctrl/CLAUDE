import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';
import VerifiedBadge from './VerifiedBadge';

export default function CandidateCard({ candidate, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.photoWrap}>
        {candidate.photoUrl ? (
          <Image source={{ uri: candidate.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="person" size={40} color={colors.white} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {candidate.name}
          </Text>
          {candidate.verified ? <VerifiedBadge size={12} /> : null}
        </View>

        {candidate.profession ? (
          <View style={styles.sectorTag}>
            <Text style={styles.sectorTagText} numberOfLines={1}>
              {candidate.profession}
            </Text>
          </View>
        ) : null}

        {candidate.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {candidate.location}
            </Text>
          </View>
        ) : null}

        {candidate.yearsExperience != null ? (
          <Text style={styles.metaText}>{candidate.yearsExperience} anos de experiência</Text>
        ) : null}

        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>Ver perfil</Text>
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
    backgroundColor: colors.teal,
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
    backgroundColor: colors.teal,
  },
  body: {
    padding: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
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
    marginTop: spacing.xs,
    flexShrink: 1,
  },
  viewBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 7,
    alignItems: 'center',
  },
  viewBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
