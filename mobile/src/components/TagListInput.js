import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';

// Free-text tags the user types and adds one at a time (skills, languages).
export default function TagListInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft('');
  }

  function remove(tag) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={add}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      {values.length > 0 ? (
        <View style={styles.tags}>
          {values.map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag} onPress={() => remove(tag)}>
              <Text style={styles.tagText}>{tag}</Text>
              <Ionicons name="close" size={13} color={colors.navy} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
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
  inputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: '600',
  },
});
