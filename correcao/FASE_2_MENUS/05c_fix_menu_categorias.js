/**
 * ============================================================================
 * CORRECAO FASE 2 - 05c - Mover botao Categorias para dentro de Cadastros
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/05c_fix_menu_categorias.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/05c_fix_menu_categorias.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_05c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 05c - Mover Categorias p/ Cadastros');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

function N(s) { return s.replace(/\n/g, NL); }

// ---------------------------------------------------------------------------
// 1) REMOVER o botao Categorias que esta FORA do submenu
// ---------------------------------------------------------------------------
const BOTAO_FORA = N(`<button class="nav-tab-btn" data-tab="tab-categorias" onclick="setTimeout(loadCategoriasDaAPI, 150)"><span>&#127991;</span><span class="nav-label">Categorias</span></button>
`);

if (html.includes(BOTAO_FORA)) {
  html = html.replace(BOTAO_FORA, '');
  console.log('   [OK] Botao Categorias removido de FORA do submenu.');
} else {
  console.log('   [--] Botao Categorias nao estava fora (ou padrao diferente).');
}

// ---------------------------------------------------------------------------
// 2) INSERIR o botao DENTRO do submenu Cadastros (apos Motoristas)
// ---------------------------------------------------------------------------
const ANTES = N(`        <button class="nav-tab-btn" data-tab="tab-cadastro" data-subtab-target="subtab-motoristas"><span>&#128100;</span><span class="nav-label">Motoristas</span></button>
      </div>`);

const DEPOIS = N(`        <button class="nav-tab-btn" data-tab="tab-cadastro" data-subtab-target="subtab-motoristas"><span>&#128100;</span><span class="nav-label">Motoristas</span></button>
        <button class="nav-tab-btn" data-tab="tab-categorias" onclick="setTimeout(loadCategoriasDaAPI, 150)"><span>&#127991;</span><span class="nav-label">Categorias</span></button>
      </div>`);

if (html.includes(ANTES)) {
  html = html.replace(ANTES, DEPOIS);
  console.log('   [OK] Botao Categorias adicionado DENTRO do submenu Cadastros.');
} else if (html.includes(DEPOIS)) {
  console.log('   [--] Botao Categorias ja esta dentro do submenu Cadastros.');
} else {
  console.log('   [ERRO] Nao achei o bloco do submenu Cadastros.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3) Verificacoes
// ---------------------------------------------------------------------------
const dentroCount = (html.match(/<div class="nav-submenu" id="grupo-cadastros">[\s\S]*?<\/div>/g) || []).length;
console.log('');
console.log('   Submenus Cadastros encontrados: ' + dentroCount);
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Menu corrigido!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(menu): mover Categorias para dentro de Cadastros"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');