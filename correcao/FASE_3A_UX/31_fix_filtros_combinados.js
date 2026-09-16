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

console.log('  FASE 3A / 31 - Fix definitivo: filtros combinados (AND)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

let mudancas = 0;

// ===== BACKEND =====
const backendPath = path.resolve(ROOT, 'src/routes/lancamentos.js');
let js = fs.readFileSync(backendPath, 'utf8');
const jsOriginal = js;

const ANTES_BACKEND = '      // Filtro: mes | dias | tudo\n      if (periodo === \'tudo\') {\n        // Sem filtro de data\n      } else if (dias) {\n        // Ultimos N dias (de hoje para tras, sem incluir o futuro)\n        const diasNum = parseInt(dias);\n        if (diasNum > 0 && diasNum <= 365) {\n          query += ` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL \'${diasNum} days\') AND l.data_lancamento <= CURRENT_DATE`;\n        }\n            } else if (mes) {\n        query += ` AND DATE_TRUNC(\'month\', l.data_lancamento) = $${idx}::date`;\n        params.push(mes);\n        idx++;\n      } else {\n        if (ano) {\n          query += ` AND EXTRACT(YEAR FROM l.data_lancamento) = $${idx}::int`;\n          params.push(parseInt(ano));\n          idx++;\n        }\n        if (mesNumero) {\n          query += ` AND EXTRACT(MONTH FROM l.data_lancamento) = $${idx}::int`;\n          params.push(parseInt(mesNumero));\n          idx++;\n        }\n      }';

const DEPOIS_BACKEND = '      // ===== FILTROS DE DATA - TODOS SE COMBINAM (AND) =====\n\n      // 1) Filtro ANO\n      if (ano) {\n        query += ` AND EXTRACT(YEAR FROM l.data_lancamento) = $${idx}::int`;\n        params.push(parseInt(ano));\n        idx++;\n      }\n\n      // 2) Filtro MES (numero 01-12)\n      if (mesNumero) {\n        query += ` AND EXTRACT(MONTH FROM l.data_lancamento) = $${idx}::int`;\n        params.push(parseInt(mesNumero));\n        idx++;\n      }\n\n      // 3) Filtro MES (formato YYYY-MM-DD)\n      if (mes && !ano && !mesNumero) {\n        query += ` AND DATE_TRUNC(\'month\', l.data_lancamento) = $${idx}::date`;\n        params.push(mes);\n        idx++;\n      }\n\n      // 4) Filtro DIAS\n      if (dias && periodo !== \'tudo\') {\n        const diasNum = parseInt(dias);\n        if (diasNum > 0 && diasNum <= 365) {\n          if (ano || mesNumero) {\n            query += ` AND l.data_lancamento >= (\n              (SELECT MAX(data_lancamento) FROM lancamentos_financeiros \n               WHERE EXTRACT(YEAR FROM data_lancamento) = COALESCE($${idx}::int, EXTRACT(YEAR FROM CURRENT_DATE))\n                 AND EXTRACT(MONTH FROM data_lancamento) = COALESCE($${idx + 1}::int, EXTRACT(MONTH FROM CURRENT_DATE))\n                 AND deleted_at IS NULL) - INTERVAL \'${diasNum} days\'\n            )`;\n            params.push(ano ? parseInt(ano) : null);\n            params.push(mesNumero ? parseInt(mesNumero) : null);\n            idx += 2;\n          } else {\n            query += ` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL \'${diasNum} days\') AND l.data_lancamento <= CURRENT_DATE`;\n          }\n        }\n      }';

if (js.indexOf(ANTES_BACKEND) !== -1) {
  js = js.replace(ANTES_BACKEND, DEPOIS_BACKEND);
  mudancas++;
  console.log('  [OK] Backend: filtros combinados');
} else {
  console.log('  [AVISO] Backend: bloco nao casou');
}

// ===== FRONTEND =====
const frontPath = path.resolve(ROOT, 'public/index.html');
let html = fs.readFileSync(frontPath, 'utf8');
const htmlOriginal = html;

const ANTES_FRONT = '        // Aplica PERIODO primeiro (sobrepoe ano/mes)\n        if (periodo === "tudo") {\n          params.append("periodo", "tudo");\n        } else if (periodo) {\n          params.append("dias", periodo);\n        } else {\n          // Se nao tem periodo, aplica ano e mes\n          if (ano) params.append("ano", ano);\n          if (mes) params.append("mesNumero", mes); // 1-12\n        }';

const DEPOIS_FRONT = '        // Aplica TODOS os filtros (combinados com AND no backend)\n        if (periodo === "tudo") {\n          params.append("periodo", "tudo");\n        } else if (periodo) {\n          params.append("dias", periodo);\n        }\n        if (ano) params.append("ano", ano);\n        if (mes) params.append("mesNumero", mes);';

if (html.indexOf(ANTES_FRONT) !== -1) {
  html = html.replace(ANTES_FRONT, DEPOIS_FRONT);
  mudancas++;
  console.log('  [OK] Frontend: envio combinado');
} else {
  console.log('  [AVISO] Frontend: bloco nao casou');
}

console.log('');
console.log('  Total de mudancas: ' + mudancas);
console.log('  Backend: ' + jsOriginal.length + ' -> ' + js.length);
console.log('  Frontend: ' + htmlOriginal.length + ' -> ' + html.length);
console.log('');

if (mudancas === 0) {
  console.log('  [ERRO] Nenhuma mudanca.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

if (js !== jsOriginal) {
  const bp1 = garantirBackup('src/routes/lancamentos.js', 'f3a_31_');
  console.log('  [BACKUP] ' + bp1);
  fs.writeFileSync(backendPath, js, 'utf8');
}

if (html !== htmlOriginal) {
  const bp2 = garantirBackup('public/index.html', 'f3a_31_');
  console.log('  [BACKUP] ' + bp2);
  fs.writeFileSync(frontPath, html, 'utf8');
}

console.log('  [OK] Filtros combinados aplicados!');
