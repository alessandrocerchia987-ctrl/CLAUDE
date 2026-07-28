import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

// Single-select row of pill chips, e.g. for availability type.
export default function ChipSelect({ label, options, value, onChange }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(selected ? null : opt)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
  },
});
