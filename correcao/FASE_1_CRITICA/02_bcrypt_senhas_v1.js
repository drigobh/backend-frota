/**
 * ============================================================================
 * CORRECAO 02 - Migrar SHA-256 para bcrypt com auto-migracao
 * ============================================================================
 * CORRIGE: crypto.createHash is not a function (crypto removido no script 01)
 *
 * COMO RODAR (dry-run):
 *   node correcao/FASE_1_CRITICA/02_bcrypt_senhas_v1.js
 *
 * COMO RODAR (aplicando):
 *   node correcao/FASE_1_CRITICA/02_bcrypt_senhas_v1.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// ARQUIVO: auth.js
// ---------------------------------------------------------------------------
const AUTH_SUBSTITUICOES = [
  {
    // 1. Reescrever o topo: adicionar crypto de volta + manter bcrypt
    de: `const db = require('../database');
const bcrypt = require('bcrypt');`,
    para: `const db = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');`,
    obrigatorio: true,
  },
  {
    // 2. Trocar a função hashSenha sincrona por versao bcrypt assincrona
    de: `function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}`,
    para: `async function hashSenha(senha) {
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
    // 3. Bloco do admin master (auto-cria usuario)
    de: `        if (!user) {
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
    para: `        if (!user) {
          const novoHash = await hashSenha(senhaStr);
          const createRes = await db.query(\`
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ('Administrador', 'admin@frota.com', $1, 'Administrador', true)
            RETURNING *
          \`, [novoHash]);
          user = createRes.rows[0];
        } else {
          const novoHash = await hashSenha(senhaStr);
          await db.query(
            'UPDATE usuarios SET senha_hash = $1, ativo = true, ultimo_login = CURRENT_TIMESTAMP WHERE id = $2',
            [novoHash, user.id]
          );
        }`,
    obrigatorio: true,
  },
  {
    // 4. Validacao dos demais usuarios (com auto-migracao)
    de: `      const senhaDb = user.senha_hash || user.senha;
      const senhaValida = (senhaDb === senhaStr || senhaDb === hashInformado);`,
    para: `      const senhaDb = user.senha_hash || user.senha;
      let senhaValida = false;

      if (senhaDb && senhaDb.startsWith('$2')) {
        // bcrypt (novo padrao)
        senhaValida = await verificarSenha(senhaStr, senhaDb);
      } else {
        // SHA-256 (legado) — valida e migra silenciosamente
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

// ---------------------------------------------------------------------------
// ARQUIVO: usuarios.js
// ---------------------------------------------------------------------------
const USUARIOS_SUBSTITUICOES = [
  {
    // 1. Reescrever topo: adicionar crypto + reescrever hashSenha
    de: `const db = require('../database');
const bcrypt = require('bcrypt');`,
    para: `const db = require('../database');
const bcrypt = require('bcrypt');`,
    obrigatorio: false, // opcional, nao altera se nao encontrar
  },
  {
    // 2. Trocar hashSenha sincrona por bcrypt assincrona
    de: `function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}`,
    para: `async function hashSenha(senha) {
  return bcrypt.hash(String(senha), 10);
}`,
    obrigatorio: true,
  },
  {
    // 3. Admin seed no topo (ensureUsuariosETabelas)
    de: `      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
      VALUES ('Administrador', 'admin@frota.com', '\${hashSenha('123')}', 'Administrador', true)
      ON CONFLICT (email) DO NOTHING;`,
    para: `      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
      VALUES ('Administrador', 'admin@frota.com', '$2b$10$placeholder_migrar_no_login', 'Administrador', true)
      ON CONFLICT (email) DO NOTHING;`,
    obrigatorio: false, // pode nao existir exatamente assim
  },
  {
    // 4. senhaHash no POST /api/usuarios
    de: `    const senhaFinal = senha || '123456';
    const senhaHash = hashSenha(senhaFinal);`,
    para: `    const senhaFinal = senha || '123456';
    const senhaHash = await hashSenha(senhaFinal);`,
    obrigatorio: true,
  },
  {
    // 5. senhaHash no PUT /api/usuarios/:id/resetar-senha
    de: `    const senhaHash = hashSenha(nova_senha);`,
    para: `    const senhaHash = await hashSenha(nova_senha);`,
    obrigatorio: true,
  },
];

// ---------------------------------------------------------------------------
// UTILITARIOS
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '02_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

function processarArquivo(relPath, substituicoes) {
  const absPath = path.resolve(ROOT, relPath);

  if (!fs.existsSync(absPath)) {
    return { status: 'SKIP', msg: 'Arquivo nao encontrado' };
  }

  let conteudo = fs.readFileSync(absPath, 'utf8');
  const original = conteudo;
  const problemas = [];

  for (const sub of substituicoes) {
    const ocorrencias = conteudo.split(sub.de).length - 1;

    if (ocorrencias === 0) {
      if (sub.obrigatorio) {
        problemas.push('NAO ENCONTRADO: ' + sub.de.substring(0, 70).replace(/\n/g, '\\n'));
      }
      continue;
    }

    if (ocorrencias > 1) {
      problemas.push('DUPLICADO (' + ocorrencias + 'x): ' + sub.de.substring(0, 70).replace(/\n/g, '\\n'));
      continue;
    }

    conteudo = conteudo.replace(sub.de, sub.para);
  }

  if (problemas.length > 0) {
    return { status: 'ERRO', problemas };
  }

  if (conteudo === original) {
    return { status: 'SEM_MUDANCA' };
  }

  if (!APLICAR) {
    return { status: 'DRY_RUN', preview: conteudo.substring(0, 600) };
  }

  const backupPath = garantirBackup(relPath);
  fs.writeFileSync(absPath, conteudo, 'utf8');
  return { status: 'APLICADO', backupPath };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

console.log('\n=============================================');
console.log('  CORRECAO 02 - bcrypt');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const ARQUIVOS = [
  { path: 'src/routes/auth.js', subs: AUTH_SUBSTITUICOES },
  { path: 'src/routes/usuarios.js', subs: USUARIOS_SUBSTITUICOES },
];

let ok = 0, erro = 0, semMudanca = 0;

for (const cfg of ARQUIVOS) {
  const resultado = processarArquivo(cfg.path, cfg.subs);

  console.log('>> ' + cfg.path);

  if (resultado.status === 'APLICADO') {
    console.log('   [OK] Aplicado. Backup: ' + resultado.backupPath);
    ok++;
  } else if (resultado.status === 'DRY_RUN') {
    console.log('   [DRY] Mudancas seriam aplicadas.');
    ok++;
  } else if (resultado.status === 'SEM_MUDANCA') {
    console.log('   [--] Sem mudancas.');
    semMudanca++;
  } else if (resultado.status === 'SKIP') {
    console.log('   [SKIP] ' + resultado.msg);
  } else if (resultado.status === 'ERRO') {
    console.log('   [ERRO] NAO APLICADO. Problemas:');
    resultado.problemas.forEach(p => console.log('          - ' + p));
    erro++;
  }

  console.log('');
}

console.log('=============================================');
console.log('  OK/DRY:      ' + ok);
console.log('  Sem mudanca: ' + semMudanca);
console.log('  Erros:       ' + erro);
console.log('=============================================');

if (!APLICAR) {
  console.log('\n⚠️  DRY-RUN: nada foi alterado.');
  console.log('   Rode com --apply para aplicar.\n');
} else {
  console.log('\n✅ Aplicado. Rode os testes:');
  console.log("   node -e \"require('./src/routes/auth.js'); console.log('auth OK')\"");
  console.log("   node -e \"require('./src/routes/usuarios.js'); console.log('usuarios OK')\"");
  console.log('\n   Depois commit + push.\n');
}