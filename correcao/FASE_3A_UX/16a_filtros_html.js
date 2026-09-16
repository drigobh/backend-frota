const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_16a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 16a - Recriar filtros de Lancamentos');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');
const NL = '\n';

// Localiza o bloco: <div class="filtros-bar"> ate o </div> do fechamento
let inicio = -1;
let fim = -1;

for (let i = 0; i < linhas.length; i++) {
  if (inicio === -1 && linhas[i].indexOf('class="filtros-bar"') !== -1) {
    inicio = i;
  }
  if (inicio !== -1 && fim === -1 && linhas[i].indexOf('kpi-row') !== -1) {
    // O bloco termina na linha imediatamente anterior (linha vazia)
    fim = i - 2;
    break;
  }
}

if (inicio === -1 || fim === -1) {
  console.log('  [ERRO] Nao consegui delimitar o bloco de filtros.');
  console.log('  inicio=' + inicio + ' fim=' + fim);
  process.exit(1);
}

console.log('  Bloco delimitado: linhas ' + (inicio + 1) + ' a ' + (fim + 1));

// Novo bloco de filtros
const NOVO = [
'        <div class="filtros-bar">',
'          <div class="filtros-grid">',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-periodo">Período</label>',
'              <select id="lanc-filtro-periodo">',
'                <option value="">---------</option>',
'                <option value="7">Últimos 7 dias</option>',
'                <option value="15">Últimos 15 dias</option>',
'                <option value="45">Últimos 45 dias</option>',
'                <option value="60">Últimos 60 dias</option>',
'                <option value="90">Últimos 90 dias</option>',
'                <option value="120">Últimos 120 dias</option>',
'                <option value="tudo">Tudo (todos os meses)</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-ano">Ano</label>',
'              <select id="lanc-filtro-ano">',
'                <option value="">---------</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-mes">Mês</label>',
'              <select id="lanc-filtro-mes">',
'                <option value="">---------</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-tipo">Tipo</label>',
'              <select id="lanc-filtro-tipo">',
'                <option value="">---------</option>',
'                <option value="Receita">Receitas</option>',
'                <option value="Despesa">Despesas</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-categoria">Categoria</label>',
'              <select id="lanc-filtro-categoria">',
'                <option value="">---------</option>',
'              </select>',
'            </div>',
'            <div class="filtro-item">',
'              <label for="lanc-filtro-veiculo">Veículo</label>',
'              <select id="lanc-filtro-veiculo">',
'                <option value="">---------</option>',
'              </select>',
'            </div>',
'          </div>',
'          <div class="filtros-acoes">',
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosLancamentos()">Limpar</button>',
'            <button class="btn-action btn-action-secondary" onclick="exportarLancamentosCSV()">&#11015;&#65039; CSV</button>',
'            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo</button>',
'          </div>',
'        </div>'
];

// Aplica
const resultado = linhas.slice(0, inicio).concat(NOVO).concat(linhas.slice(fim + 1));
let html = resultado.join('\r\n');

// ---- Ajusta o CSS para 6 colunas ----
html = html.replace(
  'grid-template-columns:repeat(5, minmax(0, 1fr))',
  'grid-template-columns:repeat(6, minmax(0, 1fr))'
);

// ---- Remove o select-mes-global antigo se existir em outros lugares (só na tela Lancamentos) ----
// (deixa o resto funcionar como está)

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
console.log('  [OK] Filtros recriados!');
console.log('');
console.log('  PROXIMO PASSO: aplicar o script 16b (logica JS)');
