# 🚛 Caderninho de Frota — Backend

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-Private-red)]()
[![CI](https://github.com/drigobh/backend-frota/actions/workflows/ci.yml/badge.svg)](https://github.com/drigobh/backend-frota/actions/workflows/ci.yml)
[![Testes E2E](https://img.shields.io/badge/E2E-60%2F60%20passing-brightgreen)]()
[![2FA](https://img.shields.io/badge/2FA-TOTP-green)]()

API REST + frontend PWA para gestão de frota.

## 📋 Sumário

- [Rodando localmente](#-rodando-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Scripts npm](#-scripts-npm)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Monitoramento](#-monitoramento)
- [Autenticação em 2 Fatores (2FA)](#-autenticação-em-2-fatores-2fa)
- [Credenciais de teste](#-credenciais-de-teste)
- [Troubleshooting](#-troubleshooting)

## 🚀 Rodando localmente

### Pré-requisitos

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+ (ou Neon)
- Git

### Setup

Clone o repositório, instale as dependências com `npm install`, configure o `.env` baseado no `.env.example`, e rode `npm start`.

Acesse: http://localhost:3000

## 🔐 Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| PORT | Não | Porta (default: 3000) |
| NODE_ENV | Sim | development ou production |
| DATABASE_URL | Sim | String de conexão PostgreSQL |
| JWT_SECRET | Sim | Chave secreta com 128+ chars |
| CORS_ORIGINS | Não | Origens permitidas separadas por vírgula |
| SKIP_RATE_LIMIT | Não | true para pular rate limit em dev/test |
| RESEND_API_KEY | Não | Chave do Resend para enviar emails |
| RESEND_FROM | Não | Email de origem |
| SENTRY_DSN | Não | DSN do Sentry |

## 📂 Estrutura do projeto

- `src/` — código-fonte do backend
  - `server.js` — servidor Fastify principal
  - `database.js` — pool PostgreSQL
  - `auto_migrate.js` — migrações automáticas (11 tabelas + RBAC)
  - `email.js` — envio de email via Resend
  - `middleware/` — middlewares (autorizar, etc.)
  - `routes/` — rotas da API
- `public/` — frontend estático (SPA PWA)
  - `index.html` — HTML principal
  - `sw.js` — service worker
- `scripts/` — scripts auxiliares
  - `32_seed_admin_teste.js` — seed do admin + operador de teste
  - `37_pre_compress.js` — pre-compressão do index.html
- `tests/` — testes Jest
- `tests/e2e/` — testes E2E (Playwright)
- `.github/workflows/` — CI/CD (lint + testes)

## 🎯 Scripts npm

| Script | Descrição |
|--------|-----------|
| start | Rodar em produção |
| dev | Desenvolvimento com .env.local |
| test | Rodar testes Jest |
| test:coverage | Testes com cobertura |
| test:matricula | Apenas testes de matrícula |
| test:ci | Testes para CI (GitHub Actions) |
| test:e2e | Rodar testes E2E (Playwright) |
| test:e2e:ui | Rodar testes E2E com interface |
| lint | Verificar sintaxe dos arquivos JS |
| format | Formatar código com Prettier |

## 🧪 Testes

Pré-requisito: servidor rodando em outro terminal.

- Terminal 1: `npm start`
- Terminal 2: `npm test`

**Testes Jest:**
- `01-api-auth.test.js` — Auth (4)
- `02-api-endpoints.test.js` — Endpoints protegidos (11)
- `03-security.test.js` — Segurança (9)
- `04-smoke.test.js` — Smoke (22)
- `05-rbac.test.js` — RBAC (10)
- `06-matricula-auto.test.js` — Matrícula automática (5)
- `07-2fa.test.js` — 2FA
- `08-dre.test.js` — DRE
- `09-backup.test.js` — Backup
- `10-financeiro.test.js` — Financeiro
- `11-usuarios.test.js` — Usuários

**Testes E2E (Playwright):**
- `tests/e2e/2fa.spec.js` — Fluxo de 2FA

**CI/CD:** GitHub Actions roda lint + smoke + testes completos em Node 20.x e 22.x. PostgreSQL efêmero com auto-migrate + seed.

## 🌐 Deploy

Automático via GitHub push para `main`. O Render rebuilda em 2-3 min.

URL de produção: https://backend-frota-72ni.onrender.com

## 📊 Monitoramento

- UptimeRobot: monitora /health a cada 5 min
- Sentry: error tracking
- Logs do Render: stream em tempo real

## 🔐 Autenticação em 2 Fatores (2FA)

O sistema usa **TOTP (Time-based One-Time Password)** via `speakeasy` e QR Code.

### Fluxo de ativação (setup)

1. Faça login com um usuário que **não tenha 2FA ativo**.
2. No painel, vá em **Configurações > Segurança > 2FA**.
3. Clique em **Ativar 2FA**.
4. Escaneie o QR Code com o **Google Authenticator**, **Authy** ou similar.
5. Digite o código de 6 dígitos para confirmar.
6. **Guarde os 10 códigos de recuperação** exibidos (cada um só pode ser usado uma vez).

### Fluxo de login (com 2FA ativo)

1. Faça login com email + senha.
2. O backend responde `{ requer_2fa: true, token_temp: "..." }`.
3. O frontend exibe o bloco de 2FA (`#login-2fa-block`).
4. Digite o código de 6 dígitos do app autenticador.
5. O backend valida e emite o JWT final.

### Fluxo de setup obrigatório (perfil exige 2FA)

Se o perfil do usuário tem `totp_obrigatorio = true` e ele ainda não ativou:

1. Faça login com email + senha.
2. O backend responde `{ requer_2fa_setup: true, token: "..." }`.
3. O frontend exibe o bloco de setup (`#login-2fa-setup-block`).
4. Usuário escaneia o QR Code e confirma o código.
5. Só então o JWT final é emitido.

### Desativar 2FA

```bash
POST /api/auth/2fa/desativar
Authorization: Bearer <token>
Content-Type: application/json

{
  "senha": "sua_senha_atual",
  "codigo": "123456"
}
```

### Resetar 2FA (admin)

Se um usuário perdeu o celular, o admin pode resetar:

```bash
PUT /api/usuarios/:id/resetar-2fa
Authorization: Bearer <token_admin>
```

### Endpoints de 2FA

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/2fa/setup` | Gera segredo + QR Code |
| POST | `/api/auth/2fa/verificar` | Confirma código e ativa 2FA |
| POST | `/api/auth/2fa/desativar` | Desativa 2FA (senha + código) |
| GET | `/api/auth/2fa/status` | Verifica se 2FA está ativo |
| POST | `/api/login/2fa` | Valida código TOTP no login |
| PUT | `/api/usuarios/:id/resetar-2fa` | Admin reseta 2FA de um usuário |

## 🔑 Credenciais de teste

> ⚠️ **ATENÇÃO:** Estas credenciais são para **ambiente de desenvolvimento/teste**. **NUNCA** use em produção.

| Usuário | Email | Senha | Perfil | 2FA |
|---------|-------|-------|--------|-----|
| Admin principal | `drigobh@gmail.com` | `Admin@2026!Frota` | Administrador | Ativo |
| Admin de teste | `admin-teste@frota.com` | (seed `32_seed_admin_teste.js`) | Administrador | Inativo |
| Operador de teste | `teste@tes.com` | (seed `32_seed_admin_teste.js`) | Operador | Inativo |

### Seed de teste

O script `scripts/32_seed_admin_teste.js` cria/atualiza automaticamente:

- `admin-teste@frota.com` (Administrador, 2FA inativo)
- `teste@tes.com` (Operador, 2FA inativo)

Ele roda **automaticamente antes dos testes** (`pretest` no `package.json`).

---

## 🔧 Troubleshooting

### Servidor não sobe com [WATCHDOG]

Verifica se o Neon (https://console.neon.tech) está ativo.

### Deploy falha com Cannot find module

Regenera o lockfile:

- `rm -rf node_modules package-lock.json`
- `npm install`
- `git add package-lock.json`
- `git commit -m "chore: regenera lockfile"`
- `git push`

### Email não envia com API key is invalid

Atualiza a env var `RESEND_API_KEY` no Render com a chave completa.

### 2FA não aparece na tela de login

Verifica se:
1. O usuário tem `totp_ativo = true` no banco.
2. O backend está respondendo `{ requer_2fa: true, token_temp: "..." }`.
3. O frontend tem os blocos `#login-2fa-block` e `#login-2fa-setup-block` no `index.html`.
4. As funções `voltarLogin` e `voltarLoginSetup` usam `style.display` (não `classList`).

### Perdi o acesso ao app autenticador

1. **Se você tem códigos de recuperação:** use um deles no lugar do código de 6 dígitos.
2. **Se não tem:** peça para outro admin resetar seu 2FA via `PUT /api/usuarios/:id/resetar-2fa`.
3. **Se você é o único admin:** acesse o banco direto e execute:
   ```sql
   UPDATE usuarios SET totp_ativo = false, totp_secret = NULL WHERE email = 'seu@email.com';
   ```

### CI/CD falha no GitHub Actions

Verifica os logs em https://github.com/drigobh/backend-frota/actions

Causas comuns:
- Colunas faltando no `auto_migrate.js`
- Seed do admin/operador não rodou
- Race condition no boot do servidor

## 📞 Suporte

Issues: https://github.com/drigobh/backend-frota/issues

---

## ✅ Status do Projeto (atualizado em 13/10/2026)

| Item | Status |
|------|--------|
| CI/CD (GitHub Actions) | ✅ Verde |
| Login + 2FA | ✅ Funcional |
| Testes E2E (Playwright) | ✅ **60/60 passando** |
| Testes Jest (unitários) | ✅ Passando |
| Documentação | ✅ Atualizada |
| Backups antigos | ✅ Limpos |
| `package.json` | ✅ Saudável (10/10 scripts) |

### Últimos marcos

- **FIX_77** - 60/60 testes E2E passando (helper auth + admin-teste sem 2FA)
- **FIX_75** - 2FA funcional + cache pré-comprimido resolvido
- **FIX_74** - Causa raiz do 2FA (cache pré-comprimido)
- **FIX_73** - Documentação completa de 2FA
- **FIX_71** - Padronização das funções de 2FA
- **FIX_69** - BOM no `package.json` removido

### Estrutura de Testes E2E

- `tests/e2e/helpers/auth.js` — Helper compartilhado de autenticação
- `tests/e2e/2fa.spec.js` — 6 testes do fluxo de 2FA
- `tests/e2e/login.spec.mjs` — 4 testes de login
- `tests/e2e/*.spec.js` — 50 testes de CRUD/telas

**Usuário de teste:** `admin-teste@frota.com` / `Admin@2026!Frota` (sem 2FA)


---

## 🎨 Melhorias de UX (FIX_UX_01 a FIX_UX_05)

| # | Melhoria | Detalhes |
|---|----------|----------|
| 1 | **Spinner no login** | Feedback visual durante autenticacao |
| 2 | **Validacao de formulario** | Inputs envolvidos em `<form>` |
| 3 | **Acessibilidade** | 12 `aria-label` + 21 `aria-hidden` |
| 4 | **Contraste do modo escuro** | 235 cores hardcoded substituidas por variaveis CSS |
| 5 | **Responsividade mobile** | Breakpoints: 375px, 480px, 640px, toque em mobile |

**Commits:**
- `20bfc08` - Spinner no login
- `980171e` - Validacao de formulario
- `9b49983` - Acessibilidade
- `13e59b7` - Contraste do modo escuro
- `37c1ce4` - Responsividade mobile
