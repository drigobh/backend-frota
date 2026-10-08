#!/usr/bin/env node
/**
 * FIX_32: Garante que o admin de teste exista, esteja ATIVO e NÃO deletado
 */

const path = require('path');
const bcrypt = require('bcrypt');
const db = require(path.join(__dirname, '..', 'src', 'database'));

const EMAIL = 'admin-teste@frota.com';
const SENHA = 'TesteRBAC@2026';
const NOME = 'Admin Teste RBAC';
const PERFIL_ID = '1';
const PERFIL = 'Administrador';

(async () => {
  console.log('🔧 FIX_32: Garantindo admin de teste...\n');

  try {
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(SENHA, saltRounds);
    console.log(`🔐 Senha hasheada (bcrypt, ${saltRounds} rounds)`);

    const existing = await db.query(
      'SELECT id, deleted_at FROM usuarios WHERE email = $1',
      [EMAIL]
    );

    if (existing.rows.length === 0) {
      console.log('📝 Admin não encontrado — criando...');
      const insert = await db.query(
        `INSERT INTO usuarios
          (id, nome, email, senha_hash, perfil_id, perfil, ativo,
           totp_ativo, totp_obrigatorio, permite_desativar_2fa,
           recovery_codes, created_at, updated_at)
         VALUES
          (gen_random_uuid(), $1, $2, $3, $4, $5, true,
           false, false, false,
           '[]'::jsonb, NOW(), NOW())
         RETURNING id, email, ativo, deleted_at`,
        [NOME, EMAIL, senhaHash, PERFIL_ID, PERFIL]
      );
      console.log('✅ Admin criado:', insert.rows[0]);
    } else {
      const wasDeleted = existing.rows[0].deleted_at !== null;
      console.log(
        wasDeleted
          ? `♻️  Admin SOFT-DELETED (${existing.rows[0].deleted_at}) — restaurando...`
          : '♻️  Admin encontrado — atualizando...'
      );

      const update = await db.query(
        `UPDATE usuarios SET
           senha_hash = $1,
           ativo = true,
           perfil_id = $2,
           perfil = $3,
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
         WHERE email = $4
         RETURNING id, email, ativo, deleted_at, totp_ativo`,
        [senhaHash, PERFIL_ID, PERFIL, EMAIL]
      );
      console.log('✅ Admin atualizado:', update.rows[0]);
    }

    const check = await db.query(
      `SELECT id, email, ativo, deleted_at, totp_ativo, perfil
       FROM usuarios WHERE email = $1`,
      [EMAIL]
    );
    console.log('\n📋 Estado final:');
    console.log(JSON.stringify(check.rows[0], null, 2));

    console.log('\n✅ FIX_32 concluído!');
    console.log('   Agora rode: npm run test:matricula\n');
    process.exit(0);
  } catch (e) {
    console.error('❌ ERRO:', e.message);
    console.error(e);
    process.exit(1);
  }
})();