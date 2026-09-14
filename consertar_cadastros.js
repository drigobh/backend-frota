const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🚀 Configurando Auto-Migrador Central de todas as tabelas no Neon...');

// ---------------------------------------------------------------------------
// 1. CRIAR src/auto_migrate.js COM TODAS AS TABELAS DO SISTEMA
// ---------------------------------------------------------------------------
const autoMigratePath = path.join(__dirname, 'src', 'auto_migrate.js');
const autoMigrateCode = `const { Pool } = require('pg');

let migrationRan = false;

async function autoMigrate(pool) {
  if (migrationRan) return;
  try {
    await pool.query(\`
      -- 1. Perfis e Usuários
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO perfis (nome, descricao) VALUES 
      ('Administrador', 'Acesso total ao sistema'),
      ('Operador', 'Lançamentos operacionais'),
      ('Financeiro', 'Gestão financeira e DRE')
      ON CONFLICT (nome) DO NOTHING;

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255),
        senha VARCHAR(255),
        perfil_id INT,
        perfil VARCHAR(50) DEFAULT 'Administrador',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Cavalos / Veículos
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL UNIQUE,
        modelo VARCHAR(100),
        ano VARCHAR(20),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Carretas
      CREATE TABLE IF NOT EXISTS carretas (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        tipo VARCHAR(100),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Motoristas
      CREATE TABLE IF NOT EXISTS motoristas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cnh VARCHAR(50),
        telefone VARCHAR(50),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Acoplamentos Mensais
      CREATE TABLE IF NOT EXISTS acoplamentos (
        id SERIAL PRIMARY KEY,
        mes_referencia DATE NOT NULL,
        veiculo_id INT,
        carreta_id INT,
        motorista_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Quilometragem Mensal
      CREATE TABLE IF NOT EXISTS km_mensal (
        id SERIAL PRIMARY KEY,
        mes_referencia DATE NOT NULL,
        placa VARCHAR(20) NOT NULL,
        inicial NUMERIC DEFAULT 0,
        final NUMERIC DEFAULT 0,
        litros NUMERIC DEFAULT 0,
        preco_litro NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. Abastecimentos Detalhados
      CREATE TABLE IF NOT EXISTS abastecimentos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        data_abastecimento DATE,
        posto VARCHAR(150),
        cidade VARCHAR(100),
        km_atual NUMERIC DEFAULT 0,
        litros NUMERIC DEFAULT 0,
        valor_litro NUMERIC DEFAULT 0,
        valor_total NUMERIC DEFAULT 0,
        nota_fiscal VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Financeiro / Lançamentos DRE
      CREATE TABLE IF NOT EXISTS financeiro (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20),
        data DATE,
        tipo VARCHAR(20),
        descricao TEXT,
        categoria VARCHAR(100),
        valor NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Manutenções
      CREATE TABLE IF NOT EXISTS manutencoes (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        tipo VARCHAR(50),
        descricao TEXT,
        fornecedor VARCHAR(150),
        valor NUMERIC DEFAULT 0,
        km NUMERIC DEFAULT 0,
        proxima_manutencao_km NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Documentos & Certidões
      CREATE TABLE IF NOT EXISTS documentos (
        id SERIAL PRIMARY KEY,
        entidade_tipo VARCHAR(50),
        entidade_nome VARCHAR(100),
        tipo_documento VARCHAR(100),
        data_emissao DATE,
        data_vencimento DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    migrationRan = true;
    console.log('✔ Todas as 10 tabelas operacionais verificadas/criadas no Neon!');
  } catch (err) {
    console.error('Erro na auto-migracao central:', err.message);
  }
}

module.exports = { autoMigrate };
`;
fs.writeFileSync(autoMigratePath, autoMigrateCode, 'utf8');
console.log('✔ src/auto_migrate.js criado com sucesso.');

