const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_29_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 29 - Backend: filtros combinados (AND)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// Substitui o bloco `if (periodo === 'tudo') ...` por versao com AND
const ANTES = `      // Filtro: mes | dias | tudo
      if (periodo === 'tudo') {
        // Sem filtro de data
      } else if (dias) {
        // Ultimos N dias (de hoje para tras, sem incluir o futuro)
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days') AND l.data_lancamento <= CURRENT_DATE\`;
        }
      } else if (mes) {
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

const DEPOIS = `      // ===== FILTROS DE DATA - TODOS SE COMBINAM (AND) =====

      // 1) Filtro ANO (sempre se aplicado)
      if (ano) {
        query += \` AND EXTRACT(YEAR FROM l.data_lancamento) = $\${idx}::int\`;
        params.push(parseInt(ano));
        idx++;
      }

      // 2) Filtro MES (numero: 01-12, sempre se aplicado)
      if (mesNumero) {
        query += \` AND EXTRACT(MONTH FROM l.data_lancamento) = $\${idx}::int\`;
        params.push(parseInt(mesNumero));
        idx++;
      }

      // 3) Filtro MES (formato YYYY-MM-DD - se aplicado)
      if (mes && !ano && !mesNumero) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      }

      // 4) Filtro DIAS (ultimos N dias - se aplicado)
      //    Se ano/mes tbm estao setados, o range e DENTRO daquele contexto
      if (dias && periodo !== 'tudo') {
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          if (ano || mesNumero) {
            // Range relativo ao ultimo dia do ano/mes selecionado
            query += \` AND l.data_lancamento >= (
              (SELECT MAX(data_lancamento) FROM lancamentos_financeiros 
               WHERE EXTRACT(YEAR FROM data_lancamento) = COALESCE($\${idx}::int, EXTRACT(YEAR FROM CURRENT_DATE))
                 AND EXTRACT(MONTH FROM data_lancamento) = COALESCE($\${idx + 1}::int, EXTRACT(MONTH FROM CURRENT_DATE))
                 AND deleted_at IS NULL) - INTERVAL '\${diasNum} days'
            )\`;
            params.push(ano ? parseInt(ano) : null);
            params.push(mesNumero ? parseInt(mesNumero) : null);
            idx += 2;
          } else {
            // Sem ano/mes: range dos ultimos N dias a partir de HOJE
            query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days') AND l.data_lancamento <= CURRENT_DATE\`;
          }
        }
      }

      // 5) Se nada foi aplicado e tem 'mes' (formato YYYY-MM-DD) sem ano/mesNumero
      // (ja tratado no passo 3)`;

if (js.indexOf(ANTES) !== -1) {
  js = js.replace(ANTES, DEPOIS);
  console.log('  [OK] Filtros de data combinados (AND)');
} else {
  console.log('  [AVISO] Bloco de filtros nao casou exatamente.');
  console.log('  Verificar manualmente as linhas 38-65');
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
