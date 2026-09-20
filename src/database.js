const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL', err);
});

// FASE_6_AUDITORIA - armazena { user, client } no contexto
const userStorage = new AsyncLocalStorage();

async function query(text, params) {
  const ctx = userStorage.getStore();

  // Se NAO temos contexto de usuario → caminho normal (retrocompativel)
  if (!ctx) {
    return pool.query(text, params);
  }

  // Se JA temos um client (transacao aberta) → usa ele
  if (ctx.client) {
    return ctx.client.query(text, params);
  }

  // Se temos usuario mas nenhum client aberto → abre conexao propria
  if (ctx.user && ctx.user.email) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.user_email', $1, true)", [String(ctx.user.email)]);
      if (ctx.user.nome) await client.query("SELECT set_config('app.user_nome', $1, true)", [String(ctx.user.nome)]);
      if (ctx.user.id)   await client.query("SELECT set_config('app.user_id', $1, true)",   [String(ctx.user.id)]);
      const result = await client.query(text, params);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  }

  // Sem usuario → normal
  return pool.query(text, params);
}

/**
 * runAsUser - envolve o handler numa conexao dedicada, com transacao
 * e SET LOCAL app.user_email. Todas as db.query() chamadas dentro
 * usarao a MESMA conexao (evita esgotar o pool).
 */
async function runAsUser(user, callback) {
  if (!user || !user.email) {
    return callback();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_email', $1, true)", [String(user.email)]);
    if (user.nome) await client.query("SELECT set_config('app.user_nome', $1, true)", [String(user.nome)]);
    if (user.id)   await client.query("SELECT set_config('app.user_id', $1, true)",   [String(user.id)]);

    const ctx = { user, client };
    const result = await userStorage.run(ctx, callback);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { query, pool, runAsUser, userStorage };
