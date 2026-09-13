const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🚀 Iniciando implementação: Backend de Administração + Sincronização Automática...');

// ---------------------------------------------------------------------------
// 1. CRIAR src/routes/perfis.js
// ---------------------------------------------------------------------------
const perfisRouteCode = `const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Listar todos os perfis
  fastify.get('/api/perfis', async (req, reply) => {
    try {
      const res = await pool.query('SELECT * FROM perfis ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Criar perfil
  fastify.post('/api/perfis', async (req, reply) => {
    const { nome, descricao } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do perfil é obrigatório.' });
    try {
      const res = await pool.query(
        'INSERT INTO perfis (nome, descricao) VALUES ($1, $2) RETURNING *',
        [nome, descricao || '']
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Atualizar perfil
  fastify.put('/api/perfis/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body || {};
    try {
      const res = await pool.query(
        'UPDATE perfis SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), ativo = COALESCE($3, ativo) WHERE id = $4 RETURNING *',
        [nome, descricao, ativo, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(path.join(__dirname, 'src', 'routes', 'perfis.js'), perfisRouteCode, 'utf8');
console.log('✔ src/routes/perfis.js criado com sucesso.');

// ---------------------------------------------------------------------------
// 2. CRIAR src/routes/usuarios.js
// ---------------------------------------------------------------------------
const usuariosRouteCode = `const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Listar usuários
  fastify.get('/api/usuarios', async (req, reply) => {
    try {
      const res = await pool.query(\`
        SELECT u.id, u.nome, u.email, u.perfil_id, COALESCE(p.nome, u.perfil) as perfil, u.ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        ORDER BY u.id ASC
      \`);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Detalhes do usuário
  fastify.get('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      const res = await pool.query(\`
        SELECT u.id, u.nome, u.email, u.perfil_id, COALESCE(p.nome, u.perfil) as perfil, u.ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        WHERE u.id = $1
      \`, [id]);
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Criar novo usuário
  fastify.post('/api/usuarios', async (req, reply) => {
    const { nome, email, senha, perfil_id, ativo = true } = req.body || {};
    if (!nome || !email) return reply.code(400).send({ erro: 'Nome e e-mail são obrigatórios.' });
    
    const senhaFinal = senha || '123456';
    const senhaHash = hashSenha(senhaFinal);

    try {
      let perfilNome = 'Operador';
      if (perfil_id) {
        const pRes = await pool.query('SELECT nome FROM perfis WHERE id = $1', [perfil_id]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await pool.query(\`
        INSERT INTO usuarios (nome, email, senha_hash, perfil_id, perfil, ativo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, perfil_id, perfil, ativo, ultimo_login, created_at
      \`, [nome, email.toLowerCase().trim(), senhaHash, perfil_id || null, perfilNome, ativo]);

      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(400).send({ erro: 'Já existe um usuário com este e-mail.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Atualizar usuário
  fastify.put('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, email, perfil_id, ativo } = req.body || {};
    try {
      let perfilNome = null;
      if (perfil_id) {
        const pRes = await pool.query('SELECT nome FROM perfis WHERE id = $1', [perfil_id]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await pool.query(\`
        UPDATE usuarios
        SET nome = COALESCE($1, nome),
            email = COALESCE($2, email),
            perfil_id = COALESCE($3, perfil_id),
            perfil = COALESCE($4, perfil),
            ativo = COALESCE($5, ativo)
        WHERE id = $6
        RETURNING id, nome, email, perfil_id, perfil, ativo, ultimo_login, created_at
      \`, [nome, email ? email.toLowerCase().trim() : null, perfil_id || null, perfilNome, ativo, id]);

      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(400).send({ erro: 'Este e-mail já está em uso por outro usuário.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Resetar senha
  fastify.put('/api/usuarios/:id/resetar-senha', async (req, reply) => {
    const { id } = req.params;
    const { nova_senha } = req.body || {};
    if (!nova_senha || nova_senha.length < 6) {
      return reply.code(400).send({ erro: 'A senha deve conter no mínimo 6 caracteres.' });
    }
    const senhaHash = hashSenha(nova_senha);
    try {
      await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, id]);
      return reply.send({ mensagem: 'Senha resetada com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Desativar usuário
  fastify.delete('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Usuário desativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(path.join(__dirname, 'src', 'routes', 'usuarios.js'), usuariosRouteCode, 'utf8');
console.log('✔ src/routes/usuarios.js criado com sucesso.');

// ---------------------------------------------------------------------------
// 3. ATUALIZAR src/routes/auth.js (Login compatível com SHA-256 e texto)
// ---------------------------------------------------------------------------
const authPath = path.join(__dirname, 'src', 'routes', 'auth.js');
const authRouteCode = `const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.post('/api/login', async (req, reply) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return reply.code(400).send({ erro: 'E-mail e senha são obrigatórios.' });
    }

    try {
      const res = await pool.query(
        'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) AND ativo = true',
        [email.trim()]
      );

      if (res.rows.length === 0) {
        return reply.code(401).send({ erro: 'Credenciais inválidas ou usuário inativo.' });
      }

      const user = res.rows[0];
      const hashInformado = hashSenha(senha);

      // Compatível com senha pura '123' ou hash sha256
      const senhaValida = (user.senha_hash === senha || user.senha_hash === hashInformado);

      if (!senhaValida) {
        return reply.code(401).send({ erro: 'Senha incorreta.' });
      }

      // Atualiza último login
      await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const token = crypto.randomBytes(32).toString('hex');

      return reply.send({
        token,
        usuario: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil || 'Administrador'
        }
      });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(authPath, authRouteCode, 'utf8');
console.log('✔ src/routes/auth.js atualizado com compatibilidade total de autenticação.');

// ---------------------------------------------------------------------------
// 4. ATUALIZAR src/server.js (Garantir registro das rotas)
// ---------------------------------------------------------------------------
const serverPath = path.join(__dirname, 'src', 'server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');

if (!serverCode.includes("require('./routes/usuarios')")) {
  serverCode = serverCode.replace(
    "fastify.register(require('./routes/auth'));",
    "fastify.register(require('./routes/auth'));\nfastify.register(require('./routes/usuarios'));\nfastify.register(require('./routes/perfis'));"
  );
  fs.writeFileSync(serverPath, serverCode, 'utf8');
  console.log('✔ src/server.js atualizado com registro das rotas /usuarios e /perfis.');
}

// ---------------------------------------------------------------------------
// 5. ATUALIZAR public/index.html (SINCRONIZAÇÃO AUTOMÁTICA ABASTECIMENTO ➔ DRE ➔ KM)
// ---------------------------------------------------------------------------
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Atualiza getFuelExpenseForPlate para priorizar a soma real dos abastecimentos
const regexFuel = /function\s+getFuelExpenseForPlate\s*\([\s\S]*?return\s+\(Number\(data\.litros\)\s*\|\|\s*0\)\s*\*\s*\(Number\(data\.precoLitro\)\s*\|\|\s*0\);\s*\}/;

const novoFuelExpense = `function getFuelExpenseForPlate(placa, month) {
      if (month === state.currentMonth && state.abastecimentos && state.abastecimentos.length > 0) {
        const abasts = state.abastecimentos.filter(a => a.placa === placa);
        if (abasts.length > 0) {
          return abasts.reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);
        }
      }
      const data = state.kmData[month]?.[placa];
      if (!data) return 0;
      return (Number(data.litros) || 0) * (Number(data.precoLitro) || 0);
    }`;

if (regexFuel.test(html)) {
  html = html.replace(regexFuel, novoFuelExpense);
  console.log('✔ getFuelExpenseForPlate atualizado para capturar o valor exato dos abastecimentos.');
}

// Injetar função de sincronização automática
const syncFunction = `
    // =========================================================================
    // SINCRONIZAÇÃO AUTOMÁTICA: ABASTECIMENTOS DETALHADOS ➔ KM MENSAL ➔ DRE
    // =========================================================================
    function sincronizarAbastecimentosAutomaticos() {
      if (!state.abastecimentos || !state.kmData[state.currentMonth]) return;

      const porPlaca = {};
      state.abastecimentos.forEach(a => {
        if (!a.placa) return;
        const p = a.placa.toUpperCase();
        if (!porPlaca[p]) porPlaca[p] = { litros: 0, total: 0 };
        porPlaca[p].litros += Number(a.litros) || 0;
        porPlaca[p].total += Number(a.valor_total) || 0;
      });

      let mudou = false;
      state.cavalos.forEach(c => {
        const p = c.placa;
        const info = porPlaca[p];
        if (info && info.litros > 0) {
          if (!state.kmData[state.currentMonth][p]) {
            state.kmData[state.currentMonth][p] = { inicial: 0, final: 0, litros: 0, precoLitro: 0 };
          }
          const item = state.kmData[state.currentMonth][p];
          const precoMedio = info.total / info.litros;

          if (item.litros !== info.litros || Math.abs((item.precoLitro || 0) - precoMedio) > 0.009) {
            item.litros = info.litros;
            item.precoLitro = precoMedio;
            mudou = true;
            // Salva no backend silenciosamente
            saveKm(p, info.litros, 'litros');
            saveKm(p, precoMedio, 'precoLitro');
          }
        }
      });

      if (mudou) {
        renderKm();
        renderDre();
        renderResumo();
        renderGraficos();
        renderAlertasDashboard();
      }
    }
`;

if (!html.includes('function sincronizarAbastecimentosAutomaticos')) {
  html = html.replace('function renderDre() {', syncFunction + '\n    function renderDre() {');
  console.log('✔ Função de sincronização automática injetada.');
}

// Conectar chamada de sincronização após carregar abastecimentos
if (!html.includes('sincronizarAbastecimentosAutomaticos();')) {
  html = html.replace('renderAbastecimentos();', 'renderAbastecimentos(); sincronizarAbastecimentosAutomaticos();');
  console.log('✔ Sincronização conectada ao carregamento de abastecimentos.');
}

// ---------------------------------------------------------------------------
// 6. VALIDAÇÃO DE SINTAXE JAVASCRIPT
// ---------------------------------------------------------------------------
let erros = 0;
const validador = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m;
while ((m = validador.exec(html)) !== null) {
  try {
    new vm.Script(m[1]);
  } catch (e) {
    erros++;
    console.error('❌ Erro no script HTML:', e.message);
  }
}

if (erros === 0) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('🎉 public/index.html sincronizado com 0 erros de sintaxe!');
} else {
  console.error('⚠️ Não foi possível salvar o index.html devido a erros de sintaxe.');
}

console.log('🏁 Processo finalizado com sucesso!');
