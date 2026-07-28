import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { colors, spacing } from '../theme/colors';

function groupByUser(stories) {
  const map = new Map();
  for (const story of stories) {
    if (!story.user) continue;
    const key = story.user.id;
    if (!map.has(key)) map.set(key, { user: story.user, stories: [] });
    map.get(key).stories.push(story);
  }
  return Array.from(map.values());
}

export default function StoriesBar({ stories, currentUser, onAddStory, onOpenUserStories }) {
  const groups = useMemo(() => groupByUser(stories || []), [stories]);
  const myGroup = groups.find((g) => g.user.id === currentUser?.id);
  const otherGroups = groups.filter((g) => g.user.id !== currentUser?.id);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.item} onPress={() => (myGroup ? onOpenUserStories(myGroup) : onAddStory())}>
          <View>
            <Avatar uri={currentUser?.photoUrl} size={64} hasStory={!!myGroup} />
            <TouchableOpacity style={styles.plusBadge} onPress={onAddStory}>
              <Ionicons name="add" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {myGroup ? 'A sua story' : 'Adicionar'}
          </Text>
        </TouchableOpacity>

        {otherGroups.map((group) => (
          <TouchableOpacity key={group.user.id} style={styles.item} onPress={() => onOpenUserStories(group)}>
            <Avatar uri={group.user.photoUrl} size={64} hasStory />
            <Text style={styles.label} numberOfLines={1}>
              {group.user.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  item: {
    alignItems: 'center',
    width: 72,
  },
  label: {
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 12,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
