import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import VerifiedBadge from '../../components/VerifiedBadge';
import { colors, spacing } from '../../theme/colors';

const DURATION_MS = 5000;

export default function StoryViewerScreen({ route, navigation }) {
  const { group } = route.params;
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const story = group.stories[index];

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.stop();
  }, [index]);

  function goNext() {
    if (index < group.stories.length - 1) {
      setIndex(index + 1);
    } else {
      navigation.goBack();
    }
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1);
    else navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: story.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.scrim} />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.progressRow}>
          {group.stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.userRow}>
          <Avatar uri={group.user.photoUrl} size={36} />
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{group.user.name}</Text>
            {group.user.verified ? <VerifiedBadge size={12} /> : null}
          </View>
          <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
            <View style={styles.closeBtn}>
              <Ionicons name="close" size={26} color={colors.white} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>

      <View style={styles.tapZones}>
        <TouchableWithoutFeedback onPress={goPrev}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={goNext}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </View>

      {story.caption ? (
        <View style={[styles.captionWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.caption}>{story.caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  top: { paddingHorizontal: spacing.md },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.white },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  userName: { color: colors.white, fontWeight: '700', fontSize: 14 },
  closeBtn: { padding: spacing.xs },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  captionWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
  },
  caption: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
