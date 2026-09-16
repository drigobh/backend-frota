const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_16c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 16c - Backend: filtros ano + mesNumero');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

let mudancas = 0;

// 1) Destructuring
const ANTES1 = "const { mes, tipo, categoria, veiculo, dias, periodo } = req.query;";
const DEPOIS1 = "const { mes, mesNumero, ano, tipo, categoria, veiculo, dias, periodo } = req.query;";
if (js.indexOf(ANTES1) !== -1) {
  js = js.replace(ANTES1, DEPOIS1);
  mudancas++;
  console.log('  [OK] Destructuring atualizado');
}

// 2) Adiciona filtro por ano e mesNumero
const ANTES2 = `      } else if (mes) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      }`;

const DEPOIS2 = `      } else if (mes) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      } else {
        if (ano) {
          query += \` AND EXTRACT(YEAR FROM l.data_lancamento) = $\${idx}::int\`;
          params.push(parseInt(ano));
          idx++;
        }
        if (mesNumero) {
          query += \` AND EXTRACT(MONTH FROM l.data_lancamento) = $\${idx}::int\`;
          params.push(parseInt(mesNumero));
          idx++;
        }
      }`;

if (js.indexOf(ANTES2) !== -1) {
  js = js.replace(ANTES2, DEPOIS2);
  mudancas++;
  console.log('  [OK] Filtros ano + mesNumero adicionados');
} else {
  console.log('  [AVISO] Bloco de filtro de mes nao casou exatamente. Verifique.');
}

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + js.length + ' chars');
console.log('  Mudancas: ' + mudancas);
console.log('');

if (mudancas === 0) {
  console.log('  [ERRO] Nenhuma mudanca aplicada.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, js, 'utf8');
console.log('  [OK] Backend atualizado!');
