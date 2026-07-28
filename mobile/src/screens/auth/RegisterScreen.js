import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormField from '../../components/FormField';
import Button from '../../components/Button';
import ChipSelect from '../../components/ChipSelect';
import TagListInput from '../../components/TagListInput';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { promptImageSource } from '../../utils/pickImage';
import { colors, spacing, radius } from '../../theme/colors';
import { AVAILABILITY_OPTIONS, EDUCATION_LEVELS, GENDER_OPTIONS } from '../../constants';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [accountType, setAccountType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);

  const [form, setForm] = useState({
    phone: '',
    password: '',
    name: '',
    age: '',
    gender: '',
    location: '',
    bio: '',
    profession: '',
    yearsExperience: '',
    experienceDescription: '',
    educationLevel: '',
    languages: [],
    skills: [],
    availability: '',
    expectedSalary: '',
    portfolio: '',
    companyName: '',
    lookingFor: '',
    requirements: '',
    payOffered: '',
    companyDescription: '',
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.phone.trim() || !form.password.trim() || !form.name.trim()) {
      Alert.alert('Campos em falta', 'Nome, telefone e palavra-passe são obrigatórios.');
      return;
    }
    if (accountType === 'employee' && (!form.age || !form.profession.trim())) {
      Alert.alert('Campos em falta', 'Idade e profissão/sector procurado são obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ accountType, ...form });

      if (photo) {
        try {
          const formData = new FormData();
          formData.append('photo', photo);
          await api.postForm('/users/me/photo', formData);
        } catch (err) {
          console.warn('Falha ao enviar foto de perfil:', err.message);
        }
      }
    } catch (err) {
      Alert.alert('Não foi possível criar a conta', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!accountType) {
    return (
      <View style={[styles.pickerContainer, { paddingTop: insets.top + spacing.xl }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={styles.pickerTitle}>Como quer usar a Emprego Já?</Text>
        <Text style={styles.pickerWarning}>
          Esta escolha é permanente. Não é possível mudar de tipo de conta depois — para usar o
          outro tipo terá de criar uma nova conta com outro número de telefone.
        </Text>

        <TouchableOpacity style={styles.typeCard} onPress={() => setAccountType('employee')}>
          <Ionicons name="person-outline" size={28} color={colors.navy} />
          <Text style={styles.typeCardTitle}>Sou Candidato</Text>
          <Text style={styles.typeCardDesc}>Estou à procura de trabalho.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.typeCard} onPress={() => setAccountType('employer')}>
          <Ionicons name="business-outline" size={28} color={colors.navy} />
          <Text style={styles.typeCardTitle}>Sou Empregador</Text>
          <Text style={styles.typeCardDesc}>Quero publicar vagas e encontrar candidatos.</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }}
      >
        <TouchableOpacity style={styles.changeType} onPress={() => setAccountType(null)}>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          <Text style={styles.changeTypeText}>
            {accountType === 'employee' ? 'Conta de Candidato' : 'Conta de Empregador'} · mudar
          </Text>
        </TouchableOpacity>

        <View style={styles.photoPicker}>
          <TouchableOpacity onPress={() => promptImageSource(setPhoto)}>
            <Avatar uri={photo?.uri} size={90} />
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Foto de perfil (opcional agora)</Text>
        </View>

        <FormField label="Nome completo *" value={form.name} onChangeText={(v) => set('name', v)} placeholder="O seu nome" />
        <FormField
          label="Número de telefone *"
          value={form.phone}
          onChangeText={(v) => set('phone', v)}
          placeholder="84 123 4567"
          keyboardType="phone-pad"
        />
        <FormField
          label="Palavra-passe *"
          value={form.password}
          onChangeText={(v) => set('password', v)}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
        />
        <FormField
          label={accountType === 'employee' ? 'Idade *' : 'Idade'}
          value={form.age}
          onChangeText={(v) => set('age', v.replace(/\D/g, ''))}
          placeholder="Ex: 28"
          keyboardType="number-pad"
        />
        <ChipSelect label="Género (opcional)" options={GENDER_OPTIONS} value={form.gender} onChange={(v) => set('gender', v || '')} />
        <FormField label="Localização" value={form.location} onChangeText={(v) => set('location', v)} placeholder="Ex: Maputo" />
        <FormField
          label="Sobre si"
          value={form.bio}
          onChangeText={(v) => set('bio', v)}
          placeholder="Fale um pouco sobre si"
          multiline
        />

        {accountType === 'employee' ? (
          <>
            <Text style={styles.sectionTitle}>Sobre a sua procura de emprego</Text>
            <FormField
              label="Profissão / sector procurado *"
              value={form.profession}
              onChangeText={(v) => set('profession', v)}
              placeholder="Ex: Eletricista, Empregada doméstica, Contabilista..."
            />
            <FormField
              label="Anos de experiência"
              value={form.yearsExperience}
              onChangeText={(v) => set('yearsExperience', v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="Ex: 3"
            />
            <FormField
              label="Descrição da experiência"
              value={form.experienceDescription}
              onChangeText={(v) => set('experienceDescription', v)}
              multiline
              placeholder="Descreva os trabalhos que já fez"
            />
            <ChipSelect
              label="Nível de escolaridade"
              options={EDUCATION_LEVELS}
              value={form.educationLevel}
              onChange={(v) => set('educationLevel', v || '')}
            />
            <TagListInput
              label="Línguas faladas"
              values={form.languages}
              onChange={(v) => set('languages', v)}
              placeholder="Ex: Português"
            />
            <TagListInput
              label="Competências"
              values={form.skills}
              onChange={(v) => set('skills', v)}
              placeholder="Ex: Atendimento ao cliente"
            />
            <ChipSelect
              label="Disponibilidade"
              options={AVAILABILITY_OPTIONS}
              value={form.availability}
              onChange={(v) => set('availability', v || '')}
            />
            <FormField
              label="Salário pretendido (MZN)"
              value={form.expectedSalary}
              onChangeText={(v) => set('expectedSalary', v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="Ex: 15000"
            />
            <FormField
              label="Portfólio / certificados"
              value={form.portfolio}
              onChangeText={(v) => set('portfolio', v)}
              multiline
              placeholder="Links ou descrição de certificados"
            />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Sobre a sua empresa</Text>
            <FormField label="Nome da empresa" value={form.companyName} onChangeText={(v) => set('companyName', v)} placeholder="Ex: Loja Central Lda" />
            <FormField
              label="Que tipo de trabalhador procura?"
              value={form.lookingFor}
              onChangeText={(v) => set('lookingFor', v)}
              placeholder="Ex: Vendedores, técnicos, motoristas..."
            />
            <FormField
              label="Requisitos habituais"
              value={form.requirements}
              onChangeText={(v) => set('requirements', v)}
              multiline
              placeholder="Requisitos que costuma pedir"
            />
            <FormField label="Pagamento oferecido" value={form.payOffered} onChangeText={(v) => set('payOffered', v)} placeholder="Ex: 8000 MZN/mês" />
            <FormField
              label="Descrição da empresa"
              value={form.companyDescription}
              onChangeText={(v) => set('companyDescription', v)}
              multiline
              placeholder="Descreva a sua empresa"
            />
          </>
        )}

        <Button title="Criar conta" variant="coral" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.xl,
  },
  backBtn: {
    marginBottom: spacing.lg,
  },
  pickerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  pickerWarning: {
    fontSize: 13,
    color: colors.gold,
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  typeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  typeCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  typeCardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  formScroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  changeType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  changeTypeText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  photoPicker: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
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
  photoHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