// ---------------------------------------------------------------------------
// 2. CRIAR/GARANTIR src/routes/cadastros.js (Veículos, Carretas, Motoristas)
// ---------------------------------------------------------------------------
const cadastrosPath = path.join(__dirname, 'src', 'routes', 'cadastros.js');
const cadastrosCode = `const { Pool } = require('pg');
const { autoMigrate } = require('../auto_migrate');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  autoMigrate(pool).catch(() => {});

  // --- VEÍCULOS (CAVALOS) ---
  fastify.get('/api/veiculos', async (req, reply) => {
    try {
      await autoMigrate(pool);
      const res = await pool.query('SELECT * FROM veiculos ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/veiculos', async (req, reply) => {
    const { placa, modelo = '', ano = '', obs = '' } = req.body || {};
    if (!placa) return reply.code(400).send({ erro: 'Placa é obrigatória' });
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'INSERT INTO veiculos (placa, modelo, ano, obs) VALUES ($1, $2, $3, $4) ON CONFLICT (placa) DO UPDATE SET modelo = EXCLUDED.modelo RETURNING *',
        [placa.toUpperCase().trim(), modelo, ano, obs]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/veiculos/:id', async (req, reply) => {
    const { id } = req.params;
    const { placa, modelo, ano, obs } = req.body || {};
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'UPDATE veiculos SET placa = COALESCE($1, placa), modelo = COALESCE($2, modelo), ano = COALESCE($3, ano), obs = COALESCE($4, obs) WHERE id = $5 RETURNING *',
        [placa ? placa.toUpperCase().trim() : null, modelo, ano, obs, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/veiculos/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM veiculos WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Veículo removido' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // --- CARRETAS ---
  fastify.get('/api/carretas', async (req, reply) => {
    try {
      await autoMigrate(pool);
      const res = await pool.query('SELECT * FROM carretas ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/carretas', async (req, reply) => {
    const { codigo, tipo = '', obs = '' } = req.body || {};
    if (!codigo) return reply.code(400).send({ erro: 'Código da carreta é obrigatório' });
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'INSERT INTO carretas (codigo, tipo, obs) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO UPDATE SET tipo = EXCLUDED.tipo RETURNING *',
        [codigo.toUpperCase().trim(), tipo, obs]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/carretas/:id', async (req, reply) => {
    const { id } = req.params;
    const { codigo, tipo, obs } = req.body || {};
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'UPDATE carretas SET codigo = COALESCE($1, codigo), tipo = COALESCE($2, tipo), obs = COALESCE($3, obs) WHERE id = $4 RETURNING *',
        [codigo ? codigo.toUpperCase().trim() : null, tipo, obs, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/carretas/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM carretas WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Carreta removida' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // --- MOTORISTAS ---
  fastify.get('/api/motoristas', async (req, reply) => {
    try {
      await autoMigrate(pool);
      const res = await pool.query('SELECT * FROM motoristas ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/motoristas', async (req, reply) => {
    const { nome, cnh = '', telefone = '', obs = '' } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do motorista é obrigatório' });
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'INSERT INTO motoristas (nome, cnh, telefone, obs) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome.trim(), cnh, telefone, obs]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/motoristas/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, cnh, telefone, obs } = req.body || {};
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'UPDATE motoristas SET nome = COALESCE($1, nome), cnh = COALESCE($2, cnh), telefone = COALESCE($3, telefone), obs = COALESCE($4, obs) WHERE id = $5 RETURNING *',
        [nome ? nome.trim() : null, cnh, telefone, obs, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/motoristas/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM motoristas WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Motorista removido' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(cadastrosPath, cadastrosCode, 'utf8');
console.log('✔ src/routes/cadastros.js com rotas e auto-migração criado com sucesso.');

// ---------------------------------------------------------------------------
// 3. REGISTRAR EM src/server.js E ATIVAR A AUTO-MIGRAÇÃO GLOBAL
// ---------------------------------------------------------------------------
const serverPath = path.join(__dirname, 'src', 'server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');

if (!serverCode.includes("require('./auto_migrate')")) {
  serverCode = `const { autoMigrate } = require('./auto_migrate');\nconst { Pool: PoolMigrate } = require('pg');\nnew PoolMigrate({ connectionString: process.env.DATABASE_URL }).connect().then(c => { autoMigrate(c); c.release(); }).catch(()=>{});\n` + serverCode;
}

if (!serverCode.includes("require('./routes/cadastros')")) {
  serverCode = serverCode.replace(
    "fastify.register(require('./routes/auth'));",
    "fastify.register(require('./routes/auth'));\nfastify.register(require('./routes/cadastros'));"
  );
}
fs.writeFileSync(serverPath, serverCode, 'utf8');
console.log('✔ src/server.js atualizado com chamada global de auto-migração e rotas de cadastro.');

// ---------------------------------------------------------------------------
// 4. DEFESA NO FRONTEND (public/index.html) CONTRA RESPOSTAS NÃO-ARRAY
// ---------------------------------------------------------------------------
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const regexLoadCadastros = /async\s+function\s+loadCadastrosDaAPI\s*\(\)\s*\{[\s\S]*?renderCadastroMotoristas\(\);\s*\}\s*catch[\s\S]*?\}\s*\}/;

const loadCadastrosRobusto = `async function loadCadastrosDaAPI() {
      try {
        const resCavalos = await apiFetch('/veiculos');
        const cavalos = resCavalos.ok ? await resCavalos.json() : [];

        const resCarretas = await apiFetch('/carretas');
        const carretas = resCarretas.ok ? await resCarretas.json() : [];

        const resMotoristas = await apiFetch('/motoristas');
        const motoristas = resMotoristas.ok ? await resMotoristas.json() : [];

        state.cavalos = Array.isArray(cavalos) ? cavalos : [];
        state.carretas = Array.isArray(carretas) ? carretas : [];
        state.motoristas = Array.isArray(motoristas) ? motoristas : [];

        syncPlatesAcrossSystem();
        renderCadastroCavalos();
        renderCadastroCarretas();
        renderCadastroMotoristas();
      } catch (error) {
        console.error('Erro ao carregar Cadastros:', error);
      }
    }`;

if (regexLoadCadastros.test(html)) {
  html = html.replace(regexLoadCadastros, loadCadastrosRobusto);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✔ public/index.html blindado contra erros de parsing em cadastros.');
}

console.log('🏁 Auto-migração geral configurada!');
