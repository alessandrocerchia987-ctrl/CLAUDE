import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { colors, spacing } from '../../theme/colors';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}>
        <View style={styles.logoCircle}>
          <Ionicons name="briefcase" size={40} color={colors.navy} />
        </View>
        <Text style={styles.appName}>Emprego Já</Text>
        <Text style={styles.tagline}>
          Ligamos candidatos e empregadores em todo o país — de todos os sectores, para todos os
          níveis.
        </Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Button
          title="Criar conta"
          variant="coral"
          onPress={() => navigation.navigate('Register')}
          style={styles.btn}
        />
        <Button
          title="Já tenho conta"
          variant="outlineLight"
          onPress={() => navigation.navigate('Login')}
          style={styles.btn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.md,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: spacing.xl,
  },
  btn: {
    marginBottom: spacing.md,
  },
});
