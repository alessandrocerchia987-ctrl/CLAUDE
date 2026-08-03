import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import VerifiedBadge from '../../components/VerifiedBadge';
import Avatar from '../../components/Avatar';
import { api, ApiError } from '../../api/client';
import { colors, radius, spacing } from '../../theme/colors';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 24; // ~60s
const APPLY_AMOUNT = 50;

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

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('method'); // method | phone
  const [payMethod, setPayMethod] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [payState, setPayState] = useState('idle'); // idle | charging | waiting | done
  const pollTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { job: fetched } = await api.get(`/jobs/${jobId}`);
        setJob(fetched);
      } catch (err) {
        Alert.alert('Erro', err.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [jobId]);

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function openCheckout() {
    setCheckoutStep('method');
    setPayMethod(null);
    setPayPhone('');
    setCheckoutOpen(true);
  }

  async function pollUntilConfirmed(paymentId) {
    setPayState('waiting');
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const { status: current } = await api.get(`/payments/${paymentId}`);
        if (current === 'success') {
          stopPolling();
          await finishApply();
        } else if (current === 'failed') {
          stopPolling();
          setPayState('idle');
          Alert.alert('Pagamento não confirmado', 'O pagamento falhou ou foi cancelado. Tente novamente.');
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          stopPolling();
          setPayState('idle');
          Alert.alert(
            'A demorar mais que o esperado',
            'Ainda não recebemos a confirmação do pagamento. Se já aprovou, a sua candidatura será enviada automaticamente assim que a confirmação chegar.'
          );
        }
      } catch {
        // transient network error — keep polling until max attempts
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleConfirmPayment() {
    if (!payPhone.trim()) {
      Alert.alert('Número em falta', 'Introduza o número de telemóvel a usar para o pagamento.');
      return;
    }
    if (!methodMatchesPhone(payMethod, payPhone)) {
      Alert.alert(
        'Número não corresponde',
        `Este número não parece ser um número ${payMethod.label}. Verifique o número ou escolha outro método.`
      );
      return;
    }
    setPayState('charging');
    try {
      const { paymentId, status } = await api.post('/payments/charge', {
        purpose: 'apply',
        phone: payPhone.trim(),
        payload: { jobId },
      });

      if (status === 'success') {
        await finishApply();
        return;
      }
      await pollUntilConfirmed(paymentId);
    } catch (err) {
      setPayState('idle');
      if (err instanceof ApiError && err.status === 409) {
        setApplied(true);
        setCheckoutOpen(false);
      } else {
        Alert.alert('Não foi possível iniciar o pagamento', err.message);
      }
    }
  }

  async function handleCardPayment() {
    setPayState('charging');
    try {
      const { paymentId, status, checkoutUrl } = await api.post('/payments/charge', {
        purpose: 'apply',
        method: 'card',
        payload: { jobId },
      });

      if (status === 'success') {
        await finishApply();
        return;
      }
      if (!checkoutUrl) {
        throw new Error('Não foi possível obter o link de pagamento.');
      }

      setPayState('waiting');
      await WebBrowser.openBrowserAsync(checkoutUrl);
      await pollUntilConfirmed(paymentId);
    } catch (err) {
      setPayState('idle');
      if (err instanceof ApiError && err.status === 409) {
        setApplied(true);
        setCheckoutOpen(false);
      } else {
        Alert.alert('Não foi possível iniciar o pagamento', err.message);
      }
    }
  }

  async function finishApply() {
    setPayState('done');
    setApplied(true);
    setCheckoutOpen(false);
    setPayState('idle');
    setCheckoutStep('method');
    setPayMethod(null);
    setPayPhone('');
    Alert.alert('Candidatura enviada', 'O empregador foi notificado da sua candidatura.');
  }

  async function handleReport() {
    try {
      await api.post(`/jobs/${jobId}/report`);
      Alert.alert('Obrigado', 'A vaga foi reportada para revisão.');
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  }

  if (loading || !job) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Vaga" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Vaga"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handleReport} hitSlop={10}>
            <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {job.photoUrl ? (
          <Image source={{ uri: job.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : null}

        <View style={styles.content}>
          <Text style={styles.title}>{job.title}</Text>

          <View style={styles.employerRow}>
            <Avatar uri={job.employer?.photoUrl} size={40} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <View style={styles.employerNameRow}>
                <Text style={styles.employerName}>{job.employer?.name}</Text>
                {job.employer?.verified ? <VerifiedBadge size={13} /> : null}
              </View>
              {job.employer?.location ? <Text style={styles.employerLocation}>{job.employer.location}</Text> : null}
            </View>
          </View>

          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{job.sector}</Text>
            </View>
            {job.availability ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{job.availability}</Text>
              </View>
            ) : null}
          </View>

          {job.location ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
          ) : null}

          {job.payText ? (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, styles.pay]}>{job.payText}</Text>
            </View>
          ) : null}

          {job.requirements ? (
            <>
              <Text style={styles.sectionTitle}>Requisitos</Text>
              <Text style={styles.paragraph}>{job.requirements}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {job.expired ? (
          <View style={styles.expiredNotice}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.expiredNoticeText}>Esta vaga já expirou e não aceita mais candidaturas.</Text>
          </View>
        ) : (
          <Button
            title={applied ? 'Candidatura enviada ✓' : `Candidatar-me — ${APPLY_AMOUNT} MZN`}
            onPress={openCheckout}
            disabled={applied}
            variant="coral"
          />
        )}
      </View>

      <Modal
        visible={checkoutOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (payState === 'idle') setCheckoutOpen(false);
        }}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            {payState === 'waiting' || payState === 'charging' ? (
              <View style={styles.waitingWrap}>
                <ActivityIndicator size="large" color={colors.teal} />
                <Text style={styles.waitingTitle}>
                  {payState === 'charging' ? 'A iniciar pagamento...' : 'A aguardar confirmação'}
                </Text>
                <Text style={styles.waitingSub}>
                  {payMethod?.id === 'card'
                    ? 'Conclua o pagamento na página que abriu.'
                    : 'Aprove o pedido de pagamento que apareceu no seu telemóvel.'}
                </Text>
              </View>
            ) : checkoutStep === 'method' ? (
              <>
                <Text style={styles.modalTitle}>Como quer pagar?</Text>
                <Text style={styles.amount}>{APPLY_AMOUNT} MZN</Text>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={styles.methodRow}
                    onPress={() => {
                      setPayMethod(method);
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
                <Button title="Cancelar" variant="ghost" onPress={() => setCheckoutOpen(false)} style={{ marginTop: spacing.sm }} />
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setCheckoutStep('method')}>
                  <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                  <Text style={styles.backText}>Mudar método</Text>
                </TouchableOpacity>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.methodDot, { backgroundColor: payMethod.dotColor }]} />
                  <Text style={styles.modalTitle}>{payMethod.label}</Text>
                </View>
                <Text style={styles.amount}>{APPLY_AMOUNT} MZN</Text>
                <TextInput
                  value={payPhone}
                  onChangeText={setPayPhone}
                  placeholder={`Número ${payMethod.label}, ex: ${payMethod.prefixes[0]}1234567`}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmPayment}
                  autoFocus
                  style={styles.modalInput}
                />
                <View style={styles.modalActions}>
                  <Button title="Cancelar" variant="ghost" onPress={() => setCheckoutOpen(false)} style={{ flex: 1, marginRight: spacing.sm }} />
                  <Button title="Confirmar pagamento" onPress={handleConfirmPayment} style={{ flex: 1 }} />
                </View>
                <Text style={styles.finePrint}>Processado por ZumboPay.</Text>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  photo: { width: '100%', height: 220, backgroundColor: colors.navy },
  content: { padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  employerLocation: { fontSize: 12, color: colors.textMuted },
  tagsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  tag: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.teal },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  infoText: { fontSize: 14, color: colors.text },
  pay: { color: colors.coral, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: spacing.xl, marginBottom: spacing.xs },
  paragraph: { fontSize: 14, color: colors.text, lineHeight: 21 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  expiredNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  expiredNoticeText: { flex: 1, fontSize: 13, color: colors.danger },
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
