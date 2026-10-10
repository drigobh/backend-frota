const { Pool } = require("pg");
const { AsyncLocalStorage } = require("async_hooks");
require("dotenv").config();

// [FIX_21] Pool otimizado para Neon Free
// - max: 10 (Neon free aceita ~10 conexoes)
// - statement_timeout: 30s (query travada eh cancelada)
// - query_timeout: 30s (cliente cancela apos 30s)
// - idleTimeoutMillis: 30s (fecha conexao ociosa)
// - connectionTimeoutMillis: 10s (espera max 10s por conexao)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000
});

pool.on("error", (err) => {
  console.error("[DB] Erro inesperado no pool do PostgreSQL:", err.message);
});

// Contador pra debug
let _contadorQueriesSemContexto = 0;

// FASE_6_AUDITORIA - armazena { user, client } no contexto
const userStorage = new AsyncLocalStorage();

/**
 * [FIX_21] Executa uma query.
 * - Se NAO tem contexto de usuario → usa o pool direto (OK)
 * - Se tem client no contexto → reusa (dentro de transacao)
 * - Se tem user mas SEM client → usa o pool direto + warning
 *   (rota nao envolveu em comAuditoria, mas pelo menos nao esgota o pool)
 */
async function query(text, params) {
  const ctx = userStorage.getStore();

  // Caso 1: sem contexto → pool normal
  if (!ctx) {
    return pool.query(text, params);
  }

  // Caso 2: contexto com client (dentro de transacao) → reusa
  if (ctx.client) {
    return ctx.client.query(text, params);
  }

  // Caso 3 [FIX_21]: tem user mas sem client → usa pool direto + warning
  // (antes abria uma conexao nova + BEGIN/COMMIT, o que esgotava o pool)
  if (ctx.user && ctx.user.email) {
    _contadorQueriesSemContexto++;
    if (_contadorQueriesSemContexto <= 5) {
      console.warn(
        "[DB] query() chamada com user mas sem client (rota sem runAsUser). Usando pool direto. #" +
          _contadorQueriesSemContexto
      );
    }
    return pool.query(text, params);
  }

  // Fallback
  return pool.query(text, params);
}

/**
 * runAsUser - envolve o handler numa conexao dedicada, com transacao
 * e SET LOCAL app.user_email. Todas as db.query() chamadas dentro
 * usarao a MESMA conexao (evita esgotar o pool).
 * [FIX_21] Mantido exatamente como estava (funcionando).
 */
async function runAsUser(user, callback) {
  if (!user || !user.email) {
    return callback();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_email', $1, true)", [String(user.email)]);
    if (user.nome) await client.query("SELECT set_config('app.user_nome', $1, true)", [String(user.nome)]);
    if (user.id) await client.query("SELECT set_config('app.user_id', $1, true)", [String(user.id)]);
    if (user.ip) await client.query("SELECT set_config('app.user_ip', $1, true)", [String(user.ip)]); // FASE_17_IP_AUDITORIA

    const ctx = { user, client };
    const result = await userStorage.run(ctx, callback);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { query, pool, runAsUser, userStorage };
