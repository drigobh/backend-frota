const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

function garantirBackup(relPath, prefix) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, prefix + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 32 - Frontend: filtros combinados (regex robusto)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const frontPath = path.resolve(ROOT, 'public/index.html');
let html = fs.readFileSync(frontPath, 'utf8');
const htmlOriginal = html;

// Regex tolerante: casa o bloco independente de CRLF/LF ou espacos
const regex = /\/\/ Aplica PERIODO primeiro \(sobrepoe ano\/mes\)\s*\r?\n\s*if\s*\(periodo === "tudo"\)\s*\{\s*\r?\n\s*params\.append\("periodo", "tudo"\);\s*\r?\n\s*\}\s*else if\s*\(periodo\)\s*\{\s*\r?\n\s*params\.append\("dias", periodo\);\s*\r?\n\s*\}\s*else\s*\{\s*\r?\n\s*\/\/ Se nao tem periodo, aplica ano e mes\s*\r?\n\s*if\s*\(ano\)\s*params\.append\("ano", ano\);\s*\r?\n\s*if\s*\(mes\)\s*params\.append\("mesNumero", mes\);\s*\/\/ 1-12\s*\r?\n\s*\}/;

const match = html.match(regex);

if (match) {
  const SUBSTITUTO = '// Aplica TODOS os filtros (combinados com AND no backend)\n        if (periodo === "tudo") {\n          params.append("periodo", "tudo");\n        } else if (periodo) {\n          params.append("dias", periodo);\n        }\n        if (ano) params.append("ano", ano);\n        if (mes) params.append("mesNumero", mes);';

  html = html.replace(regex, SUBSTITUTO);
  console.log('  [OK] Frontend: envio combinado (via regex)');
} else {
  console.log('  [ERRO] Nao consegui casar o bloco.');
  process.exit(1);
}

console.log('');
console.log('  Frontend: ' + htmlOriginal.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - htmlOriginal.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const bp = garantirBackup('public/index.html', 'f3a_32_');
console.log('  [BACKUP] ' + bp);
fs.writeFileSync(frontPath, html, 'utf8');
console.log('  [OK] Frontend atualizado!');
