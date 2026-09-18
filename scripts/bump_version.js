/**
 * ============================================================================
 * BUMP VERSION — Incrementa a versao do sistema
 * ============================================================================
 * Uso: node scripts/bump_version.js
 *
 * Como funciona:
 *   1. Le a versao atual da tabela `configuracoes` (chave: versao_sistema)
 *   2. Incrementa o numero apos o ultimo hifen (v1977-33 -> v1977-34)
 *   3. Atualiza o banco de dados
 *   4. Mostra o resultado
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');

// Carrega .env manualmente
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  });
}

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function bumpVersion() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  🔄 BUMP VERSION');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // 1) Ler versao atual
    const r = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = 'versao_sistema'"
    );

    if (r.rows.length === 0) {
      console.error('❌ Versao nao encontrada em configuracoes');
      console.log('   Inserindo valor inicial: v1977-33');
      await pool.query(
        "INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES ('versao_sistema', 'v1977-33', 'Versao atual do sistema', 'texto')"
      );
      process.exit(0);
    }

    const versaoAtual = r.rows[0].valor;
    console.log('  Versao atual:  ' + versaoAtual);

    // 2) Incrementar numero apos o ultimo hifen
    const match = versaoAtual.match(/^(.*?)(\d+)$/);
    if (!match) {
      console.error('❌ Formato de versao invalido: ' + versaoAtual);
      process.exit(1);
    }

    const prefixo = match[1];       // "v1977-"
    const numero = parseInt(match[2], 10);  // 33
    const novoNumero = numero + 1;  // 34
    const novaVersao = prefixo + novoNumero; // "v1977-34"

    console.log('  Nova versao:   ' + novaVersao);

    // 3) Atualizar no banco
    await pool.query(
      "UPDATE configuracoes SET valor = $1, updated_at = NOW() WHERE chave = 'versao_sistema'",
      [novaVersao]
    );

    console.log('\n  ✅ Versao atualizada com sucesso!');
    console.log('     ' + versaoAtual + ' → ' + novaVersao);
    console.log('');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

bumpVersion();
