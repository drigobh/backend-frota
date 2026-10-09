# 🚛 Caderninho de Frota — Backend

[![Tests & Lint](https://github.com/drigobh/backend-frota/actions/workflows/test.yml/badge.svg)](https://github.com/drigobh/backend-frota/actions/workflows/test.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-Private-red)]()

API REST + frontend PWA para gestão de frota.

## 📋 Sumário

- [Rodando localmente](#-rodando-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Scripts npm](#-scripts-npm)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Monitoramento](#-monitoramento)
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
  - `index.html.br` — versão pre-comprimida Brotli
  - `index.html.gz` — versão pre-comprimida Gzip
  - `sw.js` — service worker
- `scripts/` — scripts auxiliares
  - `30_fix_rate_limit_dev.js`
  - `31_fix_jest_delay.js`
  - `32_seed_admin_teste.js` — seed do admin + operador de teste
  - `37_pre_compress.js` — pre-compressão do index.html
- `tests/` — testes Jest
- `.github/workflows/test.yml` — CI/CD (lint + smoke + testes em Node 20/22)

## 🎯 Scripts npm

| Script | Descrição |
|--------|-----------|
| start | Rodar em produção |
| dev | Desenvolvimento com .env.local |
| test | Rodar testes |
| test:coverage | Testes com cobertura |
| test:matricula | Apenas testes de matrícula |
| test:ci | Testes para CI (GitHub Actions) |
| lint | Verificar sintaxe dos arquivos JS |

## 🧪 Testes

Pré-requisito: servidor rodando em outro terminal.

- Terminal 1: `npm start`
- Terminal 2: `npm test`

**63 testes passando em 6 suites:**

- Auth (4)
- Endpoints protegidos (11)
- Segurança (9)
- Smoke (22)
- RBAC (10)
- Matrícula automática (5)

**CI/CD:** GitHub Actions roda lint + smoke + testes completos em Node 20.x e 22.x. PostgreSQL efêmero com auto-migrate + seed.

## 🌐 Deploy

Automático via GitHub push para `main`. O Render rebuilda em 2-3 min.

URL de produção: https://backend-frota-72ni.onrender.com

## 📊 Monitoramento

- UptimeRobot: monitora /health a cada 5 min
- Sentry: error tracking
- Logs do Render: stream em tempo real

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

### CI/CD falha no GitHub Actions

Verifica os logs em https://github.com/drigobh/backend-frota/actions

Causas comuns:
- Colunas faltando no `auto_migrate.js`
- Seed do admin/operador não rodou
- Race condition no boot do servidor

## 📞 Suporte

Issues: https://github.com/drigobh/backend-frota/issues