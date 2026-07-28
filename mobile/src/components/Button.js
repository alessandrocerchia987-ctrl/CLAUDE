import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

const VARIANTS = {
  primary: { bg: colors.navy, text: colors.white },
  coral: { bg: colors.coral, text: colors.white },
  teal: { bg: colors.teal, text: colors.white },
  outline: { bg: 'transparent', text: colors.navy, border: colors.navy },
  outlineLight: { bg: 'transparent', text: colors.white, border: colors.white },
  ghost: { bg: colors.background, text: colors.text },
};

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border || 'transparent', borderWidth: v.border ? 1.5 : 0 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
