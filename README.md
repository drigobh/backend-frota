# 🚛 Caderninho de Motorista — Sistema de Gestão de Frota

Sistema web para gestão de frotas, motoristas, carretas, abastecimentos, manutenções, documentos e financeiro.

## 📋 Funcionalidades

- Autenticação com e-mail/senha e 2FA opcional
- Dashboard com KPIs, gráficos e indicadores de tendência
- Cadastros: Veículos, Carretas, Motoristas
- Inativar/Reativar registros (sem apagar do banco)
- Badges de status (Ativo/Inativo) nas tabelas
- Filtro "Mostrar inativos"
- Edição inline com confirmação
- Permissões baseadas em perfil
- Auditoria de ações
- Exportação de relatórios (PDF/CSV)
- PWA com Service Worker

## 🚀 Tecnologias

- Backend: Node.js, Fastify, PostgreSQL (Neon), JWT
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Infraestrutura: Render, GitHub Actions

## 🔧 Como Rodar Localmente

1. Clone o repositório:
   git clone https://github.com/drigobh/backend-frota.git
   cd backend-frota

2. Instale as dependências:
   npm install

3. Configure o .env.local (veja .env.example)

4. Execute:
   npm run dev

5. Acesse http://localhost:3000

## 🌐 Deploy em Produção

URL: https://backend-frota-72ni.onrender.com

O deploy é automático via push na branch main.

## 📁 Estrutura do Projeto

backend-frota/
├── public/         # Frontend
├── src/            # Backend
│   ├── routes/     # Rotas da API
│   ├── plugins/    # Plugins Fastify
│   └── server.js   # Servidor
├── .env.local      # Variáveis (NUNCA commitar)
└── README.md

## 🔒 Segurança

- NUNCA commitar o arquivo .env.local
- Trocar senhas padrão após o primeiro acesso
- Usar JWT_SECRET forte em produção

## 📄 Licença

Uso interno — Bravus Transportes.
