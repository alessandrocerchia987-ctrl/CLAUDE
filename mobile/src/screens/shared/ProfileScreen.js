import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import VerifiedBadge from '../../components/VerifiedBadge';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme/colors';

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Terminar sessão', 'Tem a certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  const isEmployee = user.accountType === 'employee';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <Avatar uri={user.photoUrl} size={96} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{isEmployee ? user.name : user.companyName || user.name}</Text>
          {user.verified ? <VerifiedBadge size={16} /> : null}
        </View>
        <Text style={styles.type}>{isEmployee ? 'Candidato' : 'Empregador'}</Text>
        {user.location ? <Text style={styles.location}>{user.location}</Text> : null}

        <Button
          title="Editar perfil"
          variant="outline"
          onPress={() => navigation.navigate('EditProfile')}
          style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
        />

        {isEmployee ? (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('MyApplications')}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.teal} />
            <Text style={styles.linkText}>As Minhas Candidaturas</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        {isEmployee ? (
          <>
            <Field label="Profissão / sector" value={user.profession} />
            <Field label="Anos de experiência" value={user.yearsExperience} />
            <Field label="Descrição da experiência" value={user.experienceDescription} />
            <Field label="Nível de escolaridade" value={user.educationLevel} />
            <Field label="Línguas" value={user.languages?.join(', ')} />
            <Field label="Competências" value={user.skills?.join(', ')} />
            <Field label="Disponibilidade" value={user.availability} />
            <Field label="Salário pretendido" value={user.expectedSalary ? `${user.expectedSalary} MZN` : null} />
            <Field label="Portfólio / certificados" value={user.portfolio} />
          </>
        ) : (
          <>
            <Field label="Que tipo de trabalhador procura" value={user.lookingFor} />
            <Field label="Requisitos habituais" value={user.requirements} />
            <Field label="Pagamento oferecido" value={user.payOffered} />
            <Field label="Descrição da empresa" value={user.companyDescription} />
          </>
        )}
        <Field label="Idade" value={user.age} />
        <Field label="Género" value={user.gender} />
        <Field label="Sobre" value={user.bio} />
        <Field label="Telefone" value={user.phone} />
      </View>

      <TouchableOpacity style={styles.supportBtn} onPress={() => navigation.navigate('Support')}>
        <Ionicons name="help-buoy-outline" size={18} color={colors.teal} />
        <Text style={styles.supportText}>Suporte / Ajuda</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Terminar sessão</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  type: { fontSize: 12, color: colors.teal, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  location: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  linkText: { fontSize: 13, color: colors.teal, fontWeight: '600' },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  field: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  fieldValue: { fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 20 },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  supportText: { color: colors.teal, fontWeight: '700', fontSize: 14 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
