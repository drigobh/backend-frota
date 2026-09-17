/**
 * Limpeza pos-reaplicacao:
 *   1. Remove duplicata de FASE_3D_SKELETON_JS
 *   2. Remove listener orfao do btn-print-report
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const HTML   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('Limpeza pos-reaplicacao');
console.log('===============================================\n');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

let html = fs.readFileSync(HTML, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_limpeza_pos_reaplicacao.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

/* -------- 1) Remove listener orfao do btn-print-report -------- */
const regexListener = /document\.getElementById\(['"]btn-print-report['"]\)\.addEventListener\([^)]*\)\s*=>\s*\{[\s\S]*?\}\);/g;
const tinhaListener = regexListener.test(html);
html = html.replace(regexListener, '/* listener btn-print-report removido */');
console.log('Listener btn-print-report removido: ' + tinhaListener);

/* -------- 2) Remove bloco duplicado de FASE_3D_SKELETON_JS -------- */
// Procura por multiplas ocorrencias do mesmo marcador. Mantem a ULTIMA.
const marcador = '// FASE_3D_SKELETON_JS';
const ocorrencias = (html.split(marcador).length - 1);
console.log('Ocorrencias de FASE_3D_SKELETON_JS: ' + ocorrencias);

if (ocorrencias > 1) {
  // Encontra a posicao de cada uma
  const posicoes = [];
  let idx = html.indexOf(marcador);
  while (idx !== -1) {
    posicoes.push(idx);
    idx = html.indexOf(marcador, idx + 1);
  }

  // Remove a PRIMEIRA ocorrencia (bloco completo: do marcador ate o fechamento </script>)
  const primeiro = posicoes[0];
  const fechamento = html.indexOf('</script>', primeiro);
  if (fechamento !== -1) {
    // Remove do marcador ate </script> (inclusive)
    html = html.slice(0, primeiro) + '/* SKELETON_DUPLICADO_REMOVIDO */\n' + html.slice(fechamento + '</script>'.length);
    console.log('OK: bloco duplicado removido');
  }
}

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('\nArquivo salvo.');
} else {
  console.log('\nNenhuma mudanca.');
}
console.log('');
