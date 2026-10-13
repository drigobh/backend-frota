# Caderninho de Frota - Documentação Geral

## 📋 Visão Geral
Sistema Corporativo de Gestão de Frota - Caderninho de Motorista.

## 🔐 Credenciais de Teste
- **Email:** drigobh@gmail.com
- **Senha:** Admin@2026!Frota
- **2FA:** Ativo (código de 6 dígitos do app autenticador)

## 🔧 Configuração do 2FA
1. Acesse o painel administrativo.
2. Vá em **Configurações > Segurança > 2FA**.
3. Clique em **Ativar 2FA**.
4. Escaneie o QR Code com o Google Authenticator (ou similar).
5. Guarde os códigos de recuperação.

## 🧪 Testes E2E (Playwright)
```bash
# Rodar testes
npm run test:e2e

# Rodar com interface
npm run test:e2e:ui
```

## 🚀 Scripts Disponíveis
- `npm start` - Inicia o servidor.
- `npm run dev` - Inicia em modo desenvolvimento.
- `npm test` - Roda testes unitários.
- `npm run test:matricula` - Roda testes de matrícula.
- `npm run test:ci` - Roda testes no CI.
- `npm run lint` - Roda ESLint.
- `npm run format` - Formata código com Prettier.

## 📊 CI/CD
- Workflow: `CI - Lint e Testes`
- Status: ✅ Passando (após correção `FIX_69` - BOM no package.json)
- URL: https://github.com/drigobh/backend-frota/actions

## 📝 Histórico de Correções (atualizado)

### Correções críticas
- `FIX_69` - Remove BOM do `package.json` no índice do Git (causava erro no Jest)
- `FIX_68` - Adiciona `.gitattributes` para normalizar line endings
- `FIX_67` - Força normalização do `package.json` sem BOM
- `FIX_66` - Corrige input de email e função de login no código-fonte
- `FIX_60` - Adiciona testes E2E com Playwright
- `FIX_60` - Remove `type:module` + renomeia Playwright para `.mjs`

### Correções de 2FA (FIX_71)
- Padroniza funções de 2FA para usar `style.display`
- Corrige variáveis globais `_tokenTemp2FA` e `_tokenTempSetup2FA`
- Corrige função `executarLoginNaNuvem` para tratar 3 cenários:
  - `requer_2fa` (2FA ativo)
  - `requer_2fa_setup` (2FA obrigatório mas não ativado)
  - Login normal

### Fases anteriores
- `FASE_3A` - Fix dos cards instalado

## 📝 Histórico de Correções
- `FIX_60` - Adiciona testes E2E com Playwright.
- `FIX_60` - Remove `type:module` + renomeia Playwright para `.mjs`.
- `FASE_3A` - Fix dos cards instalado.