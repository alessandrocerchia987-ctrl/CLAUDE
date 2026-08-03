const crypto = require('node:crypto');

const BASE_URL = 'https://zumbopay.com/api/public/v1';

// M-Pesa numbers start 84/85, e-Mola 86/87 (after the 258 country code).
function channelForMsisdn(msisdn) {
  const digits = String(msisdn).replace(/\D/g, '');
  const local = digits.startsWith('258') ? digits.slice(3) : digits;
  const prefix = local.slice(0, 2);
  if (['84', '85'].includes(prefix)) return 'mpesa';
  if (['86', '87'].includes(prefix)) return 'emola';
  return null;
}

function walletIdForChannel(channel) {
  if (channel === 'mpesa') return process.env.ZUMBOPAY_WALLET_MPESA;
  if (channel === 'emola') return process.env.ZUMBOPAY_WALLET_EMOLA;
  return null;
}

function requireConfig() {
  const missing = ['ZUMBOPAY_API_KEY', 'ZUMBOPAY_MERCHANT_ID'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Configuração de pagamento em falta: ${missing.join(', ')}.`);
  }
}

// Triggers a direct STK push — the customer gets a PIN prompt on their
// phone, no redirect. M-Pesa/e-Mola only (cards need the hosted-checkout
// flow, not implemented here). Resolves with ZumboPay's response body
// (status: 'success' | 'pending'), or throws on a 4xx/5xx.
async function createCharge({ amount, msisdn, customerName, sourceId }) {
  requireConfig();

  const channel = channelForMsisdn(msisdn);
  if (!channel) {
    throw new Error('Este número não corresponde a M-Pesa nem a e-Mola.');
  }
  const walletId = walletIdForChannel(channel);
  if (!walletId) {
    throw new Error(
      `A carteira de ${channel === 'mpesa' ? 'M-Pesa' : 'e-Mola'} ainda não está configurada.`
    );
  }

  const requestBody = {
    wallet_id: walletId,
    amount,
    msisdn,
    customer_name: customerName,
    source_id: sourceId,
  };
  console.log('[zumbopay] POST /charges request:', JSON.stringify(requestBody));

  let res;
  let rawText;
  try {
    res = await fetch(`${BASE_URL}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZUMBOPAY_API_KEY}`,
        'X-Merchant-Id': process.env.ZUMBOPAY_MERCHANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    rawText = await res.text();
  } catch (err) {
    console.error('[zumbopay] fetch itself failed:', err);
    throw new Error(`Falha de rede ao contactar o ZumboPay: ${err.message}`);
  }

  console.log(`[zumbopay] POST /charges response ${res.status}:`, rawText);

  let body = null;
  try {
    body = JSON.parse(rawText);
  } catch {
    // non-JSON response — body stays null, handled below
  }

  if (!res.ok && res.status !== 202) {
    throw new Error(body?.error?.message || rawText || `Pagamento recusado (${res.status}).`);
  }
  return body?.data;
}

// Creates a hosted-checkout payment (needed for cards — Visa/Mastercard
// with 3-D Secure — which POST /charges' direct STK push doesn't support).
// Returns { checkoutUrl, reference, ... } — the app opens checkoutUrl in a
// browser for the customer to enter their card there; ZumboPay pushes the
// result via the same webhook as STK charges.
async function createHostedPayment({ amount, title, sourceId }) {
  requireConfig();
  const walletId = process.env.ZUMBOPAY_WALLET_CARD;
  if (!walletId) {
    throw new Error('A carteira de cartão (Visa/Mastercard) ainda não está configurada.');
  }

  const requestBody = {
    wallet_id: walletId,
    amount,
    currency: 'MZN',
    title,
    source_id: sourceId,
  };
  console.log('[zumbopay] POST /payments request:', JSON.stringify(requestBody));

  let res;
  let rawText;
  try {
    res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZUMBOPAY_API_KEY}`,
        'X-Merchant-Id': process.env.ZUMBOPAY_MERCHANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    rawText = await res.text();
  } catch (err) {
    console.error('[zumbopay] fetch itself failed:', err);
    throw new Error(`Falha de rede ao contactar o ZumboPay: ${err.message}`);
  }

  console.log(`[zumbopay] POST /payments response ${res.status}:`, rawText);

  let body = null;
  try {
    body = JSON.parse(rawText);
  } catch {
    // non-JSON response — body stays null, handled below
  }

  if (!res.ok) {
    throw new Error(body?.error?.message || rawText || `Pagamento recusado (${res.status}).`);
  }
  return body?.data;
}

// Verifies the `x-zumbopay-signature` header against the *raw* request
// body — must be called with the unparsed bytes, not the parsed JSON,
// since HMACs are computed over the exact bytes ZumboPay sent.
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.ZUMBOPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !rawBody) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { channelForMsisdn, createCharge, createHostedPayment, verifyWebhookSignature };
