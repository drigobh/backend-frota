// [FIX_60] E2E - Tela de Login
import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("deve mostrar a tela de login", async ({ page }) => {
    await expect(page.locator("#login-screen")).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-senha")).toBeVisible();
    await expect(page.locator("#btn-login-novo")).toBeVisible();
  });

  test("deve preencher email e senha e clicar em Entrar", async ({ page }) => {
    await page.fill("#login-email", "drigobh@gmail.com");
    await page.fill("#login-senha", "Admin@2026!Frota");
    await page.click("#btn-login-novo");
    
    // Aguardar redirecionamento ou tela de 2FA
    await page.waitForTimeout(3000);
    
    // Se 2FA estiver ativo, deve mostrar o bloco de 2FA
    const bloco2FA = page.locator("#login-2fa-block");
    const dashboard = page.locator("#tab-dashboard");
    
    const tem2FA = await bloco2FA.isVisible().catch(() => false);
    const temDashboard = await dashboard.isVisible().catch(() => false);
    
    expect(tem2FA || temDashboard).toBe(true);
  });

  test("deve mostrar erro com credenciais invalidas", async ({ page }) => {
    await page.fill("#login-email", "invalido@teste.com");
    await page.fill("#login-senha", "senhaerrada");
    
    // Interceptar o alert
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Erro");
      await dialog.dismiss();
    });
    
    await page.click("#btn-login-novo");
    await page.waitForTimeout(2000);
  });

  test("deve mostrar link Esqueci minha senha", async ({ page }) => {
    await expect(page.locator(".login-link-esqueci")).toBeVisible();
  });
});
