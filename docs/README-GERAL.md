# 🚛 Caderninho de Frota

Sistema integrado de gestão de frota com controle de veículos, motoristas, abastecimentos, quilometragem, financeiro e auditoria.

## 🌐 Ambientes

| Ambiente | URL | Status |
|----------|-----|--------|
| **Produção** | https://backend-frota-72ni.onrender.com | 🟢 Live |
| **Health Check** | https://backend-frota-72ni.onrender.com/health | 🟢 OK |
| **Swagger UI** | https://backend-frota-72ni.onrender.com/api/docs | 🟢 OK |

## 🔗 Serviços externos

| Serviço | Propósito | Painel |
|---------|-----------|--------|
| **Render** | Hospedagem | https://dashboard.render.com |
| **Neon** | PostgreSQL gerenciado | https://console.neon.tech |
| **UptimeRobot** | Monitoramento 24/7 | https://uptimerobot.com |
| **Sentry** | Error tracking | https://sentry.io |
| **Resend** | Email transacional | https://resend.com |
| **GitHub** | Repositório | https://github.com/drigobh/backend-frota |

## 📦 Stack

- **Backend:** Node.js 20+, Fastify 5
- **Banco:** PostgreSQL 16 (Neon)
- **Auth:** JWT + bcrypt + 2FA TOTP
- **Frontend:** HTML/JS vanilla (PWA)
- **Deploy:** Render
- **CI/CD:** GitHub Actions

## 📚 Documentação

- [Backend — README detalhado](./backend/README.md)
- [Swagger/OpenAPI](https://backend-frota-72ni.onrender.com/api/docs)

## 🚀 Quick start

```bash
git clone https://github.com/drigobh/backend-frota.git
cd backend-frota/backend
npm install
cp .env.example .env
# Editar .env com valores reais
npm start
# Acessar http://localhost:3000

text
