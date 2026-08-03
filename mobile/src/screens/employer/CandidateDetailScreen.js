import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import VerifiedBadge from '../../components/VerifiedBadge';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 24; // ~60s

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
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [unlockPhone, setUnlockPhone] = useState('');
  const [payState, setPayState] = useState('idle'); // idle | charging | waiting | done
  const pollTimer = useRef(null);

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
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [candidateId]);

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function handleConfirmPayment() {
    if (!unlockPhone.trim()) {
      Alert.alert('Número em falta', 'Introduza o número de telemóvel a usar para o pagamento.');
      return;
    }
    setPayState('charging');
    try {
      const { paymentId, status } = await api.post('/payments/charge', {
        purpose: 'unlock_contact',
        phone: unlockPhone.trim(),
        payload: { employeeId: candidateId },
      });

      if (status === 'success') {
        await finishUnlock();
        return;
      }

      setPayState('waiting');
      let attempts = 0;
      pollTimer.current = setInterval(async () => {
        attempts += 1;
        try {
          const { status: current } = await api.get(`/payments/${paymentId}`);
          if (current === 'success') {
            stopPolling();
            await finishUnlock();
          } else if (current === 'failed') {
            stopPolling();
            setPayState('idle');
            Alert.alert('Pagamento não confirmado', 'O pagamento falhou ou foi cancelado. Tente novamente.');
          } else if (attempts >= POLL_MAX_ATTEMPTS) {
            stopPolling();
            setPayState('idle');
            Alert.alert(
              'A demorar mais que o esperado',
              'Ainda não recebemos a confirmação do pagamento. Se já aprovou no telemóvel, o contacto será desbloqueado automaticamente assim que a confirmação chegar.'
            );
          }
        } catch {
          // transient network error — keep polling until max attempts
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setPayState('idle');
      Alert.alert('Não foi possível iniciar o pagamento', err.message);
    }
  }

  async function finishUnlock() {
    setPayState('done');
    await load();
    setCheckoutOpen(false);
    setPayState('idle');
    setUnlockPhone('');
    Alert.alert('Contacto desbloqueado', 'Já pode ver o contacto deste candidato.');
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
                <Button title="Desbloquear contacto — 50 MZN" variant="coral" onPress={() => setCheckoutOpen(true)} />
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

      <Modal
        visible={checkoutOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (payState === 'idle') setCheckoutOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {payState === 'waiting' || payState === 'charging' ? (
              <View style={styles.waitingWrap}>
                <ActivityIndicator size="large" color={colors.teal} />
                <Text style={styles.waitingTitle}>
                  {payState === 'charging' ? 'A iniciar pagamento...' : 'A aguardar confirmação'}
                </Text>
                <Text style={styles.waitingSub}>
                  Aprove o pedido de pagamento que apareceu no seu telemóvel.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Desbloquear contacto</Text>
                <Text style={styles.amount}>50 MZN</Text>
                <TextInput
                  value={unlockPhone}
                  onChangeText={setUnlockPhone}
                  placeholder="Número M-Pesa ou e-Mola, ex: 841234567"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  style={styles.modalInput}
                />
                <View style={styles.modalActions}>
                  <Button
                    title="Cancelar"
                    variant="ghost"
                    onPress={() => setCheckoutOpen(false)}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button title="Confirmar pagamento" onPress={handleConfirmPayment} style={{ flex: 1 }} />
                </View>
                <Text style={styles.finePrint}>Processado por ZumboPay via M-Pesa ou e-Mola.</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

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
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  amount: { fontSize: 26, fontWeight: '800', color: colors.navy, marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 48,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalActions: { flexDirection: 'row' },
  finePrint: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  waitingWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  waitingTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  waitingSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
