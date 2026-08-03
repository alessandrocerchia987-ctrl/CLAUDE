const nodemailer = require('nodemailer');

const SUPPORT_EMAIL_TO = process.env.SUPPORT_EMAIL_TO || 'alecerchia6@gmail.com';

let transporter;
let warnedMissingConfig = false;

// Lazily built so a missing SMTP config doesn't crash the server at boot —
// support tickets are always saved to the database regardless; email is a
// best-effort notification on top of that.
function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// Sends the report to the app owner's inbox — never to or from the
// reporting user, who never sees this address.
async function sendSupportEmail({ category, description, reporter }) {
  const t = getTransporter();
  if (!t) {
    if (!warnedMissingConfig) {
      console.warn(
        'SMTP_HOST/SMTP_USER/SMTP_PASS não estão configurados — o pedido de ' +
          'suporte foi guardado na base de dados mas o email não foi enviado. ' +
          'Ver backend/README.md.'
      );
      warnedMissingConfig = true;
    }
    return false;
  }

  const lines = [
    `Categoria: ${category}`,
    '',
    'Descrição:',
    description,
    '',
    '--- Informação do utilizador ---',
    `Nome: ${reporter.name}`,
    `ID: ${reporter.id}`,
    `Tipo de conta: ${reporter.accountType}`,
    `Telefone: ${reporter.phone || '—'}`,
    `Localização: ${reporter.location || '—'}`,
    reporter.companyName ? `Empresa: ${reporter.companyName}` : null,
    `Conta criada em: ${reporter.createdAt}`,
  ].filter((line) => line !== null);

  await t.sendMail({
    from: process.env.SMTP_USER,
    to: SUPPORT_EMAIL_TO,
    subject: `[Emprego Já] Suporte — ${category}`,
    text: lines.join('\n'),
  });
  return true;
}

module.exports = { sendSupportEmail };
