const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15f_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15f - Reorganizar layout dos filtros de Lancamentos');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// ---- 1) Adicionar CSS dos filtros compactos ----
const CSS = [
'',
'    /* ==== FILTROS COMPACTOS - Lancamentos (FASE 3A / 15f) ==== */',
'    .filtros-bar { background:#fff; border:1px solid var(--border); border-radius:var(--radius); padding:1rem 1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-wrap:wrap; gap:1rem; align-items:flex-end; justify-content:space-between; }',
'    .filtros-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem; flex:1; min-width:0; }',
'    .filtro-item { display:flex; flex-direction:column; gap:4px; min-width:0; }',
'    .filtro-item label { font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; }',
'    .filtro-item select, .filtro-item input { width:100%; padding:0.5rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; font-weight:600; color:#0f2a4a; background:#fff; box-sizing:border-box; cursor:pointer; transition:all 0.15s ease; }',
'    .filtro-item select:focus, .filtro-item input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.15); }',
'    .filtros-acoes { display:flex; gap:0.5rem; align-items:flex-end; }',
'    @media (max-width: 768px) {',
'      .filtros-bar { flex-direction:column; align-items:stretch; }',
'      .filtros-grid { grid-template-columns:1fr 1fr; }',
'      .filtros-acoes { justify-content:flex-end; }',
'    }',
''].join('\n');

if (!html.includes('FILTROS COMPACTOS - Lancamentos')) {
  var idxStyle = html.indexOf('</style>', html.indexOf('</style>') + 8);
  if (idxStyle !== -1) {
    html = html.substring(0, idxStyle) + CSS.replace(/\n/g, NL) + html.substring(idxStyle);
    console.log('  [OK] CSS dos filtros compactos adicionado');
  }
}

// ---- 2) Substituir o HTML do bar-controls de Lancamentos ----
const ANTES = '<div class="bar-controls">' + NL +
'          <div class="bar-controls-left">' + NL +
'            <span class="label-month-select">Mês de Referência:</span>' + NL +
'            <select class="select-month select-mes-global" id="select-mes-lancamentos"></select>' + NL +
'            <select id="lanc-filtro-periodo" class="select-month" style="min-width:150px;">' + NL +
'              <option value="mes">Mes atual</option>' + NL +
'              <option value="30">Ultimos 30 dias</option>' + NL +
'              <option value="60">Ultimos 60 dias</option>' + NL +
'              <option value="90">Ultimos 90 dias</option>' + NL +
'              <option value="120">Ultimos 120 dias</option>' + NL +
'              <option value="tudo">Tudo (sem filtro)</option>' + NL +
'            </select>' + NL +
'            <select id="lanc-filtro-tipo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">' + NL +
'              <option value="">Todos os tipos</option>' + NL +
'              <option value="Receita">Receitas</option>' + NL +
'              <option value="Despesa">Despesas</option>' + NL +
'            </select>' + NL +
'            <select id="lanc-filtro-categoria" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">' + NL +
'              <option value="">Todas as categorias</option>' + NL +
'            </select>' + NL +
'            <select id="lanc-filtro-veiculo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">' + NL +
'              <option value="">Todos os veículos</option>' + NL +
'            </select>' + NL +
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosLancamentos()">Limpar</button>' + NL +
'          </div>' + NL +
'          <div class="bar-controls-right">' + NL +
'            <button class="btn-action btn-action-secondary" onclick="exportarLancamentosCSV()">&#11015;&#65039; Exportar CSV</button>' + NL +
'            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo Lançamento</button>' + NL +
'          </div>' + NL +
'        </div>';

const DEPOIS = '<div class="filtros-bar">' + NL +
'          <div class="filtros-grid">' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="select-mes-lancamentos">Mês</label>' + NL +
'              <select class="select-mes-global" id="select-mes-lancamentos"></select>' + NL +
'            </div>' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="lanc-filtro-periodo">Período</label>' + NL +
'              <select id="lanc-filtro-periodo">' + NL +
'                <option value="mes">Mês atual</option>' + NL +
'                <option value="30">Últimos 30 dias</option>' + NL +
'                <option value="60">Últimos 60 dias</option>' + NL +
'                <option value="90">Últimos 90 dias</option>' + NL +
'                <option value="120">Últimos 120 dias</option>' + NL +
'                <option value="tudo">Tudo (sem filtro)</option>' + NL +
'              </select>' + NL +
'            </div>' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="lanc-filtro-tipo">Tipo</label>' + NL +
'              <select id="lanc-filtro-tipo">' + NL +
'                <option value="">Todos os tipos</option>' + NL +
'                <option value="Receita">Receitas</option>' + NL +
'                <option value="Despesa">Despesas</option>' + NL +
'              </select>' + NL +
'            </div>' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="lanc-filtro-categoria">Categoria</label>' + NL +
'              <select id="lanc-filtro-categoria">' + NL +
'                <option value="">Todas as categorias</option>' + NL +
'              </select>' + NL +
'            </div>' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="lanc-filtro-veiculo">Veículo</label>' + NL +
'              <select id="lanc-filtro-veiculo">' + NL +
'                <option value="">Todos os veículos</option>' + NL +
'              </select>' + NL +
'            </div>' + NL +
'          </div>' + NL +
'          <div class="filtros-acoes">' + NL +
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosLancamentos()">Limpar</button>' + NL +
'            <button class="btn-action btn-action-secondary" onclick="exportarLancamentosCSV()">&#11015;&#65039; CSV</button>' + NL +
'            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo</button>' + NL +
'          </div>' + NL +
'        </div>';

const oc = html.split(ANTES).length - 1;
console.log('  Ocorrencias do bloco bar-controls: ' + oc);

if (oc === 1) {
  html = html.replace(ANTES, DEPOIS.replace(/\n/g, NL));
  console.log('  [OK] Layout dos filtros substituido');
} else if (oc === 0) {
  console.log('  [AVISO] Nao achei o bloco exato. Tentando padrao alternativo (sem acentos)...');

  // Padrao sem acentos (do script anterior)
  const ANTES2 = '<div class="bar-controls">' + NL +
    '          <div class="bar-controls-left">' + NL +
    '            <span class="label-month-select">Mês de Referência:</span>' + NL +
    '            <select class="select-month select-mes-global" id="select-mes-lancamentos"></select>' + NL +
    '            <select id="lanc-filtro-tipo"';

  if (html.indexOf(ANTES2) !== -1) {
    console.log('  [INFO] Bloco alternativo encontrado. Use correcao manual.');
  }
  process.exit(1);
} else {
  console.log('  [ERRO] Bloco aparece ' + oc + 'x. Revise manualmente.');
  process.exit(1);
}

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Layout dos filtros reorganizado!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "feat(ui): reorganizar layout dos filtros de lancamentos"');
console.log('  2. git push origin main');
