import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormField from '../../components/FormField';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme/colors';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Campos em falta', 'Introduza o telefone e a palavra-passe.');
      return;
    }
    setSubmitting(true);
    try {
      await login(phone, password);
    } catch (err) {
      Alert.alert('Não foi possível entrar', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.xl, flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginBottom: spacing.xl }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>Aceda à sua conta Emprego Já</Text>

        <FormField
          label="Número de telefone"
          value={phone}
          onChangeText={setPhone}
          placeholder="84 123 4567"
          keyboardType="phone-pad"
          style={{ marginTop: spacing.xl }}
        />
        <FormField label="Palavra-passe" value={password} onChangeText={setPassword} placeholder="A sua palavra-passe" secureTextEntry />

        <Button title="Entrar" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.md }} />

        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLinkText}>Ainda não tem conta? Criar conta</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  registerLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 13,
    color: colors.teal,
    fontWeight: '600',
  },
});
