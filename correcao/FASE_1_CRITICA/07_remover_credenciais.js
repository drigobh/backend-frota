/**
 * ============================================================================
 * CORRECAO 07 - Remover credenciais hardcoded do formulario de login
 * ============================================================================
 * Remove value="admin@frota.com" e value="123" dos inputs de login.
 * Adiciona autocomplete adequado para boas praticas.
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/07_remover_credenciais.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/07_remover_credenciais.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// Substituicoes exatas baseadas no que vimos no arquivo
const SUBS = [
  {
    de: '<input type="email" id="login-email" class="login-input" placeholder="E-mail (ex: admin@frota.com)" value="admin@frota.com" required>',
    para: '<input type="email" id="login-email" name="email" class="login-input" placeholder="E-mail" required autocomplete="username">',
    descricao: 'input de e-mail (remove value + adiciona autocomplete)',
  },
  {
    de: '<input type="password" id="login-senha" class="login-input" placeholder="Senha" value="123" required>',
    para: '<input type="password" id="login-senha" name="senha" class="login-input" placeholder="Senha" required autocomplete="current-password">',
    descricao: 'input de senha (remove value + adiciona autocomplete)',
  },
];

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '07_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 07 - Remover credenciais hardcoded');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const problemas = [];

for (const sub of SUBS) {
  const ocorrencias = html.split(sub.de).length - 1;

  if (ocorrencias === 0) {
    problemas.push('NAO ENCONTRADO: ' + sub.descricao);
    continue;
  }

  if (ocorrencias > 1) {
    problemas.push('DUPLICADO (' + ocorrencias + 'x): ' + sub.descricao);
    continue;
  }

  html = html.replace(sub.de, sub.para);
  console.log('   [OK] ' + sub.descricao);
}

if (problemas.length > 0) {
  console.log('');
  console.log('   [ERRO] NAO APLICADO:');
  problemas.forEach(function(p) { console.log('          - ' + p); });
  process.exit(1);
}

if (html === original) {
  console.log('   [--] Sem mudancas. Arquivo ja limpo.');
  process.exit(0);
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars');

// Verifica se nao ha mais credenciais
if (html.includes('value="admin@frota.com"') || html.includes('value="123"')) {
  console.log('   [AVISO] Ainda existem valores hardcoded no HTML!');
  console.log('           Verifique manualmente.');
}

console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Credenciais removidas!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(seguranca): remover credenciais hardcoded do login"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');