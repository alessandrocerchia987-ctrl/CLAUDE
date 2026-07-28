import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import FormField from '../../components/FormField';
import ChipSelect from '../../components/ChipSelect';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { pickImage } from '../../utils/pickImage';
import { colors, radius, spacing } from '../../theme/colors';
import { AVAILABILITY_OPTIONS } from '../../constants';

const initialForm = {
  title: '',
  sector: '',
  location: '',
  payText: '',
  availability: '',
  requirements: '',
};

export default function PostJobScreen({ navigation }) {
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [posting, setPosting] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePost() {
    if (!form.title.trim() || !form.sector.trim()) {
      Alert.alert('Campos em falta', 'O título e o sector/profissão são obrigatórios.');
      return;
    }
    setPosting(true);
    try {
      // TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this call — free for now.
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (photo) formData.append('photo', photo);

      await api.postForm('/jobs', formData);
      setForm(initialForm);
      setPhoto(null);
      Alert.alert('Vaga publicada', 'A sua vaga já está visível para os candidatos.', [
        { text: 'OK', onPress: () => navigation.navigate('EmployerHome') },
      ]);
    } catch (err) {
      Alert.alert('Não foi possível publicar', err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Publicar vaga" />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <TouchableOpacity style={styles.photoPicker} onPress={async () => setPhoto(await pickImage('library'))}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Adicionar foto (opcional)</Text>
            </View>
          )}
        </TouchableOpacity>

        <FormField label="Título da vaga *" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Ex: Vendedora de loja" />
        <FormField
          label="Sector / profissão *"
          value={form.sector}
          onChangeText={(v) => set('sector', v)}
          placeholder="Ex: Vendas, Construção, Informática..."
        />
        <FormField label="Localização" value={form.location} onChangeText={(v) => set('location', v)} placeholder="Ex: Maputo" />
        <FormField label="Pagamento" value={form.payText} onChangeText={(v) => set('payText', v)} placeholder="Ex: 8000 MZN/mês" />
        <ChipSelect label="Disponibilidade" options={AVAILABILITY_OPTIONS} value={form.availability} onChange={(v) => set('availability', v || '')} />
        <FormField
          label="Requisitos"
          value={form.requirements}
          onChangeText={(v) => set('requirements', v)}
          multiline
          placeholder="O que procura num candidato?"
        />

        <Button title="Publicar vaga" variant="coral" onPress={handlePost} loading={posting} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  photoPicker: {
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  photoPlaceholderText: { fontSize: 12, color: colors.textMuted },
});
