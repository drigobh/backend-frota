/**
 * SYNC VERSAO — Lê a versão do banco e atualiza o <meta> do HTML
 * Uso: node scripts/sync_versao.js
 */

const path = require("path");
const fs = require("fs");

// Carrega .env
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
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

const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const HTML = path.resolve(__dirname, "..", "public", "index.html");

async function syncVersao() {
  console.log("\n═══════════════════════════════════════");
  console.log("  🔄 SYNC VERSAO (banco → HTML <meta>)");
  console.log("═══════════════════════════════════════\n");

  try {
    const r = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'versao_sistema'");
    if (r.rows.length === 0) {
      console.error("❌ Versão não encontrada no banco.");
      process.exit(1);
    }

    const versao = r.rows[0].valor;
    console.log(`  Versão no banco: ${versao}`);

    if (!fs.existsSync(HTML)) {
      console.error("❌ HTML não encontrado: " + HTML);
      process.exit(1);
    }

    let html = fs.readFileSync(HTML, "utf8");
    const metaRegex = /(<meta\s+name=["']versao-sistema["']\s+content=["'])([^"']+)(["'])/i;

    if (metaRegex.test(html)) {
      const versaoAntiga = html.match(metaRegex)[2];
      html = html.replace(metaRegex, `$1${versao}$3`);
      fs.writeFileSync(HTML, html, "utf8");
      console.log(`  ✅ HTML atualizado: ${versaoAntiga} → ${versao}`);
    } else {
      console.error("❌ <meta> não encontrado no HTML. Rode primeiro:");
      console.error("   node correcao/FASE_4_VERSAO/07_fix_versao_meta.js");
      process.exit(1);
    }

    console.log("\n  🎉 Sincronizado.\n");
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

syncVersao();
