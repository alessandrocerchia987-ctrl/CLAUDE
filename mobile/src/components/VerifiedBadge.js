import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function VerifiedBadge({ size = 14 }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.check, { fontSize: size * 0.65 }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: colors.white,
    fontWeight: '800',
  },
});
