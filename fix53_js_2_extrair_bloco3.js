const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');
const JS_DIR = path.join(process.cwd(), 'public', 'js');

console.log('[FIX_53_JS_2] Extraindo Bloco 3 (core do sistema)...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// Backup
const backup = INDEX_HTML + '.backup.fix53_js_2.' + Date.now();
fs.copyFileSync(INDEX_HTML, backup);
console.log('Backup: ' + path.basename(backup));

// Criar pasta js
if (!fs.existsSync(JS_DIR)) {
  fs.mkdirSync(JS_DIR, { recursive: true });
}

// Ler HTML
let html = fs.readFileSync(INDEX_HTML, 'utf8');

// Extrair todos os blocos <script>
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
const blocos = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  blocos.push({
    conteudo: match[1],
    match: match[0],
    index: match.index
  });
}

console.log('Blocos <script> encontrados: ' + blocos.length);

// Bloco 3 = indice 2
const bloco3 = blocos[2].conteudo;
console.log('Bloco 3: ' + Math.round(bloco3.length/1024) + ' KB');

// ============================================================
// DIVISAO POR MARCADORES
// ============================================================
// Estrategia: dividir o Bloco 3 em 6 partes por marcadores de secao
// Cada parte vai para um arquivo especifico

const secoes = {
  utils: '',
  app: '',
  dashboard: '',
  cadastros: '',
  financeiro: '',
  admin: '',
  backup: ''
};

// Marcadores conhecidos no Bloco 3
const MARCADORES = [
  { padrao: /FASE_10_FIX_LOGIN/, destino: 'app' },
  { padrao: /const INITIAL_MONTHS/, destino: 'app' },
  { padrao: /function isMesFechado/, destino: 'app' },
  { padrao: /function exportTableToCSV/, destino: 'utils' },
  { padrao: /function formatBRL/, destino: 'utils' },
  { padrao: /function getMonthYearKey/, destino: 'utils' },
  { padrao: /function applyPermissions/, destino: 'app' },
  { padrao: /async function executarLoginNaNuvem/, destino: 'app' },
  { padrao: /function fazerLogout/, destino: 'app' },
  { padrao: /function populateMonthSelectors/, destino: 'app' },
  { padrao: /async function loadDashboardData/, destino: 'dashboard' },
  { padrao: /async function loadCadastrosDaAPI/, destino: 'cadastros' },
  { padrao: /async function loadAcoplamentosDaAPI/, destino: 'cadastros' },
  { padrao: /async function loadKmDaAPI/, destino: 'cadastros' },
  { padrao: /async function loadAbastecimentosDaAPI/, destino: 'cadastros' },
  { padrao: /async function loadLancamentosDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadManutencoesDaAPI/, destino: 'cadastros' },
  { padrao: /async function loadDocumentosDaAPI/, destino: 'cadastros' },
  { padrao: /function renderResumo/, destino: 'dashboard' },
  { padrao: /function renderGraficos/, destino: 'dashboard' },
  { padrao: /function renderAlertasDashboard/, destino: 'dashboard' },
  { padrao: /function renderAll/, destino: 'app' },
  { padrao: /function initApp/, destino: 'app' },
  { padrao: /async function loadUsuáriosDaAPI/, destino: 'admin' },
  { padrao: /async function loadPerfisDaAPI/, destino: 'admin' },
  { padrao: /async function loadDreDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadRankingDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadMetasDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadCategoriasDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadCentrosCustoDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadDreConsolidadaDaAPI/, destino: 'financeiro' },
  { padrao: /async function loadHistoricoDaAPI/, destino: 'financeiro' },
  { padrao: /function mostrarToast/, destino: 'utils' },
  { padrao: /function confirmarAção/, destino: 'utils' },
  { padrao: /async function carregarMinhasPermissoes/, destino: 'admin' },
];

// Ordem das funcoes no Bloco 3
// Vamos dividir por linhas e agrupar por destino

const linhas = bloco3.split('\n');
let destinoAtual = 'utils'; // default
const grupos = { utils: [], app: [], dashboard: [], cadastros: [], financeiro: [], admin: [], backup: [] };

let bufferFuncao = [];

linhas.forEach((linha, i) => {
  // Verificar se a linha inicia uma nova funcao
  let novodestino = null;
  MARCADORES.forEach(m => {
    if (m.padrao.test(linha)) {
      novodestino = m.destino;
    }
  });

  if (novodestino) {
    // Se temos buffer, salvar no destino anterior
    if (bufferFuncao.length > 0) {
      grupos[destinoAtual].push(bufferFuncao.join('\n'));
      bufferFuncao = [];
    }
    destinoAtual = novodestino;
  }

  bufferFuncao.push(linha);
});

// Ultimo buffer
if (bufferFuncao.length > 0) {
  grupos[destinoAtual].push(bufferFuncao.join('\n'));
}

// Salvar cada grupo em arquivo
const arquivosGerados = [];
Object.keys(grupos).forEach(nome => {
  if (grupos[nome].length === 0) return;
  const conteudo = grupos[nome].join('\n\n');
  const filePath = path.join(JS_DIR, nome + '.js');
  fs.writeFileSync(filePath, conteudo, 'utf8');
  arquivosGerados.push({ nome: nome + '.js', bytes: conteudo.length });
  console.log('  ' + nome + '.js: ' + Math.round(conteudo.length/1024) + ' KB');
});

// Remover o Bloco 3 do HTML
html = html.replace(blocos[2].match, '<!-- [FIX_53_JS_2] Bloco 3 extraido -->');

// Inserir <script src="..."> no final do body
const scriptTags = arquivosGerados.map(a =>
  '  <script src="/js/' + a.nome + '"></script>'
).join('\n');

html = html.replace(
  '</body>',
  '\n  <!-- [FIX_53_JS_2] Scripts modularizados -->\n' + scriptTags + '\n</body>'
);

fs.writeFileSync(INDEX_HTML, html, 'utf8');

console.log('\n[FIX_53_JS_2] Concluido!');
console.log('  Arquivos JS gerados: ' + arquivosGerados.length);
console.log('  HTML antes: ' + Math.round(bloco3.length/1024) + ' KB (Bloco 3)');
console.log('  HTML depois: ' + Math.round(html.length/1024) + ' KB');
