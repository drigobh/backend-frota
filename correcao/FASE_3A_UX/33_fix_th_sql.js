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

console.log('  FASE 3A / 33 - Fix: th duplicado + SQL dias simplificado');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

let mudancas = 0;

// ===== FIX 1: Remover <th>Mes/Ano</th> duplicado =====
const frontPath = path.resolve(ROOT, 'public/index.html');
let html = fs.readFileSync(frontPath, 'utf8');
const htmlOriginal = html;

const regexThDuplicado = /(<th[^>]*>M\u00eas\/Ano<\/th>)\s*\r?\n(\s*<th[^>]*>M\u00eas\/Ano<\/th>)/;

if (regexThDuplicado.test(html)) {
  html = html.replace(regexThDuplicado, '$1');
  mudancas++;
  console.log('  [OK] <th>Mes/Ano</th> duplicado removido');
} else {
  console.log('  [AVISO] Nao achei th duplicado');
}

// ===== FIX 2: Substituir todo o bloco de filtros de data por versao limpa =====
const backendPath = path.resolve(ROOT, 'src/routes/lancamentos.js');
let js = fs.readFileSync(backendPath, 'utf8');
const jsOriginal = js;

// Regex robusto: encontra do comentario "FILTROS DE DATA" ate o inicio de "if (tipo)"
const regexBackend = /\/\/ ===== FILTROS DE DATA[\s\S]*?(?=\s*if \(tipo\))/;

const NOVO_BLOCO = `// ===== FILTROS DE DATA - TODOS SE COMBINAM (AND) =====

      // 1) Filtro ANO
      if (ano) {
        query += \` AND EXTRACT(YEAR FROM l.data_lancamento) = $\${idx}::int\`;
        params.push(parseInt(ano));
        idx++;
      }

      // 2) Filtro MES (numero 01-12)
      if (mesNumero) {
        query += \` AND EXTRACT(MONTH FROM l.data_lancamento) = $\${idx}::int\`;
        params.push(parseInt(mesNumero));
        idx++;
      }

      // 3) Filtro MES (formato YYYY-MM-DD)
      if (mes && !ano && !mesNumero) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      }

      // 4) Filtro DIAS
      if (dias && periodo !== 'tudo') {
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          if (ano && mesNumero) {
            query += \` AND l.data_lancamento >= (MAKE_DATE($\${idx}::int, $\${idx + 1}::int, 1) - INTERVAL '\${diasNum} days')\`;
            params.push(parseInt(ano));
            params.push(parseInt(mesNumero));
            idx += 2;
          } else if (ano) {
            query += \` AND l.data_lancamento >= (MAKE_DATE($\${idx}::int, 1, 1) - INTERVAL '\${diasNum} days')\`;
            params.push(parseInt(ano));
            idx++;
          } else if (mesNumero) {
            query += \` AND l.data_lancamento >= (MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, $\${idx}::int, 1) - INTERVAL '\${diasNum} days')\`;
            params.push(parseInt(mesNumero));
            idx++;
          } else {
            query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days') AND l.data_lancamento <= CURRENT_DATE\`;
          }
        }
      }

      `;

if (regexBackend.test(js)) {
  js = js.replace(regexBackend, NOVO_BLOCO);
  mudancas++;
  console.log('  [OK] Backend: bloco de filtros substituido por versao limpa');
} else {
  console.log('  [AVISO] Backend: regex nao casou');
}

console.log('');
console.log('  Total de mudancas: ' + mudancas);
console.log('  Frontend: ' + htmlOriginal.length + ' -> ' + html.length);
console.log('  Backend: ' + jsOriginal.length + ' -> ' + js.length);
console.log('');

if (mudancas === 0) {
  console.log('  [ERRO] Nenhuma mudanca.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

if (html !== htmlOriginal) {
  const bp1 = garantirBackup('public/index.html', 'f3a_33_');
  console.log('  [BACKUP] ' + bp1);
  fs.writeFileSync(frontPath, html, 'utf8');
}

if (js !== jsOriginal) {
  const bp2 = garantirBackup('src/routes/lancamentos.js', 'f3a_33_');
  console.log('  [BACKUP] ' + bp2);
  fs.writeFileSync(backendPath, js, 'utf8');
}

console.log('  [OK] Fix aplicado!');
