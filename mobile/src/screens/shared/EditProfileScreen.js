import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import FormField from '../../components/FormField';
import Button from '../../components/Button';
import ChipSelect from '../../components/ChipSelect';
import TagListInput from '../../components/TagListInput';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { promptImageSource } from '../../utils/pickImage';
import { colors, spacing } from '../../theme/colors';
import { AVAILABILITY_OPTIONS, EDUCATION_LEVELS, GENDER_OPTIONS } from '../../constants';

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const isEmployee = user.accountType === 'employee';
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState(user.photoUrl);

  const [form, setForm] = useState({
    name: user.name || '',
    age: user.age ? String(user.age) : '',
    gender: user.gender || '',
    location: user.location || '',
    bio: user.bio || '',
    profession: user.profession || '',
    yearsExperience: user.yearsExperience ? String(user.yearsExperience) : '',
    experienceDescription: user.experienceDescription || '',
    educationLevel: user.educationLevel || '',
    languages: user.languages || [],
    skills: user.skills || [],
    availability: user.availability || '',
    expectedSalary: user.expectedSalary ? String(user.expectedSalary) : '',
    portfolio: user.portfolio || '',
    companyName: user.companyName || '',
    lookingFor: user.lookingFor || '',
    requirements: user.requirements || '',
    payOffered: user.payOffered || '',
    companyDescription: user.companyDescription || '',
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotoPick() {
    promptImageSource(async (file) => {
      if (!file) return;
      setPhotoUri(file.uri);
      try {
        const formData = new FormData();
        formData.append('photo', file);
        const { user: updated } = await api.postForm('/users/me/photo', formData);
        setUser(updated);
      } catch (err) {
        Alert.alert('Erro ao enviar foto', err.message);
      }
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Nome obrigatório', 'O nome não pode ficar vazio.');
      return;
    }
    setSaving(true);
    try {
      const { user: updated } = await api.patch('/users/me', form);
      setUser(updated);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Não foi possível guardar', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Editar perfil" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.photoPicker}>
          <TouchableOpacity onPress={handlePhotoPick}>
            <Avatar uri={photoUri} size={90} />
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>
        </View>

        <FormField label="Nome completo" value={form.name} onChangeText={(v) => set('name', v)} />
        <FormField label="Idade" value={form.age} onChangeText={(v) => set('age', v.replace(/\D/g, ''))} keyboardType="number-pad" />
        <ChipSelect label="Género" options={GENDER_OPTIONS} value={form.gender} onChange={(v) => set('gender', v || '')} />
        <FormField label="Localização" value={form.location} onChangeText={(v) => set('location', v)} />
        <FormField label="Sobre si" value={form.bio} onChangeText={(v) => set('bio', v)} multiline />

        {isEmployee ? (
          <>
            <Text style={styles.sectionTitle}>Sobre a sua procura de emprego</Text>
            <FormField label="Profissão / sector procurado" value={form.profession} onChangeText={(v) => set('profession', v)} />
            <FormField
              label="Anos de experiência"
              value={form.yearsExperience}
              onChangeText={(v) => set('yearsExperience', v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <FormField label="Descrição da experiência" value={form.experienceDescription} onChangeText={(v) => set('experienceDescription', v)} multiline />
            <ChipSelect label="Nível de escolaridade" options={EDUCATION_LEVELS} value={form.educationLevel} onChange={(v) => set('educationLevel', v || '')} />
            <TagListInput label="Línguas faladas" values={form.languages} onChange={(v) => set('languages', v)} placeholder="Ex: Português" />
            <TagListInput label="Competências" values={form.skills} onChange={(v) => set('skills', v)} placeholder="Ex: Atendimento ao cliente" />
            <ChipSelect label="Disponibilidade" options={AVAILABILITY_OPTIONS} value={form.availability} onChange={(v) => set('availability', v || '')} />
            <FormField
              label="Salário pretendido (MZN)"
              value={form.expectedSalary}
              onChangeText={(v) => set('expectedSalary', v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <FormField label="Portfólio / certificados" value={form.portfolio} onChangeText={(v) => set('portfolio', v)} multiline />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Sobre a sua empresa</Text>
            <FormField label="Nome da empresa" value={form.companyName} onChangeText={(v) => set('companyName', v)} />
            <FormField label="Que tipo de trabalhador procura?" value={form.lookingFor} onChangeText={(v) => set('lookingFor', v)} />
            <FormField label="Requisitos habituais" value={form.requirements} onChangeText={(v) => set('requirements', v)} multiline />
            <FormField label="Pagamento oferecido" value={form.payOffered} onChangeText={(v) => set('payOffered', v)} />
            <FormField label="Descrição da empresa" value={form.companyDescription} onChangeText={(v) => set('companyDescription', v)} multiline />
          </>
        )}

        <Button title="Guardar alterações" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  photoPicker: { alignItems: 'center', marginBottom: spacing.lg },
  photoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: spacing.sm, marginBottom: spacing.md },
});
