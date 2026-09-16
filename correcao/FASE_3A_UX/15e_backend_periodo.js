const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15e_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15e - Backend: filtro por dias ou tudo');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// Encontra o GET /api/lancamentos e o filtro de mes
const ANTES = "const { mes, tipo, categoria, veiculo } = req.query;";
const DEPOIS = "const { mes, tipo, categoria, veiculo, dias, periodo } = req.query;";

const oc = js.split(ANTES).length - 1;
console.log('  Ocorrencias do destructuring: ' + oc);

if (oc !== 1) {
  console.log('  [ERRO] Esperava 1 ocorrencia. Encontradas: ' + oc);
  process.exit(1);
}
js = js.replace(ANTES, DEPOIS);
console.log('  [OK] Destructuring atualizado.');

// Encontra o bloco if (mes) e adiciona tratamento de dias/tudo
const ANTES2 = `      // Filtro: mes (YYYY-MM-DD do primeiro dia)
      if (mes) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      }`;

const DEPOIS2 = `      // Filtro: mes | dias | tudo
      if (periodo === 'tudo') {
        // Sem filtro de data
      } else if (dias) {
        // Ultimos N dias
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days')\`;
        }
      } else if (mes) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      }`;

const oc2 = js.split(ANTES2).length - 1;
console.log('  Ocorrencias do filtro de mes: ' + oc2);

if (oc2 !== 1) {
  console.log('  [ERRO] Esperava 1 ocorrencia do filtro. Encontradas: ' + oc2);
  console.log('  (Indentacao pode estar diferente.)');
  process.exit(1);
}
js = js.replace(ANTES2, DEPOIS2);
console.log('  [OK] Filtro de periodo adicionado.');

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
