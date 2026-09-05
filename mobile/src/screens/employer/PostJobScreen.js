import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import ScreenHeader from '../../components/ScreenHeader';
import FormField from '../../components/FormField';
import ChipSelect from '../../components/ChipSelect';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { pickImage } from '../../utils/pickImage';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme/colors';
import { AVAILABILITY_OPTIONS, JOB_LIFETIME_DAYS } from '../../constants';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 24; // ~60s

const JOB_POST_BASE = 100;
const JOB_BOOST_ADDON = 50;

// Card temporarily hidden — ZumboPay's hosted checkout doesn't return to
// the app after payment, and M-Pesa/e-Mola cover the vast majority of
// how people in Mozambique pay anyway. Re-add once a working card
// provider (e.g. PaySuite) is wired up.
const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', prefixes: ['84', '85'], dotColor: '#1E8A44' },
  { id: 'emola', label: 'e-Mola', prefixes: ['86', '87'], dotColor: colors.coral },
];

function methodMatchesPhone(method, phone) {
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.startsWith('258') ? digits.slice(3) : digits;
  return method.prefixes.includes(local.slice(0, 2));
}

const initialForm = {
  title: '',
  sector: '',
  location: '',
  payText: '',
  availability: '',
  requirements: '',
};

export default function PostJobScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [boost, setBoost] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('method'); // method | phone
  const [payMethod, setPayMethod] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [payState, setPayState] = useState('idle'); // idle | charging | waiting | done
  const pollTimer = useRef(null);

  const total = JOB_POST_BASE + (boost ? JOB_BOOST_ADDON : 0);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCheckout() {
    if (!form.title.trim() || !form.sector.trim()) {
      Alert.alert('Campos em falta', 'O título e o sector/profissão são obrigatórios.');
      return;
    }
    setCheckoutStep('method');
    setPayMethod(null);
    setPayPhone('');
    setCheckoutOpen(true);
  }

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function buildFormData() {
    const formData = new FormData();
    formData.append('purpose', 'post_job');
    formData.append(
      'payload',
      JSON.stringify({
        title: form.title.trim(),
        sector: form.sector.trim(),
        location: form.location || null,
        payText: form.payText || null,
        availability: form.availability || null,
        requirements: form.requirements || null,
        boost,
      })
    );
    if (photo) formData.append('photo', photo);
    return formData;
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
          await finishPost();
        } else if (current === 'failed') {
          stopPolling();
          setPayState('idle');
          Alert.alert('Pagamento não confirmado', 'O pagamento falhou ou foi cancelado. Tente novamente.');
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          stopPolling();
          setPayState('idle');
          Alert.alert(
            'A demorar mais que o esperado',
            'Ainda não recebemos a confirmação do pagamento. Se já aprovou, a vaga será publicada automaticamente assim que a confirmação chegar.'
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
    if (payMethod.id !== 'credit' && !methodMatchesPhone(payMethod, payPhone)) {
      Alert.alert(
        'Número não corresponde',
        `Este número não parece ser um número ${payMethod.label}. Verifique o número ou escolha outro método.`
      );
      return;
    }
    setPayState('charging');
    try {
      const formData = buildFormData();
      if (payMethod.id === 'credit') formData.append('method', 'credit');
      formData.append('phone', payPhone.trim());
      const { paymentId, status } = await api.postForm('/payments/charge', formData);

      if (status === 'success') {
        await finishPost();
        return;
      }
      await pollUntilConfirmed(paymentId);
    } catch (err) {
      setPayState('idle');
      Alert.alert('Não foi possível iniciar o pagamento', err.message);
    }
  }

  // Boost still needs a real 50 MZN charge even when paid with a credit
  // (it's an optional add-on, not the core action the credit covers), so
  // that case still needs a phone number — everything else completes
  // instantly with no external payment at all.
  async function handlePayWithCredit() {
    if (boost) {
      setPayMethod({ id: 'credit', label: 'Crédito' });
      setCheckoutStep('phone');
      return;
    }
    setPayState('charging');
    try {
      const formData = buildFormData();
      formData.append('method', 'credit');
      const { status } = await api.postForm('/payments/charge', formData);
      if (status === 'success') {
        await finishPost();
      }
    } catch (err) {
      setPayState('idle');
      Alert.alert('Não foi possível usar o crédito', err.message);
    }
  }

  async function handleCardPayment() {
    setPayState('charging');
    try {
      const formData = buildFormData();
      formData.append('method', 'card');
      const { paymentId, status, checkoutUrl } = await api.postForm('/payments/charge', formData);

      if (status === 'success') {
        await finishPost();
        return;
      }
      if (!checkoutUrl) {
        throw new Error('Não foi possível obter o link de pagamento.');
      }

      setPayState('waiting');
      await WebBrowser.openAuthSessionAsync(checkoutUrl, 'empregoja://payment-complete');
      await pollUntilConfirmed(paymentId);
    } catch (err) {
      setPayState('idle');
      Alert.alert('Não foi possível iniciar o pagamento', err.message);
    }
  }

  async function finishPost() {
    setPayState('done');
    setCheckoutOpen(false);
    setPayState('idle');
    setCheckoutStep('method');
    setPayMethod(null);
    setPayPhone('');
    setForm(initialForm);
    setPhoto(null);
    setBoost(false);
    refreshUser();
    Alert.alert(
      'Vaga publicada',
      `A sua vaga já está visível para os candidatos durante ${JOB_LIFETIME_DAYS} dias.`,
      [{ text: 'OK', onPress: () => navigation.navigate('EmployerHome') }]
    );
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

        <View style={styles.boostRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.boostTitle}>Impulsionar vaga (+{JOB_BOOST_ADDON} MZN)</Text>
            <Text style={styles.boostSub}>A sua vaga aparece no topo, acima das vagas não impulsionadas.</Text>
          </View>
          <Switch value={boost} onValueChange={setBoost} trackColor={{ true: colors.coral }} />
        </View>

        <View style={styles.expiryNotice}>
          <Ionicons name="time-outline" size={16} color={colors.teal} />
          <Text style={styles.expiryNoticeText}>
            Esta vaga fica visível durante {JOB_LIFETIME_DAYS} dias. Depois disso expira
            automaticamente e deixa de aparecer para os candidatos — se ainda precisar de
            contratar, terá de publicar novamente.
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>{total} MZN</Text>
        </View>

        <Button title={`Publicar vaga — ${total} MZN`} variant="coral" onPress={openCheckout} style={{ marginTop: spacing.md }} />
      </ScrollView>

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
                <Text style={styles.amount}>{total} MZN</Text>
                {user.credits > 0 ? (
                  <TouchableOpacity style={[styles.methodRow, styles.creditMethodRow]} onPress={handlePayWithCredit}>
                    <Ionicons name="wallet-outline" size={16} color={colors.gold} />
                    <Text style={styles.methodLabel}>
                      Usar 1 crédito{boost ? ` + ${JOB_BOOST_ADDON} MZN (destaque)` : ''}
                    </Text>
                    <Text style={styles.creditBalanceHint}>Tem {user.credits}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { setCheckoutOpen(false); navigation.navigate('Credits'); }}>
                    <Text style={styles.buyCreditsLink}>Comprar créditos e poupar em futuras publicações</Text>
                  </TouchableOpacity>
                )}
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
                  {payMethod.id !== 'credit' ? (
                    <View style={[styles.methodDot, { backgroundColor: payMethod.dotColor }]} />
                  ) : null}
                  <Text style={styles.modalTitle}>
                    {payMethod.id === 'credit' ? 'Destaque — M-Pesa ou e-Mola' : payMethod.label}
                  </Text>
                </View>
                <Text style={styles.amount}>{payMethod.id === 'credit' ? `1 crédito + ${JOB_BOOST_ADDON} MZN` : `${total} MZN`}</Text>
                <TextInput
                  value={payPhone}
                  onChangeText={setPayPhone}
                  placeholder={
                    payMethod.id === 'credit'
                      ? 'Número M-Pesa ou e-Mola, ex: 841234567'
                      : `Número ${payMethod.label}, ex: ${payMethod.prefixes[0]}1234567`
                  }
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  photoPicker: { height: 160, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  photoPlaceholderText: { fontSize: 12, color: colors.textMuted },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  boostTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  boostSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  expiryNotice: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.lg },
  expiryNoticeText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.navy },
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
  creditMethodRow: { backgroundColor: '#FFF8EC', borderColor: colors.gold },
  creditBalanceHint: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginRight: spacing.xs },
  buyCreditsLink: { fontSize: 13, color: colors.teal, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
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
