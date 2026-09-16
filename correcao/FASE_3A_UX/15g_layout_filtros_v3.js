const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15g_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15g - Reorganizar layout (regex tolerante)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');
const NL = '\n';

// ---- 1) Encontra as linhas exatas do bloco ----
let linhaInicio = -1;
let linhaFim = -1;

for (let i = 0; i < linhas.length; i++) {
  const l = linhas[i];
  // Detecta o inicio: linha com <div class="bar-controls"> seguida em breve por tab-lancamentos
  if (linhaInicio === -1 && l.indexOf('bar-controls') !== -1 && i > 2100 && i < 2200) {
    // Verifica se as próximas 5 linhas tem o select-mes-lancamentos
    for (let j = i; j < i + 6; j++) {
      if (linhas[j] && linhas[j].indexOf('select-mes-lancamentos') !== -1) {
        linhaInicio = i;
        break;
      }
    }
  }
  // Detecta o fim: proxima linha com 'kpi-row' + 'lanc-resumo'
  if (linhaInicio !== -1 && linhaFim === -1 && l.indexOf('lanc-resumo') !== -1) {
    // O bloco termina 1 linha antes (a linha vazia)
    linhaFim = i - 2;
    break;
  }
}

if (linhaInicio === -1 || linhaFim === -1) {
  console.log('  [ERRO] Nao consegui delimitar o bloco.');
  console.log('  linhaInicio=' + linhaInicio + ' linhaFim=' + linhaFim);
  process.exit(1);
}

console.log('  Bloco delimitado: linhas ' + (linhaInicio + 1) + ' a ' + (linhaFim + 1));

// ---- 2) Mostra preview ----
console.log('  Preview do bloco atual:');
linhas.slice(linhaInicio, Math.min(linhaInicio + 5, linhaFim + 1)).forEach(function(l, i) {
  console.log('    ' + (linhaInicio + i + 1) + ': ' + l.substring(0, 80));
});
console.log('    ...');
linhas.slice(Math.max(linhaInicio, linhaFim - 2), linhaFim + 1).forEach(function(l, i) {
  console.log('    ' + (linhaFim - 2 + i + 1) + ': ' + l.substring(0, 80));
});
console.log('');

// ---- 3) Bloco NOVO (sem acentos, para evitar problemas de encoding) ----
const NOVO = [
'        <div class="filtros-bar">',
'          <div class="filtros-grid">',
'            <div class="filtro-item">',
'              <label for="select-mes-lancamentos">Mes</label>',
'              <select class="select-mes-global" id="select-mes-lancamentos"></select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-periodo">Periodo</label>',
'              <select id="lanc-filtro-periodo">',
'                <option value="mes">Mes atual</option>',
'                <option value="30">Ultimos 30 dias</option>',
'                <option value="60">Ultimos 60 dias</option>',
'                <option value="90">Ultimos 90 dias</option>',
'                <option value="120">Ultimos 120 dias</option>',
'                <option value="tudo">Tudo (sem filtro)</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-tipo">Tipo</label>',
'              <select id="lanc-filtro-tipo">',
'                <option value="">Todos os tipos</option>',
'                <option value="Receita">Receitas</option>',
'                <option value="Despesa">Despesas</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-categoria">Categoria</label>',
'              <select id="lanc-filtro-categoria">',
'                <option value="">Todas as categorias</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-veiculo">Veiculo</label>',
'              <select id="lanc-filtro-veiculo">',
'                <option value="">Todos os veiculos</option>',
'              </select>',
'            </div>',
'          </div>',
'          <div class="filtros-acoes">',
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosLancamentos()">Limpar</button>',
'            <button class="btn-action btn-action-secondary" onclick="exportarLancamentosCSV()">CSV</button>',
'            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo</button>',
'          </div>',
'        </div>'
];

// ---- 4) Substitui ----
const resultado = linhas.slice(0, linhaInicio).concat(NOVO).concat(linhas.slice(linhaFim + 1));
let html = resultado.join('\r\n');

// ---- 5) Adiciona CSS ----
const CSS = '    /* ==== FILTROS COMPACTOS (FASE 3A / 15g) ==== */\n' +
'    .filtros-bar { background:#fff; border:1px solid var(--border); border-radius:var(--radius); padding:1rem 1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-wrap:wrap; gap:1rem; align-items:flex-end; justify-content:space-between; }\n' +
'    .filtros-grid { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:0.75rem; flex:1; min-width:0; }\n' +
'    .filtro-item { display:flex; flex-direction:column; gap:4px; min-width:0; }\n' +
'    .filtro-item label { font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; }\n' +
'    .filtro-item select, .filtro-item input { width:100%; padding:0.5rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; font-weight:600; color:#0f2a4a; background:#fff; box-sizing:border-box; cursor:pointer; }\n' +
'    .filtro-item select:focus, .filtro-item input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.15); }\n' +
'    .filtros-acoes { display:flex; gap:0.5rem; align-items:flex-end; }\n' +
'    @media (max-width: 1024px) { .filtros-grid { grid-template-columns:repeat(3, 1fr); } }\n' +
'    @media (max-width: 768px) { .filtros-bar { flex-direction:column; align-items:stretch; } .filtros-grid { grid-template-columns:1fr 1fr; } .filtros-acoes { justify-content:flex-end; } }\n';

if (!html.includes('FILTROS COMPACTOS (FASE 3A / 15g)')) {
  var idxStyle = html.indexOf('</style>', html.indexOf('</style>') + 8);
  if (idxStyle !== -1) {
    html = html.substring(0, idxStyle) + CSS + html.substring(idxStyle);
    console.log('  [OK] CSS dos filtros adicionado');
  }
}

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
console.log('  git add . && git commit -m "feat(ui): filtros compactos em Lancamentos"');
console.log('  git push origin main');
