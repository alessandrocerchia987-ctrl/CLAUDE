import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme/colors';

// Small tappable balance shown in the home feed headers (employee and
// employer) so credits stay visible without having to dig into Profile.
export default function CreditsPill({ credits }) {
  const navigation = useNavigation();
  return (
    <TouchableOpacity style={styles.pill} onPress={() => navigation.navigate('Credits')} hitSlop={8}>
      <Ionicons name="wallet-outline" size={14} color={colors.gold} />
      <Text style={styles.text}>{credits || 0}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  text: { fontSize: 13, fontWeight: '800', color: colors.navy },
});
