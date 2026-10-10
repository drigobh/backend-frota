![CI](https://github.com/drigobh/backend-frota/actions/workflows/ci.yml/badge.svg)

# ðŸš› Caderninho de Frota â€” Backend

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-Private-red)]()

API REST + frontend PWA para gestÃ£o de frota.

## ðŸ“‹ SumÃ¡rio

- [Rodando localmente](#-rodando-localmente)
- [VariÃ¡veis de ambiente](#-variÃ¡veis-de-ambiente)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Scripts npm](#-scripts-npm)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Monitoramento](#-monitoramento)
- [Troubleshooting](#-troubleshooting)

## ðŸš€ Rodando localmente

### PrÃ©-requisitos

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+ (ou Neon)
- Git

### Setup

Clone o repositÃ³rio, instale as dependÃªncias com `npm install`, configure o `.env` baseado no `.env.example`, e rode `npm start`.

Acesse: http://localhost:3000

## ðŸ” VariÃ¡veis de ambiente

| VariÃ¡vel | ObrigatÃ³ria | DescriÃ§Ã£o |
|----------|-------------|-----------|
| PORT | NÃ£o | Porta (default: 3000) |
| NODE_ENV | Sim | development ou production |
| DATABASE_URL | Sim | String de conexÃ£o PostgreSQL |
| JWT_SECRET | Sim | Chave secreta com 128+ chars |
| CORS_ORIGINS | NÃ£o | Origens permitidas separadas por vÃ­rgula |
| SKIP_RATE_LIMIT | NÃ£o | true para pular rate limit em dev/test |
| RESEND_API_KEY | NÃ£o | Chave do Resend para enviar emails |
| RESEND_FROM | NÃ£o | Email de origem |
| SENTRY_DSN | NÃ£o | DSN do Sentry |

## ðŸ“‚ Estrutura do projeto

- `src/` â€” cÃ³digo-fonte do backend
  - `server.js` â€” servidor Fastify principal
  - `database.js` â€” pool PostgreSQL
  - `auto_migrate.js` â€” migraÃ§Ãµes automÃ¡ticas (11 tabelas + RBAC)
  - `email.js` â€” envio de email via Resend
  - `middleware/` â€” middlewares (autorizar, etc.)
  - `routes/` â€” rotas da API
- `public/` â€” frontend estÃ¡tico (SPA PWA)
  - `index.html` â€” HTML principal
  - `index.html.br` â€” versÃ£o pre-comprimida Brotli
  - `index.html.gz` â€” versÃ£o pre-comprimida Gzip
  - `sw.js` â€” service worker
- `scripts/` â€” scripts auxiliares
  - `30_fix_rate_limit_dev.js`
  - `31_fix_jest_delay.js`
  - `32_seed_admin_teste.js` â€” seed do admin + operador de teste
  - `37_pre_compress.js` â€” pre-compressÃ£o do index.html
- `tests/` â€” testes Jest
- `.github/workflows/test.yml` â€” CI/CD (lint + smoke + testes em Node 20/22)

## ðŸŽ¯ Scripts npm

| Script | DescriÃ§Ã£o |
|--------|-----------|
| start | Rodar em produÃ§Ã£o |
| dev | Desenvolvimento com .env.local |
| test | Rodar testes |
| test:coverage | Testes com cobertura |
| test:matricula | Apenas testes de matrÃ­cula |
| test:ci | Testes para CI (GitHub Actions) |
| lint | Verificar sintaxe dos arquivos JS |

## ðŸ§ª Testes

PrÃ©-requisito: servidor rodando em outro terminal.

- Terminal 1: `npm start`
- Terminal 2: `npm test`

**63 testes passando em 6 suites:**

- Auth (4)
- Endpoints protegidos (11)
- SeguranÃ§a (9)
- Smoke (22)
- RBAC (10)
- MatrÃ­cula automÃ¡tica (5)

**CI/CD:** GitHub Actions roda lint + smoke + testes completos em Node 20.x e 22.x. PostgreSQL efÃªmero com auto-migrate + seed.

## ðŸŒ Deploy

AutomÃ¡tico via GitHub push para `main`. O Render rebuilda em 2-3 min.

URL de produÃ§Ã£o: https://backend-frota-72ni.onrender.com

## ðŸ“Š Monitoramento

- UptimeRobot: monitora /health a cada 5 min
- Sentry: error tracking
- Logs do Render: stream em tempo real

## ðŸ”§ Troubleshooting

### Servidor nÃ£o sobe com [WATCHDOG]

Verifica se o Neon (https://console.neon.tech) estÃ¡ ativo.

### Deploy falha com Cannot find module

Regenera o lockfile:

- `rm -rf node_modules package-lock.json`
- `npm install`
- `git add package-lock.json`
- `git commit -m "chore: regenera lockfile"`
- `git push`

### Email nÃ£o envia com API key is invalid

Atualiza a env var `RESEND_API_KEY` no Render com a chave completa.

### CI/CD falha no GitHub Actions

Verifica os logs em https://github.com/drigobh/backend-frota/actions

Causas comuns:
- Colunas faltando no `auto_migrate.js`
- Seed do admin/operador nÃ£o rodou
- Race condition no boot do servidor

## ðŸ“ž Suporte

Issues: https://github.com/drigobh/backend-frota/issues