import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import VerifiedBadge from '../../components/VerifiedBadge';
import Button from '../../components/Button';
import { api } from '../../api/client';
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

export default function CandidateDetailScreen({ route, navigation }) {
  const { candidateId } = route.params;
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  async function load() {
    try {
      const { user: fetched } = await api.get(`/users/${candidateId}`);
      setCandidate(fetched);
    } catch (err) {
      Alert.alert('Erro', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [candidateId]);

  async function handleUnlock() {
    setUnlocking(true);
    try {
      // TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this call — free for now.
      const { user: updated } = await api.post('/unlocks', { employeeId: candidateId });
      setCandidate(updated);
    } catch (err) {
      Alert.alert('Não foi possível desbloquear', err.message);
    } finally {
      setUnlocking(false);
    }
  }

  function openWhatsApp() {
    const digits = candidate.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/258${digits}`);
  }

  async function sendMessage() {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    try {
      await api.post(`/users/${candidateId}/message`, { text: messageText.trim() });
      setMessageOpen(false);
      setMessageText('');
      Alert.alert('Mensagem enviada', 'O candidato foi notificado.');
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading || !candidate) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Candidato" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Perfil do candidato" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Avatar uri={candidate.photoUrl} size={96} />
          <View style={styles.nameRow}>
            <Text style={styles.name}>{candidate.name}</Text>
            {candidate.verified ? <VerifiedBadge size={16} /> : null}
          </View>
          {candidate.profession ? <Text style={styles.profession}>{candidate.profession}</Text> : null}
          {candidate.location ? <Text style={styles.location}>{candidate.location}</Text> : null}

          <View style={styles.contactCard}>
            {candidate.phoneLocked ? (
              <>
                <View style={styles.lockedRow}>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  <Text style={styles.lockedText}>+258 •• ••• •••</Text>
                </View>
                <Button title="Desbloquear contacto" variant="coral" onPress={handleUnlock} loading={unlocking} />
              </>
            ) : (
              <>
                <View style={styles.lockedRow}>
                  <Ionicons name="call" size={16} color={colors.teal} />
                  <Text style={styles.phoneText}>+258 {candidate.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <Button title="Abrir WhatsApp" variant="teal" onPress={openWhatsApp} style={{ flex: 1, marginRight: spacing.sm }} />
                  <Button title="Mensagem" variant="outline" onPress={() => setMessageOpen(true)} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Field label="Idade" value={candidate.age} />
          <Field label="Género" value={candidate.gender} />
          <Field label="Sobre" value={candidate.bio} />
          <Field label="Anos de experiência" value={candidate.yearsExperience} />
          <Field label="Descrição da experiência" value={candidate.experienceDescription} />
          <Field label="Nível de escolaridade" value={candidate.educationLevel} />
          <Field label="Línguas" value={candidate.languages?.join(', ')} />
          <Field label="Competências" value={candidate.skills?.join(', ')} />
          <Field label="Disponibilidade" value={candidate.availability} />
          <Field label="Salário pretendido" value={candidate.expectedSalary ? `${candidate.expectedSalary} MZN` : null} />
          <Field label="Portfólio / certificados" value={candidate.portfolio} />
        </View>
      </ScrollView>

      <Modal visible={messageOpen} transparent animationType="slide" onRequestClose={() => setMessageOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enviar mensagem</Text>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Escreva a sua mensagem..."
              placeholderTextColor={colors.placeholder}
              multiline
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="ghost" onPress={() => setMessageOpen(false)} style={{ flex: 1, marginRight: spacing.sm }} />
              <Button title="Enviar" onPress={sendMessage} loading={sendingMessage} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  profession: { fontSize: 14, color: colors.teal, fontWeight: '600', marginTop: 4 },
  location: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  contactCard: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md, justifyContent: 'center' },
  lockedText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  phoneText: { fontSize: 15, color: colors.text, fontWeight: '700' },
  contactActions: { flexDirection: 'row' },
  section: { padding: spacing.xl },
  field: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  fieldValue: { fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalActions: { flexDirection: 'row' },
});
