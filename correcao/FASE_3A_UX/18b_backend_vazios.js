const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_18b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 18b - Backend: tratar filtros vazios');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// 1) Normaliza os valores recebidos: "---------" ou "" sao tratados como undefined
const ANTES1 = "const { mes, mesNumero, ano, tipo, categoria, veiculo, dias, periodo } = req.query;";
const DEPOIS1 = "let { mes, mesNumero, ano, tipo, categoria, veiculo, dias, periodo } = req.query;\n\n      // Normaliza: '---------' e '' viram undefined\n      function limpar(v) { return (v === '---------' || v === '' || v === undefined) ? undefined : v; }\n      mes = limpar(mes);\n      mesNumero = limpar(mesNumero);\n      ano = limpar(ano);\n      tipo = limpar(tipo);\n      categoria = limpar(categoria);\n      veiculo = limpar(veiculo);\n      dias = limpar(dias);\n      periodo = limpar(periodo);";

if (js.indexOf(ANTES1) !== -1) {
  js = js.replace(ANTES1, DEPOIS1);
  console.log('  [OK] Normalizacao de valores vazios adicionada');
} else {
  console.log('  [AVISO] Nao achei o destructuring. Talvez ja tenha sido alterado.');
}

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + js.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, js, 'utf8');
console.log('  [OK] Backend atualizado!');
