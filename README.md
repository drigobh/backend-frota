# 🚛 Caderninho de Motorista — Sistema de Gestão de Frota

Sistema web completo para gestão de frotas, motoristas, carretas, abastecimentos, manutenções, documentos e financeiro.

---

## 📋 Funcionalidades

### Autenticação e Segurança
- Login com e-mail/senha
- 2FA opcional (Google Authenticator)
- Tokens JWT com expiração
- Auditoria de ações (quem fez o quê, quando)

### Cadastros
- **Veículos (Cavalos):** placa, modelo, ano, observações, status
- **Carretas:** código, tipo, observações, status
- **Motoristas:** nome, CNH, telefone, observações, status
- **Inativar/Reativar** registros sem apagar do banco
- **Badges de status** (Ativo/Inativo) nas tabelas
- **Filtro 'Mostrar inativos'** para ver registros inativos
- **Edição inline** com confirmação (✓ / ✕)

### Acoplamentos (Sistema de Transportadoras)
- Criar acoplamento com veículo + carreta + motorista
- **Validação de duplicata:** não permite acoplar item já em uso
- **Trocar campo individual:** registra desacoplamento do antigo + acoplamento do novo
- **Liberar Acoplamento:** desfaz o conjunto completo
- **Histórico completo** de movimentações:
  - Quem fez (usuário logado)
  - Quando (data/hora)
  - O que mudou (com ícones 🚛 🚚 👤)
  - Status (Acoplado/Desacoplado/Excluído)
- **Só registra 'Novo Conjunto'** quando veículo + carreta + motorista estão preenchidos

### Dashboard
- KPIs em tempo real (veículos, motoristas, acoplamentos, KM)
- Sparklines nos cards
- Indicadores de tendência (+X% vs mês anterior)
- Design system premium (glassmorphism, hover premium)

### Outras Funcionalidades
- **Abastecimentos** detalhados (litros, valor, posto, KM)
- **Manutenções** preventivas e corretivas
- **Documentos** de veículos e motoristas
- **Financeiro:** lançamentos, DRE por veículo, centros de custo
- **Ranking** de desempenho e **Metas** por veículo/motorista
- **Exportação** de relatórios em PDF e CSV
- **PWA** (Progressive Web App) com suporte offline

---

## 🚀 Tecnologias Utilizadas

| Camada | Tecnologia |
| :--- | :--- |
| **Backend** | Node.js 18+, Fastify, PostgreSQL (Neon), JWT |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Infraestrutura** | Render (hospedagem), GitHub Actions (CI/CD) |
| **Monitoramento** | Sentry |

---

## 🔧 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL (ou conta no Neon)
- Git

### Passos

1. Clone o repositório:
   git clone https://github.com/drigobh/backend-frota.git
   cd backend-frota

2. Instale as dependências:
   npm install

3. Configure o .env.local (veja .env.example)

4. Execute o servidor:
   npm run dev

5. Acesse http://localhost:3000

---

## 🌐 Deploy em Produção

**URL de produção:** https://backend-frota-72ni.onrender.com

O deploy é automático sempre que há push na branch main.

### Variáveis de Ambiente no Render
Configure no painel do Render (Environment):
- DATABASE_URL
- JWT_SECRET
- NODE_ENV=production

---

## 🔑 Credenciais de Acesso (Ambiente de Teste)

| Campo | Valor |
| :--- | :--- |
| **E-mail** | drigobh@gmail.com |
| **Senha** | (definida no banco de dados) |
| **2FA** | Opcional (pode ser ativado no primeiro login) |

> ⚠️ **Importante:** Altere a senha padrão após o primeiro acesso.

---

## 📁 Estrutura do Projeto

backend-frota/
├── public/                    # Frontend
│   ├── index.html             # Aplicação principal (SPA)
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   └── libs/                  # Bibliotecas externas
├── src/                       # Backend
│   ├── routes/                # Rotas da API
│   │   ├── auth.js
│   │   ├── cadastro.js        # Veículos, Carretas, Motoristas
│   │   ├── acoplamentos.js    # Acoplamentos + Histórico
│   │   ├── dashboard.js
│   │   └── ...
│   ├── plugins/               # Plugins Fastify
│   ├── database.js            # Conexão PostgreSQL
│   ├── server.js              # Servidor Fastify
│   └── auto_migrate.js        # Migrações automáticas
├── .env.example
├── package.json
└── README.md

---

## 🗄️ Banco de Dados

Tabelas principais: usuarios, perfis, permissoes, veiculos, carretas, motoristas, acoplamentos, acoplamentos_historico, km_mensal, abastecimentos, manutencoes, documentos, financeiro, lancamentos_financeiros, metas, auditoria.

---

## 🔒 Segurança

- NUNCA commitar o arquivo .env.local
- Usar JWT_SECRET forte (128 caracteres) em produção
- Alterar senha padrão após o primeiro acesso
- Ativar 2FA para maior segurança
- HTTPS obrigatório em produção
- Rate limit nas rotas de autenticação

---

## 📞 Suporte

Em caso de dúvidas ou problemas, abra uma issue no GitHub ou entre em contato com o administrador.

---

## 📄 Licença

Este projeto é de uso interno da Bravus Transportes.

---

**Última atualização:** 15/10/2026
