#!/usr/bin/env node
/**
 * FIX_32 + FIX_42: Seed do admin E operador de teste
 */

const bcrypt = require("bcrypt");
const db = require("../src/database");

const ADMIN_EMAIL = "admin-teste@frota.com";
const ADMIN_SENHA = "TesteRBAC@2026";
const ADMIN_NOME = "Admin Teste RBAC";
const ADMIN_PERFIL_ID = "1";
const ADMIN_PERFIL = "Administrador";

const OPERADOR_EMAIL = "teste@tes.com";
const OPERADOR_SENHA = "Frota@1977";
const OPERADOR_NOME = "Operador Teste";
const OPERADOR_PERFIL_ID = "2";
const OPERADOR_PERFIL = "Operador";

async function upsertUsuario({ email, senha, nome, perfilId, perfil }) {
  const senhaHash = await bcrypt.hash(senha, 10);
  const existing = await db.query("SELECT id FROM usuarios WHERE email = $1", [email]);

  if (existing.rows.length === 0) {
    const insert = await db.query(
      `INSERT INTO usuarios
        (nome, email, senha_hash, perfil_id, perfil, ativo,
         totp_ativo, totp_obrigatorio, permite_desativar_2fa,
         recovery_codes, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, true,
         false, false, false,
         '[]'::jsonb, NOW(), NOW())
       RETURNING id, email, ativo, deleted_at, totp_ativo`,
      [nome, email, senhaHash, perfilId, perfil]
    );
    console.log(`✅ ${perfil} criado:`, insert.rows[0]);
  } else {
    const update = await db.query(
      `UPDATE usuarios SET
         senha_hash = $1,
         nome = $2,
         perfil_id = $3,
         perfil = $4,
         ativo = true,
         totp_ativo = false,
         totp_secret = NULL,
         totp_ativo_em = NULL,
         totp_obrigatorio = false,
         permite_desativar_2fa = false,
         recovery_codes = '[]'::jsonb,
         recovery_codes_at = NULL,
         deleted_at = NULL,
         deleted_by = NULL,
         updated_at = NOW()
       WHERE email = $5
       RETURNING id, email, ativo, deleted_at, totp_ativo`,
      [senhaHash, nome, perfilId, perfil, email]
    );
    console.log(`✅ ${perfil} atualizado:`, update.rows[0]);
  }
}

(async () => {
  console.log("🔧 FIX_32+FIX_42: Garantindo usuarios de teste...\n");

  try {
    await upsertUsuario({
      email: ADMIN_EMAIL,
      senha: ADMIN_SENHA,
      nome: ADMIN_NOME,
      perfilId: ADMIN_PERFIL_ID,
      perfil: ADMIN_PERFIL
    });

    console.log("");

    await upsertUsuario({
      email: OPERADOR_EMAIL,
      senha: OPERADOR_SENHA,
      nome: OPERADOR_NOME,
      perfilId: OPERADOR_PERFIL_ID,
      perfil: OPERADOR_PERFIL
    });

    console.log("\n✅ Seed concluído!");
    process.exit(0);
  } catch (e) {
    console.error("❌ ERRO:", e.message);
    process.exit(1);
  }
})();
