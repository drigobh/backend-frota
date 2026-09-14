/**
 * ============================================================================
 * CORRECAO 02 v2 - Unificar pools + bcrypt no auth.js e usuarios.js
 * ============================================================================
 * CORRIGE:
 *   - crypto.createHash is not a function (crypto removido)
 *   - pool.query remanescente no auth.js
 *   - migracao de SHA-256 para bcrypt com auto-migracao
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/02_bcrypt_senhas_v2.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/02_bcrypt_senhas_v2.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

// ===========================================================================
// AUTH.JS - substituicoes exatas
// ===========================================================================
const AUTH_SUBS = [
  {
    // 1. Topo: Pool + crypto -> db + bcrypt + crypto
    de: `const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}`,
    para: `const db = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function hashSenha(senha) {
  return bcrypt.hash(String(senha), 10);
}

async function verificarSenha(senha, hash) {
  try {
    return await bcrypt.compare(String(senha), hash);
  } catch (e) {
    return false;
  }
}`,
    obrigatorio: true,
  },
  {
    // 2. Remover new Pool dentro de routes()
    de: `async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
`,
    para: `async function routes(fastify, options) {
`,
    obrigatorio: true,
  },
  {
    // 3. hashInformado -> await hashSenha
    de: `    const hashInformado = hashSenha(senhaStr);`,
    para: `    const hashInformado = await hashSenha(senhaStr);`,
    obrigatorio: true,
  },
  {
    // 4. Bloco admin master - substituicao completa
    de: `        if (!user) {
          const createRes = await pool.query(\`
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ('Administrador', 'admin@frota.com', $1, 'Administrador', true)
            RETURNING *
          \`, [hashInformado]);
          user = createRes.rows[0];
        } else {
          await pool.query(
            'UPDATE usuarios SET senha_hash = $1, ativo = true, ultimo_login = CURRENT_TIMESTAMP WHERE id = $2',
            [hashInformado, user.id]
          );
        }`,
    para: `        if (!user) {
          const createRes = await db.query(\`
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ('Administrador', 'admin@frota.com', $1, 'Administrador', true)
            RETURNING *
          \`, [hashInformado]);
          user = createRes.rows[0];
        } else {
          await db.query(
            'UPDATE usuarios SET senha_hash = $1, ativo = true, ultimo_login = CURRENT_TIMESTAMP WHERE id = $2',
            [hashInformado, user.id]
          );
        }`,
    obrigatorio: true,
  },
  {
    // 5. Bloco de validacao de senha dos demais usuarios
    de: `      const senhaDb = user.senha_hash || user.senha;
      const senhaValida = (senhaDb === senhaStr || senhaDb === hashInformado);`,
    para: `      const senhaDb = user.senha_hash || user.senha;
      let senhaValida = false;

      if (senhaDb && senhaDb.startsWith('$2')) {
        senhaValida = await verificarSenha(senhaStr, senhaDb);
      } else {
        const hashLegado = crypto.createHash('sha256').update(senhaStr).digest('hex');
        if (senhaDb === senhaStr || senhaDb === hashLegado) {
          senhaValida = true;
          const novoHash = await hashSenha(senhaStr);
          await db.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [novoHash, user.id]);
          console.log('[MIGRACAO] Senha de ' + user.email + ' migrada para bcrypt');
        }
      }`,
    obrigatorio: true,
  },
];

// ===========================================================================
// USUARIOS.JS - so ajusta hashSenha para async
// ===========================================================================
const USUARIOS_SUBS = [
  {
    de: `function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}`,
    para: `async function hashSenha(senha) {
  return bcrypt.hash(String(senha), 10);
}`,
    obrigatorio: true,
  },
  {
    de: `    const senhaHash = hashSenha(senhaFinal);`,
    para: `    const senhaHash = await hashSenha(senhaFinal);`,
    obrigatorio: true,
  },
  {
    de: `    const senhaHash = hashSenha(nova_senha);`,
    para: `    const senhaHash = await hashSenha(nova_senha);`,
    obrigatorio: true,
  },
];

// ===========================================================================
// FUNCOES
// ===========================================================================

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '02v2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

function aplicarSubs(conteudo, subs) {
  const problemas = [];
  let novo = conteudo;

  for (const sub of subs) {
    const ocorrencias = novo.split(sub.de).length - 1;

    if (ocorrencias === 0) {
      if (sub.obrigatorio) {
        problemas.push('NAO ENCONTRADO: ' + sub.de.substring(0, 80).replace(/\n/g, '\\n'));
      }
      continue;
    }

    if (ocorrencias > 1) {
      problemas.push('DUPLICADO (' + ocorrencias + 'x): ' + sub.de.substring(0, 80).replace(/\n/g, '\\n'));
      continue;
    }

    novo = novo.replace(sub.de, sub.para);
  }

  // Substituicoes globais de pool.query -> db.query (sobra do script 01)
  novo = novo.replace(/\bpool\.query\(/g, 'db.query(');

  return { conteudo: novo, problemas };
}

function processar(relPath, subs) {
  const absPath = path.resolve(ROOT, relPath);
  if (!fs.existsSync(absPath)) return { status: 'SKIP' };

  const original = fs.readFileSync(absPath, 'utf8');
  const { conteudo, problemas } = aplicarSubs(original, subs);

  if (problemas.length > 0) {
    return { status: 'ERRO', problemas };
  }

  if (conteudo === original) {
    return { status: 'SEM_MUDANCA' };
  }

  if (!APLICAR) {
    return { status: 'DRY_RUN', preview: conteudo.substring(0, 500) };
  }

  const backupPath = garantirBackup(relPath);
  fs.writeFileSync(absPath, conteudo, 'utf8');
  return { status: 'APLICADO', backupPath };
}

// ===========================================================================
// MAIN
// ===========================================================================

console.log('\n=============================================');
console.log('  CORRECAO 02 v2 - bcrypt + db no auth');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const ARQUIVOS = [
  { path: 'src/routes/auth.js', subs: AUTH_SUBS },
  { path: 'src/routes/usuarios.js', subs: USUARIOS_SUBS },
];

let ok = 0, erro = 0, semMudanca = 0;

for (const cfg of ARQUIVOS) {
  const r = processar(cfg.path, cfg.subs);
  console.log('>> ' + cfg.path);

  if (r.status === 'APLICADO') {
    console.log('   [OK] Aplicado. Backup: ' + r.backupPath);
    ok++;
  } else if (r.status === 'DRY_RUN') {
    console.log('   [DRY] Mudancas seriam aplicadas.');
    ok++;
  } else if (r.status === 'SEM_MUDANCA') {
    console.log('   [--] Sem mudancas.');
    semMudanca++;
  } else if (r.status === 'SKIP') {
    console.log('   [SKIP] Nao encontrado.');
  } else if (r.status === 'ERRO') {
    console.log('   [ERRO] NAO APLICADO:');
    r.problemas.forEach(p => console.log('          - ' + p));
    erro++;
  }
  console.log('');
}

console.log('=============================================');
console.log('  OK/DRY: ' + ok + ' | Sem mudanca: ' + semMudanca + ' | Erros: ' + erro);
console.log('=============================================');

if (!APLICAR) {
  console.log('\n⚠️  DRY-RUN: nada foi alterado.');
  console.log('   Rode com --apply para aplicar.\n');
} else {
  console.log('\n✅ Aplicado. Teste de sintaxe:');
  console.log("   node -e \"require('./src/routes/auth.js'); console.log('auth OK')\"");
  console.log("   node -e \"require('./src/routes/usuarios.js'); console.log('usuarios OK')\"");
  console.log('\n   Depois commit + push.\n');
}