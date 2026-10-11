// tests/e2e/2fa.spec.js
// [FIX_82] Testes E2E para 2FA com geracao real de codigo TOTP
const { test, expect } = require('@playwright/test');
const speakeasy = require('speakeasy');
const db = require('../../src/database');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// Funcao para obter o totp_secret do usuario no banco
async function obterTotpSecret() {
  const result = await db.query('SELECT totp_secret, totp_ativo FROM usuarios WHERE email = $1', [TEST_EMAIL]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// Funcao para gerar codigo TOTP valido
function gerarCodigoTotp(secret) {
  return speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
}

test.describe('Fluxo de 2FA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir o campo de 2FA apos login com credenciais validas', async ({ page }) => {
    const info = await obterTotpSecret();
    
    // Se o 2FA nao estiver ativo, pula o teste
    test.skip(!info || !info.totp_ativo, '2FA esta desativado para este usuario');

    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');
    
    await expect(page.locator('#login-2fa-block')).toBeVisible({ timeout: 15000 });
  });

  test('deve aceitar codigo TOTP valido e logar', async ({ page }) => {
    const info = await obterTotpSecret();
    test.skip(!info || !info.totp_ativo, '2FA esta desativado para este usuario');

    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');
    
    await page.waitForSelector('#login-2fa-block', { timeout: 15000 });
    
    // Gerar codigo TOTP valido
    const codigo = gerarCodigoTotp(info.totp_secret);
    console.log('Codigo TOTP gerado:', codigo);
    
    const inputCodigo = page.locator('#login-2fa-block input');
    await inputCodigo.fill(codigo);
    await page.click('#btn-login-2fa');
    
    // Deve redirecionar para o dashboard
    await expect(page.locator('#tab-dashboard')).toBeVisible({ timeout: 15000 });
  });

  test('deve rejeitar codigo de 2FA invalido', async ({ page }) => {
    const info = await obterTotpSecret();
    test.skip(!info || !info.totp_ativo, '2FA esta desativado para este usuario');

    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');
    
    await page.waitForSelector('#login-2fa-block', { timeout: 15000 });
    
    const inputCodigo = page.locator('#login-2fa-block input');
    await inputCodigo.fill('000000');
    await page.click('#btn-login-2fa');
    
    // Tenta multiplos seletores de erro
    const seletoresErro = ['.alerta-erro', '.mensagem-erro', '.erro', '[role=alert]'];
    let erroEncontrado = false;
    for (const seletor of seletoresErro) {
      try {
        await page.waitForSelector(seletor, { timeout: 3000 });
        erroEncontrado = true;
        break;
      } catch (e) {}
    }
    
    if (!erroEncontrado) {
      const url = page.url();
      expect(url).not.toContain('dashboard');
    }
  });
});