/**
 * ============================================================================
 * CORRECAO FASE 2 - 09a2 - Fix aspas simples em SQL no dre_veiculo.js
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/09a2_fix_aspas_dre.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/09a2_fix_aspas_dre.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/dre_veiculo.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_09a2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 09a2 - Fix aspas SQL');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// Estrategia:
// 1) Encontrar todas as linhas com db.query( seguido de 'SELECT ... 'month' ...' 
// 2) Trocar as aspas simples externas por aspas duplas

// Regex: encontra 'SELECT ... 'month' ...' ate o proximo ' ou "
// Cobre o padrao: 'SELECT ... DATE_TRUNC('month', ...) ... = $2::date ...'
const regexQuery = /'((?:[^'\\]|\\.)*?)DATE_TRUNC\('month',((?:[^'\\]|\\.)*?)'/g;

let substituicoes = 0;

js = js.replace(regexQuery, function(match, antes, depois) {
  substituicoes++;
  // Troca a aspa simples externa por dupla
  return '"' + antes + "DATE_TRUNC('month'," + depois + '"';
});

console.log('   Substituicoes feitas: ' + substituicoes);

// Caso a regex nao pegue, tenta novamente com outra abordagem: toda linha com 'SELECT ... DATE_TRUNC('month', ... '
// Substitui apenas as aspas que envolvem a query

if (js === original) {
  // Fallback: substituicao por linha
  const linhas = js.split('\n');
  let mudou = 0;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    // Detecta linhas que contem: 'SELECT ... DATE_TRUNC('month', ...) ...
    // e troca aspas simples externas
    const regexLinha = /'(SELECT[^']*DATE_TRUNC\('month',[^']*)'/;
    if (regexLinha.test(l)) {
      linhas[i] = l.replace(regexLinha, function(m, conteudo) {
        mudou++;
        return '"' + conteudo + '"';
      });
    }
  }
  if (mudou > 0) {
    js = linhas.join('\n');
    console.log('   Substituicoes via linha: ' + mudou);
  }
}

if (js === original) {
  console.log('   [--] Sem mudancas (ja corrigido ou padrao nao encontrado).');
  process.exit(0);
}

console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + js.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, js, 'utf8');
console.log('   [OK] Aspas corrigidas!');
console.log('');
console.log('Proximos passos:');
console.log('  1. node -e "require(\'./src/routes/dre_veiculo.js\'); console.log(\'OK\')"');
console.log('  2. git add . && git commit -m "fix(dre): aspas SQL corrigidas"');
console.log('  3. git push origin main');