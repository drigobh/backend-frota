/**
 * ============================================================================
 * CORRECAO 01 v2 - Unificar pools de conexao (SEGURO, CIRURGICO)
 * ============================================================================
 * COMO RODAR (dry-run, sem alterar nada):
 *   node correcao/FASE_1_CRITICA/01_unificar_pools_v2.js
 *
 * COMO RODAR (aplicando de verdade):
 *   node correcao/FASE_1_CRITICA/01_unificar_pools_v2.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// CONFIGURACAO POR ARQUIVO (mais seguro que regex generico)
// ---------------------------------------------------------------------------
const ARQUIVOS = [
  {
    path: 'src/routes/auth.js',
    // Trocar esse bloco exato no topo
    substituicoes: [
      {
        de: `const { Pool } = require('pg');
const crypto = require('crypto');`,
        para: `const db = require('../database');
const bcrypt = require('bcrypt');`,
        obrigatorio: true,
      },
      {
        de: `async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
`,
        para: `async function routes(fastify, options) {
`,
        obrigatorio: true,
      },
    ],
    // Substituicoes globais (todas as ocorrencias)
    globais: [
      { de: /\bpool\.query\(/g, para: 'db.query(' },
    ],
  },
  {
    path: 'src/routes/usuarios.js',
    substituicoes: [
      {
        de: `const { Pool } = require('pg');
const crypto = require('crypto');`,
        para: `const db = require('../database');
const bcrypt = require('bcrypt');`,
        obrigatorio: true,
      },
      {
        de: `async function ensureUsuariosETabelas(pool) {`,
        para: `async function ensureUsuariosETabelas() {`,
        obrigatorio: true,
      },
      {
        de: `    await pool.query(\``,
        para: `    await db.query(\``,
        obrigatorio: true,
      },
      {
        de: `async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensureUsuariosETabelas(pool).catch(() => {});`,
        para: `async function routes(fastify, options) {
  ensureUsuariosETabelas().catch(() => {});`,
        obrigatorio: true,
      },
    ],
    globais: [
      { de: /\bpool\.query\(/g, para: 'db.query(' },
      { de: /ensureUsuariosETabelas\(pool\)/g, para: 'ensureUsuariosETabelas()' },
    ],
  },
  {
    path: 'src/routes/perfis.js',
    substituicoes: [
      {
        de: `const { Pool } = require('pg');`,
        para: `const db = require('../database');`,
        obrigatorio: true,
      },
      {
        de: `async function ensurePerfis(pool) {`,
        para: `async function ensurePerfis() {`,
        obrigatorio: true,
      },
      {
        de: `    await pool.query(\``,
        para: `    await db.query(\``,
        obrigatorio: true,
      },
      {
        de: `  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensurePerfis(pool).catch(() => {});`,
        para: `  ensurePerfis().catch(() => {});`,
        obrigatorio: true,
      },
    ],
    globais: [
      { de: /\bpool\.query\(/g, para: 'db.query(' },
      { de: /ensurePerfis\(pool\)/g, para: 'ensurePerfis()' },
    ],
  },
  {
    path: 'src/routes/auditoria.js',
    substituicoes: [
      {
        de: `const { Pool } = require('pg');`,
        para: `const db = require('../database');`,
        obrigatorio: true,
      },
      {
        de: `async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
`,
        para: `async function routes(fastify, options) {
`,
        obrigatorio: true,
      },
    ],
    globais: [
      { de: /\bpool\.query\(/g, para: 'db.query(' },
    ],
  },
  {
    path: 'src/routes/fechamento.js',
    substituicoes: [
      {
        de: `const { Pool } = require('pg');`,
        para: `const db = require('../database');`,
        obrigatorio: true,
      },
      {
        de: `async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
`,
        para: `async function routes(fastify, options) {
`,
        obrigatorio: true,
      },
    ],
    globais: [
      { de: /\bpool\.query\(/g, para: 'db.query(' },
    ],
  },
];

// ---------------------------------------------------------------------------
// UTILITARIOS
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

function processarArquivo(cfg) {
  const absPath = path.resolve(ROOT, cfg.path);

  if (!fs.existsSync(absPath)) {
    return { status: 'SKIP', msg: 'Arquivo nao encontrado' };
  }

  let conteudo = fs.readFileSync(absPath, 'utf8');
  const original = conteudo;
  const problemas = [];

  // 1. Aplicar substituicoes exatas
  for (const sub of cfg.substituicoes) {
    const ocorrencias = conteudo.split(sub.de).length - 1;

    if (ocorrencias === 0) {
      if (sub.obrigatorio) {
        problemas.push('NAO ENCONTRADO: "' + sub.de.substring(0, 60).replace(/\n/g, '\\n') + '..."');
      }
      continue;
    }

    if (ocorrencias > 1) {
      problemas.push('DUPLICADO (' + ocorrencias + 'x): "' + sub.de.substring(0, 60).replace(/\n/g, '\\n') + '..."');
      continue;
    }

    conteudo = conteudo.replace(sub.de, sub.para);
  }

  // Se houver problemas, NAO altera o arquivo
  if (problemas.length > 0) {
    return { status: 'ERRO', problemas, conteudoOriginal: original };
  }

  // 2. Aplicar substituicoes globais (regex)
  for (const g of cfg.globais) {
    conteudo = conteudo.replace(g.de, g.para);
  }

  if (conteudo === original) {
    return { status: 'SEM_MUDANCA' };
  }

  // 3. Se for dry-run, so mostra
  if (!APLICAR) {
    return { status: 'DRY_RUN', preview: conteudo.substring(0, 800) };
  }

  // 4. Se for --apply, faz backup e escreve
  const backupPath = garantirBackup(cfg.path);
  fs.writeFileSync(absPath, conteudo, 'utf8');

  return { status: 'APLICADO', backupPath };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

console.log('\n=============================================');
console.log('  CORRECAO 01 v2 - Unificar pools');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

let aplicados = 0;
let erros = 0;
let semMudanca = 0;

for (const cfg of ARQUIVOS) {
  const resultado = processarArquivo(cfg);

  console.log('>> ' + cfg.path);

  if (resultado.status === 'APLICADO') {
    console.log('   [OK] Aplicado. Backup: ' + resultado.backupPath);
    aplicados++;
  } else if (resultado.status === 'DRY_RUN') {
    console.log('   [DRY] Mudancas seriam aplicadas. Preview:');
    console.log('   ' + resultado.preview.split('\n').slice(0, 5).join('\n   '));
    console.log('   ...');
    aplicados++;
  } else if (resultado.status === 'SEM_MUDANCA') {
    console.log('   [--] Sem mudancas necessarias');
    semMudanca++;
  } else if (resultado.status === 'SKIP') {
    console.log('   [SKIP] ' + resultado.msg);
  } else if (resultado.status === 'ERRO') {
    console.log('   [ERRO] NAO APLICADO. Problemas:');
    resultado.problemas.forEach(p => console.log('          - ' + p));
    erros++;
  }

  console.log('');
}

console.log('=============================================');
console.log('  Aplicados/DRY: ' + aplicados);
console.log('  Sem mudanca:   ' + semMudanca);
console.log('  Erros:         ' + erros);
console.log('=============================================');

if (!APLICAR) {
  console.log('\n⚠️  MODO DRY-RUN: nada foi alterado.');
  console.log('   Para aplicar de verdade, rode:');
  console.log('   node correcao/FASE_1_CRITICA/01_unificar_pools_v2.js --apply\n');
} else {
  console.log('\n✅ Correcoes aplicadas!');
  console.log('   Rode os testes de sintaxe:');
  console.log('   node -e "require(\'./src/routes/auth.js\'); console.log(\'auth OK\')"');
  console.log('   node -e "require(\'./src/routes/usuarios.js\'); console.log(\'usuarios OK\')"');
  console.log('   node -e "require(\'./src/routes/perfis.js\'); console.log(\'perfis OK\')"');
  console.log('   node -e "require(\'./src/routes/auditoria.js\'); console.log(\'auditoria OK\')"');
  console.log('   node -e "require(\'./src/routes/fechamento.js\'); console.log(\'fechamento OK\')"');
  console.log('\n   Se algum quebrar, restaure do backup:');
  console.log('   Copy-Item correcao\\_backup\\<nome> src\\routes\\<nome> -Force\n');
}