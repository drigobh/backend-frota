/**
 * FASE_5_GMAIL_SMTP - Envio de email via Gmail SMTP (Nodemailer)
 * Permite envio para qualquer destinatario.
 */

const nodemailer = require("nodemailer");

let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn("[email] EMAIL_USER ou EMAIL_PASS nao configurados.");
    return null;
  }

  /* FASE_12_TIMEOUTS_SMTP - evita travamento infinito no envio */
  _transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: false,
    auth: { user: user, pass: pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  return _transporter;
}

const FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const APP_URL = process.env.APP_URL || "https://backend-frota-72ni.onrender.com";

async function enviarEmailRecuperacaoSenha(para, nome, token) {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, erro: "EMAIL_USER/EMAIL_PASS nao configurados" };
  }

  const link = APP_URL + "/reset?token=" + encodeURIComponent(token);
  const nomeSeguro = nome || "usuario";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Recuperacao de senha</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:28px 32px;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.18);line-height:56px;font-size:28px;">&#128667;</div>
          <h1 style="margin:14px 0 0;color:#ffffff;font-size:20px;font-weight:700;">Caderninho de Frota</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f2a4a;">Recuperacao de senha</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151;">Ola, <strong>${nomeSeguro}</strong>!</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#374151;">Recebemos uma solicitacao para redefinir a senha da sua conta. Clique no botao abaixo:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td align="center" style="border-radius:10px;background:linear-gradient(135deg,#3b82f6,#6366f1);">
              <a href="${link}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;">Redefinir minha senha</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Se o botao nao funcionar, copie este link:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#2563eb;word-break:break-all;"><a href="${link}">${link}</a></p>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:0 0 20px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;"><strong>Este link expira em 15 minutos.</strong><br>Se voce nao solicitou, ignore este e-mail.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Caderninho de Frota &middot; Sistema de Frotas</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: FROM,
      to: para,
      subject: "Recuperacao de senha - Caderninho de Frota",
      html: html,
    });

    console.log("[email] Enviado para " + para + " - ID: " + info.messageId);
    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error("[email] Erro:", err.message);
    return { ok: false, erro: err.message };
  }
}

module.exports = { enviarEmailRecuperacaoSenha };
