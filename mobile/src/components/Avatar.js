import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, storyRingColors } from '../theme/colors';

// Instagram/WhatsApp-style gradient "story ring" around a profile photo.
// `hasStory` controls whether the gradient ring shows; otherwise a plain
// neutral border is drawn instead so seen/no-story avatars are distinct.
export default function Avatar({ uri, size = 56, hasStory = false, ringWidth = 3 }) {
  const innerSize = size - ringWidth * 2 - 4;

  const content = (
    <View
      style={[
        styles.gap,
        { width: size - ringWidth * 2, height: size - ringWidth * 2, borderRadius: (size - ringWidth * 2) / 2 },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
          ]}
        >
          <View style={styles.placeholderHead} />
          <View style={styles.placeholderBody} />
        </View>
      )}
    </View>
  );

  if (hasStory) {
    return (
      <LinearGradient
        colors={storyRingColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.ring, styles.plainRing, { width: size, height: size, borderRadius: size / 2 }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainRing: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  gap: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderHead: {
    width: '38%',
    height: '38%',
    borderRadius: 999,
    backgroundColor: colors.gold,
    marginTop: '14%',
  },
  placeholderBody: {
    width: '70%',
    height: '40%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: colors.gold,
    marginTop: '6%',
    opacity: 0.85,
  },
});
