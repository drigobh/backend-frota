/**
 * ============================================================================
 * CORRECAO FASE 2 - 01 v2 - Reorganizar sidebar (menu lateral)
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/01_reorganizar_sidebar.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/01_reorganizar_sidebar.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 4 SUBSTITUICOES CIRURGICAS
// ---------------------------------------------------------------------------

const SUBS = [
  // 1) Renomear "KM Mensal" -> "Quilometragem"
  {
    de: '<button class="nav-tab-btn" data-tab="tab-km"><span>&#128739;</span><span class="nav-label">KM Mensal</span></button>',
    para: '<button class="nav-tab-btn" data-tab="tab-km"><span>&#128739;</span><span class="nav-label">Quilometragem</span></button>',
    descricao: 'renomear KM Mensal -> Quilometragem',
  },
  // 2) Substituir TODO o bloco Operacao (para adicionar Manutencao/Documentos/Historico)
  {
    de: `      <div class="nav-submenu" id="grupo-operacao">
        <button class="nav-tab-btn" data-tab="tab-acoplamento"><span>&#128279;</span><span class="nav-label">Acoplamentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-km"><span>&#128739;</span><span class="nav-label">KM Mensal</span></button>
        <button class="nav-tab-btn" data-tab="tab-abastecimentos"><span>&#9981;</span><span class="nav-label">Abastecimentos</span></button>
      </div>`,
    para: `      <div class="nav-submenu" id="grupo-operacao">
        <button class="nav-tab-btn" data-tab="tab-acoplamento"><span>&#128279;</span><span class="nav-label">Acoplamentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-km"><span>&#128739;</span><span class="nav-label">Quilometragem</span></button>
        <button class="nav-tab-btn" data-tab="tab-abastecimentos"><span>&#9981;</span><span class="nav-label">Abastecimentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-manutencoes"><span>&#128295;</span><span class="nav-label">Manutencao</span></button>
        <button class="nav-tab-btn" data-tab="tab-documentos"><span>&#128196;</span><span class="nav-label">Documentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-historico"><span>&#128220;</span><span class="nav-label">Historico</span></button>
      </div>`,
    descricao: 'adicionar Manutencao + Documentos + Historico no grupo Operacao',
  },
  // 3) Substituir TODO o bloco Financeiro (para remover Manutencao/Documentos)
  {
    de: `      <div class="nav-submenu" id="grupo-financeiro">
        <button class="nav-tab-btn" data-tab="tab-dre" id="nav-tab-dre"><span>&#128202;</span><span class="nav-label">DRE por Veiculo</span></button>
        <button class="nav-tab-btn" data-tab="tab-manutencoes"><span>&#128295;</span><span class="nav-label">Manutencao</span></button>
        <button class="nav-tab-btn" data-tab="tab-documentos"><span>&#128196;</span><span class="nav-label">Documentos</span></button>
      </div>`,
    para: `      <div class="nav-submenu" id="grupo-financeiro">
        <button class="nav-tab-btn" data-tab="tab-dre" id="nav-tab-dre"><span>&#128202;</span><span class="nav-label">DRE por Veiculo</span></button>
      </div>`,
    descricao: 'remover Manutencao + Documentos do grupo Financeiro',
  },
];

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_01v2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 01 v2 - Reorganizar sidebar');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const problemas = [];

for (const sub of SUBS) {
  const ocorrencias = html.split(sub.de).length - 1;

  if (ocorrencias === 0) {
    problemas.push('NAO ENCONTRADO: ' + sub.descricao);
    continue;
  }

  if (ocorrencias > 1) {
    problemas.push('DUPLICADO (' + ocorrencias + 'x): ' + sub.descricao);
    continue;
  }

  html = html.replace(sub.de, sub.para);
  console.log('   [OK] ' + sub.descricao);
}

if (problemas.length > 0) {
  console.log('');
  console.log('   [ERRO] NAO APLICADO:');
  problemas.forEach(function(p) { console.log('          - ' + p); });
  process.exit(1);
}

if (html === original) {
  console.log('\n   [--] Sem mudancas. Arquivo ja reorganizado.\n');
  process.exit(0);
}

console.log('');
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
console.log('   [OK] Sidebar reorganizada!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(menu): reorganizar sidebar (Operacao + Financeiro)"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para ver a mudanca');
