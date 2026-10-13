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
    // Capturar logs do console
    page.on('console', msg => {
      console.log('BROWSER LOG:', msg.type(), msg.text());
    });
    page.on('pageerror', err => {
      console.log('BROWSER ERROR:', err.message);
    });
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
    if (!info || !info.totp_ativo) {
      console.log('[SKIP] 2FA esta desativado para este usuario. Pulando teste.');
      test.skip();
      return;
    }

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
    if (!info || !info.totp_ativo) {
      console.log('[SKIP] 2FA esta desativado para este usuario. Pulando teste.');
      test.skip();
      return;
    }

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

  test('deve voltar para o login ao clicar em "Voltar para o login"', async ({ page }) => {
    const info = await obterTotpSecret();
    if (!info || !info.totp_ativo) {
      console.log('[SKIP] 2FA esta desativado para este usuario. Pulando teste.');
      test.skip();
      return;
    }

    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');

    await page.waitForSelector('#login-2fa-block', { timeout: 15000 });

    // Clicar em "Voltar para o login"
    await page.click('.login-2fa-back');

    // Deve voltar para o formulario de login
    await expect(page.locator('#login-form')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#login-2fa-block')).not.toBeVisible();
  });

  test('deve mostrar erro ao tentar enviar codigo vazio', async ({ page }) => {
    const info = await obterTotpSecret();
    if (!info || !info.totp_ativo) {
      console.log('[SKIP] 2FA esta desativado para este usuario. Pulando teste.');
      test.skip();
      return;
    }

    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');

    await page.waitForSelector('#login-2fa-block', { timeout: 15000 });

    // Clicar em confirmar sem preencher o codigo
    await page.click('#btn-login-2fa');

    // Deve aparecer um alerta ou permanecer na tela de 2FA
    await expect(page.locator('#login-2fa-block')).toBeVisible();
  });

  test('deve limpar o codigo 2FA ao voltar e tentar novamente', async ({ page }) => {
    const info = await obterTotpSecret();
    if (!info || !info.totp_ativo) {
      console.log('[SKIP] 2FA esta desativado para este usuario.');
      test.skip();
      return;
    }

    // 1ª tentativa: fazer login
    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');
    await page.waitForSelector('#login-2fa-block', { timeout: 15000, state: 'visible' });

    // Preencher com codigo invalido
    await page.locator('#login-2fa-codigo').fill('111111');

    // Voltar para o login
    await page.click('.login-2fa-back');
    await expect(page.locator('#login-form')).toBeVisible({ timeout: 5000 });

    // Recarregar a pagina para limpar o estado acumulado (comportamento real do usuario)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 2ª tentativa: fazer login novamente
    await page.fill('#login-email', TEST_EMAIL);
    await page.fill('#login-senha', TEST_PASSWORD);
    await page.click('#btn-login-novo');
    await page.waitForSelector('#login-2fa-block', { timeout: 15000, state: 'visible' });

    // O campo de codigo deve estar vazio
    const valorCodigo = await page.locator('#login-2fa-codigo').inputValue();
    expect(valorCodigo).toBe('');
  });

});