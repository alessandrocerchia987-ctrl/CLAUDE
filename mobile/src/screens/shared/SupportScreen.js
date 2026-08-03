import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import FormField from '../../components/FormField';
import ChipSelect from '../../components/ChipSelect';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { colors, spacing } from '../../theme/colors';
import { SUPPORT_CATEGORIES } from '../../constants';

export default function SupportScreen({ navigation }) {
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!category) {
      Alert.alert('Categoria em falta', 'Escolha uma categoria para o seu pedido.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Descrição em falta', 'Descreva o problema ou pedido.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/support', { category, description: description.trim() });
      setCategory(null);
      setDescription('');
      Alert.alert('Pedido enviado', 'O seu pedido foi submetido com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Não foi possível enviar', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Suporte" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={styles.intro}>
          Reporte um utilizador, um comportamento inapropriado, um golpe, uma reclamação, ou peça
          ajuda sobre qualquer assunto. A sua mensagem é enviada diretamente à nossa equipa.
        </Text>

        <ChipSelect label="Categoria *" options={SUPPORT_CATEGORIES} value={category} onChange={setCategory} />

        <FormField
          label="Descrição *"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Descreva o que se passou, com o máximo de detalhe possível..."
          inputStyle={{ minHeight: 140 }}
        />

        <Button title="Enviar pedido" variant="coral" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
});
