import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import VerifiedBadge from '../../components/VerifiedBadge';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { lastActiveLabel } from '../../utils/lastActive';
import { colors, radius, spacing } from '../../theme/colors';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 24; // ~60s

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', prefixes: ['84', '85'], dotColor: '#1E8A44' },
  { id: 'emola', label: 'e-Mola', prefixes: ['86', '87'], dotColor: colors.coral },
  { id: 'card', label: 'Visa / Mastercard', dotColor: colors.navy },
];

function methodMatchesPhone(method, phone) {
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.startsWith('258') ? digits.slice(3) : digits;
  return method.prefixes.includes(local.slice(0, 2));
}

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
  const [checkoutStep, setCheckoutStep] = useState('method'); // method | phone
  const [unlockMethod, setUnlockMethod] = useState(null);
  const [unlockPhone, setUnlockPhone] = useState('');
  const [payState, setPayState] = useState('idle'); // idle | charging | waiting | done
  const pollTimer = useRef(null);

  function openCheckout() {
    setCheckoutStep('method');
    setUnlockMethod(null);
    setUnlockPhone('');
    setCheckoutOpen(true);
  }

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

  function confirmToggleBlock() {
    if (!candidate) return;
    if (candidate.blockedByMe) {
      Alert.alert('Desbloquear', `Voltar a ver ${candidate.name} nas pesquisas e permitir contacto?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: async () => {
            try {
              await api.del(`/users/${candidateId}/block`);
              await load();
            } catch (err) {
              Alert.alert('Erro', err.message);
            }
          },
        },
      ]);
    } else {
      Alert.alert(
        'Bloquear candidato',
        `Deixará de ver ${candidate.name} nas pesquisas e não poderão contactar-se. Tem a certeza?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.post(`/users/${candidateId}/block`);
                await load();
              } catch (err) {
                Alert.alert('Erro', err.message);
              }
            },
          },
        ]
      );
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
    if (!methodMatchesPhone(unlockMethod, unlockPhone)) {
      Alert.alert(
        'Número não corresponde',
        `Este número não parece ser um número ${unlockMethod.label}. Verifique o número ou escolha outro método.`
      );
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

  async function handleCardPayment() {
    setPayState('charging');
    try {
      const { paymentId, status, checkoutUrl } = await api.post('/payments/charge', {
        purpose: 'unlock_contact',
        method: 'card',
        payload: { employeeId: candidateId },
      });

      if (status === 'success') {
        await finishUnlock();
        return;
      }
      if (!checkoutUrl) {
        throw new Error('Não foi possível obter o link de pagamento.');
      }

      setPayState('waiting');
      await WebBrowser.openBrowserAsync(checkoutUrl);

      // The browser closing doesn't mean payment succeeded (user may have
      // just backed out) — keep polling until the webhook confirms either way.
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
              'Ainda não recebemos a confirmação do pagamento. Se já concluiu o pagamento, o contacto será desbloqueado automaticamente assim que a confirmação chegar.'
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
    setCheckoutStep('method');
    setUnlockMethod(null);
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
      <ScreenHeader
        title="Perfil do candidato"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={confirmToggleBlock} hitSlop={10}>
            <Ionicons
              name={candidate.blockedByMe ? 'lock-open-outline' : 'hand-left-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Avatar uri={candidate.photoUrl} size={96} />
          <View style={styles.nameRow}>
            <Text style={styles.name}>{candidate.name}</Text>
            {candidate.verified ? <VerifiedBadge size={16} /> : null}
          </View>
          {candidate.profession ? <Text style={styles.profession}>{candidate.profession}</Text> : null}
          {candidate.location ? <Text style={styles.location}>{candidate.location}</Text> : null}
          {candidate.lastActiveAt ? (
            <View style={styles.activeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>{lastActiveLabel(candidate.lastActiveAt)}</Text>
            </View>
          ) : null}

          <View style={styles.contactCard}>
            {candidate.phoneLocked ? (
              <>
                <View style={styles.lockedRow}>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  <Text style={styles.lockedText}>+258 •• ••• •••</Text>
                </View>
                <Button title="Desbloquear contacto — 50 MZN" variant="coral" onPress={openCheckout} />
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
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            {payState === 'waiting' || payState === 'charging' ? (
              <View style={styles.waitingWrap}>
                <ActivityIndicator size="large" color={colors.teal} />
                <Text style={styles.waitingTitle}>
                  {payState === 'charging' ? 'A iniciar pagamento...' : 'A aguardar confirmação'}
                </Text>
                <Text style={styles.waitingSub}>
                  {unlockMethod?.id === 'card'
                    ? 'Conclua o pagamento na página que abriu.'
                    : 'Aprove o pedido de pagamento que apareceu no seu telemóvel.'}
                </Text>
              </View>
            ) : checkoutStep === 'method' ? (
              <>
                <Text style={styles.modalTitle}>Como quer pagar?</Text>
                <Text style={styles.amount}>50 MZN</Text>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={styles.methodRow}
                    onPress={() => {
                      setUnlockMethod(method);
                      if (method.id === 'card') {
                        handleCardPayment();
                      } else {
                        setCheckoutStep('phone');
                      }
                    }}
                  >
                    <View style={[styles.methodDot, { backgroundColor: method.dotColor }]} />
                    <Text style={styles.methodLabel}>{method.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
                <Button
                  title="Cancelar"
                  variant="ghost"
                  onPress={() => setCheckoutOpen(false)}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setCheckoutStep('method')}>
                  <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                  <Text style={styles.backText}>Mudar método</Text>
                </TouchableOpacity>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.methodDot, { backgroundColor: unlockMethod.dotColor }]} />
                  <Text style={styles.modalTitle}>{unlockMethod.label}</Text>
                </View>
                <Text style={styles.amount}>50 MZN</Text>
                <TextInput
                  value={unlockPhone}
                  onChangeText={setUnlockPhone}
                  placeholder={`Número ${unlockMethod.label}, ex: ${unlockMethod.prefixes[0]}1234567`}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmPayment}
                  autoFocus
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
                <Text style={styles.finePrint}>Processado por ZumboPay.</Text>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  activeLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
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
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  amount: { fontSize: 26, fontWeight: '800', color: colors.navy, marginBottom: spacing.md },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  methodDot: { width: 14, height: 14, borderRadius: 999 },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md },
  backText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
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
