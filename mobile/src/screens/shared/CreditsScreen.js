import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme/colors';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 24; // ~60s

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', prefixes: ['84', '85'], dotColor: '#1E8A44' },
  { id: 'emola', label: 'e-Mola', prefixes: ['86', '87'], dotColor: colors.coral },
];

function methodMatchesPhone(method, phone) {
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.startsWith('258') ? digits.slice(3) : digits;
  return method.prefixes.includes(local.slice(0, 2));
}

const ACTION_LABEL_PLURAL = { apply: 'candidaturas', post_job: 'vagas publicadas' };

export default function CreditsScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [action, setAction] = useState(null);

  const [selectedPkg, setSelectedPkg] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('method'); // method | phone
  const [payMethod, setPayMethod] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [payState, setPayState] = useState('idle'); // idle | charging | waiting
  const pollTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/payments/credits/packages');
        setPackages(data.packages);
        setAction(data.action);
      } catch (err) {
        Alert.alert('Não foi possível carregar os pacotes', err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function openCheckout(pkg) {
    setSelectedPkg(pkg);
    setCheckoutStep('method');
    setPayMethod(null);
    setPayPhone('');
    setCheckoutOpen(true);
  }

  async function finishPurchase() {
    setCheckoutOpen(false);
    setPayState('idle');
    setCheckoutStep('method');
    setPayMethod(null);
    setPayPhone('');
    await refreshUser();
    Alert.alert('Créditos adicionados', `Recebeu ${selectedPkg.credits} créditos na sua conta.`);
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
          await finishPurchase();
        } else if (current === 'failed') {
          stopPolling();
          setPayState('idle');
          Alert.alert('Pagamento não confirmado', 'O pagamento falhou ou foi cancelado. Tente novamente.');
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          stopPolling();
          setPayState('idle');
          Alert.alert(
            'A demorar mais que o esperado',
            'Ainda não recebemos a confirmação do pagamento. Os créditos aparecem automaticamente assim que a confirmação chegar.'
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
      const { paymentId, status } = await api.post('/payments/credits/buy', {
        credits: selectedPkg.credits,
        method: payMethod.id,
        phone: payPhone.trim(),
      });
      if (status === 'success') {
        await finishPurchase();
        return;
      }
      await pollUntilConfirmed(paymentId);
    } catch (err) {
      setPayState('idle');
      Alert.alert('Não foi possível iniciar o pagamento', err.message);
    }
  }

  const normalPricePerCredit = action === 'apply' ? 50 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Comprar créditos" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.balanceCard}>
          <Ionicons name="wallet-outline" size={26} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>O seu saldo</Text>
            <Text style={styles.balanceValue}>
              {user.credits} {user.credits === 1 ? 'crédito' : 'créditos'}
            </Text>
          </View>
        </View>

        <Text style={styles.explainer}>
          {action === 'apply'
            ? `Cada crédito é usado automaticamente numa candidatura (em vez de pagar ${normalPricePerCredit} MZN de cada vez). Compre em pacote e poupe.`
            : `Cada crédito é usado automaticamente para publicar uma vaga (em vez de pagar ${normalPricePerCredit} MZN de cada vez). O destaque continua a ser pago à parte. Compre em pacote e poupe.`}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
        ) : (
          packages.map((pkg) => {
            const fullPrice = pkg.credits * normalPricePerCredit;
            const discountPct = Math.round((1 - pkg.price / fullPrice) * 100);
            return (
              <TouchableOpacity key={pkg.credits} style={styles.pkgCard} onPress={() => openCheckout(pkg)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgTitle}>
                    {pkg.credits} {action === 'apply' ? ACTION_LABEL_PLURAL.apply : ACTION_LABEL_PLURAL.post_job}
                  </Text>
                  <Text style={styles.pkgSub}>
                    {discountPct > 0 ? `${discountPct}% de desconto — normalmente ${fullPrice} MZN` : 'Preço normal'}
                  </Text>
                </View>
                <Text style={styles.pkgPrice}>{pkg.price} MZN</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.finePrint}>
          Sem créditos, pode continuar a pagar por cada acção normalmente — os créditos são
          totalmente opcionais.
        </Text>
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
                <Text style={styles.waitingSub}>Aprove o pedido de pagamento que apareceu no seu telemóvel.</Text>
              </View>
            ) : checkoutStep === 'method' ? (
              <>
                <Text style={styles.modalTitle}>Como quer pagar?</Text>
                <Text style={styles.amount}>{selectedPkg?.price} MZN</Text>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={styles.methodRow}
                    onPress={() => {
                      setPayMethod(method);
                      setCheckoutStep('phone');
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
                <Text style={styles.amount}>{selectedPkg?.price} MZN</Text>
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
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  balanceValue: { fontSize: 20, color: colors.white, fontWeight: '800', marginTop: 2 },
  explainer: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: spacing.lg, marginBottom: spacing.lg },
  pkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pkgTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  pkgSub: { fontSize: 12, color: colors.teal, fontWeight: '600', marginTop: 2 },
  pkgPrice: { fontSize: 17, fontWeight: '800', color: colors.navy, marginRight: spacing.xs },
  finePrint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 17 },
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
  waitingWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  waitingTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  waitingSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
