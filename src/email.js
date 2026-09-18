/**
 * Helper de envio de e-mail via Resend
 * Requer: npm install resend
 * Variáveis .env: RESEND_API_KEY, RESEND_FROM
 */

let _resend = null;
function getResend() {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY não configurada — e-mails serão ignorados.");
    return null;
  }
  const { Resend } = require("resend");
  _resend = new Resend(apiKey);
  return _resend;
}

const FROM = process.env.RESEND_FROM || "Caderninho de Frota <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "https://backend-frota-72ni.onrender.com";

/**
 * Envia e-mail de recuperação de senha
 * @param {string} para - e-mail do destinatário
 * @param {string} nome - nome do usuário (opcional)
 * @param {string} token - token de reset
 * @returns {Promise<{ok: boolean, id?: string, erro?: string}>}
 */
async function enviarEmailRecuperacaoSenha(para, nome, token) {
  const resend = getResend();
  if (!resend) {
    return { ok: false, erro: "RESEND_API_KEY não configurada" };
  }

  const link = `${APP_URL}/reset?token=${encodeURIComponent(token)}`;
  const nomeSeguro = nome || "usuário";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recuperação de senha</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.18);line-height:56px;font-size:28px;">&#128667;</div>
              <h1 style="margin:14px 0 0;color:#ffffff;font-size:20px;font-weight:700;">Caderninho de Frota</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#0f2a4a;">Recuperação de senha</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151;">
                Olá, <strong>${nomeSeguro}</strong>!
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#374151;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#3b82f6,#6366f1);">
                    <a href="${link}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;">Redefinir minha senha</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.5;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#2563eb;word-break:break-all;">
                <a href="${link}" style="color:#2563eb;">${link}</a>
              </p>
              <hr style="border:0;border-top:1px solid #e5e7eb;margin:0 0 20px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                <strong>⏰ Este link expira em 15 minutos.</strong><br>
                Se você não solicitou a recuperação, ignore este e-mail — sua senha permanece a mesma.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Caderninho de Frota &middot; Sistema Integrado de Frotas &amp; Operações
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [para],
      subject: "Recuperação de senha — Caderninho de Frota",
      html,
    });

    if (result.error) {
      console.error("[email] Resend erro:", result.error);
      return { ok: false, erro: result.error.message || "Erro no Resend" };
    }

    return { ok: true, id: result.data && result.data.id };
  } catch (err) {
    console.error("[email] Exceção:", err.message);
    return { ok: false, erro: err.message };
  }
}

module.exports = { enviarEmailRecuperacaoSenha };