const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL', err);
  process.exit(-1);
});

// FASE_6_AUDITORIA - Armazena o usuario logado no contexto
const userStorage = new AsyncLocalStorage();

async function query(text, params) {
  const user = userStorage.getStore();
  if (!user || !user.email) {
    return pool.query(text, params);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FASE_6_FIX_SET_CONFIG - SET LOCAL nao aceita placeholders, usar set_config
    await client.query("SELECT set_config('app.user_email', $1, true)", [String(user.email)]);
    if (user.nome) await client.query("SELECT set_config('app.user_nome', $1, true)", [String(user.nome)]);
    if (user.id)   await client.query("SELECT set_config('app.user_id', $1, true)",   [String(user.id)]);
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

function runAsUser(user, callback) {
  return userStorage.run(user || {}, callback);
}

module.exports = { query, pool, runAsUser, userStorage };
