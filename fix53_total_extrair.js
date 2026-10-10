const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');
const JS_DIR = path.join(process.cwd(), 'public', 'js');

console.log('[FIX_53_TOTAL] Extraindo TODOS os blocos <script>...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// Backup
const backup = INDEX_HTML + '.backup.fix53_total.' + Date.now();
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
    index: match.index,
    tamanho: match[1].length
  });
}

console.log('Blocos <script> encontrados: ' + blocos.length);

// ============================================================
// MAPA COMPLETO: indice (1-based) -> arquivo destino
// ============================================================
const MAPA = {
  1: 'utils.js',      // Blindagem global
  // 2 = vazio (ignorar)
  3: 'CORE',          // Bloco 3 (sera dividido em varios)
  // 4 = app (funcao anonima)
  4: 'app.js',
  5: 'utils.js',      // Modo escuro
  6: 'utils.js',      // Skeleton
  7: 'utils.js',      // Filtros
  8: 'pdf.js',        // Export PDF (FASE_3D_PDF_JS_V2)
  9: 'pwa.js',        // Service Worker
  10: 'pwa.js',       // PWA
  11: 'pwa.js',       // PWA
  12: 'pwa.js',       // Ajuda instalar
  13: 'admin.js',     // Configuracoes
  14: 'utils.js',     // Email suporte
  15: 'admin.js',     // Atualizar App
  16: 'utils.js',     // Versao sistema
  17: 'login.js',     // Toggle senha
  18: 'login.js',     // Recuperar senha
  19: 'login.js',     // Validador email
  20: 'pdf.js',       // Relatorios PDF (FASE_8_DROPDOWN)
  21: 'dashboard.js', // Listener Resumo
  22: 'financeiro.js',// Carrega lancamentos
  23: 'backup.js',    // Backup
  24: 'backup.js',    // Restore
  25: 'utils.js',     // Versao dinamica
  26: 'utils.js',     // Sessao info
  27: 'utils.js',     // Sessao ajuda
  28: 'login.js',     // Loading login
  29: 'admin.js',     // Auditoria
  30: 'modais.js'     // Modais (Trocar Senha, 2FA)
};

// ============================================================
// DIVISAO DO BLOCO 3
// ============================================================
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

function dividirBloco3(bloco3) {
  const linhas = bloco3.split('\n');
  let destinoAtual = 'utils';
  const grupos = { utils: [], app: [], dashboard: [], cadastros: [], financeiro: [], admin: [], backup: [] };
  let buffer = [];

  linhas.forEach(linha => {
    let novo = null;
    MARCADORES.forEach(m => { if (m.padrao.test(linha)) novo = m.destino; });
    if (novo) {
      if (buffer.length > 0) {
        grupos[destinoAtual].push(buffer.join('\n'));
        buffer = [];
      }
      destinoAtual = novo;
    }
    buffer.push(linha);
  });
  if (buffer.length > 0) grupos[destinoAtual].push(buffer.join('\n'));
  return grupos;
}

// ============================================================
// AGRUPAR POR ARQUIVO
// ============================================================
const arquivos = {};

blocos.forEach((b, i) => {
  const idx = i + 1;
  const destino = MAPA[idx];
  if (!destino) return; // bloco 2 (vazio)

  if (destino === 'CORE') {
    // Bloco 3: dividir
    const grupos = dividirBloco3(b.conteudo);
    Object.keys(grupos).forEach(nome => {
      if (grupos[nome].length === 0) return;
      if (!arquivos[nome + '.js']) arquivos[nome + '.js'] = [];
      arquivos[nome + '.js'].push(grupos[nome].join('\n\n'));
    });
  } else {
    if (!arquivos[destino]) arquivos[destino] = [];
    arquivos[destino].push(b.conteudo.trim());
  }
});

// ============================================================
// SALVAR ARQUIVOS
// ============================================================
const arquivosGerados = [];
Object.keys(arquivos).forEach(nome => {
  const conteudo = '// [FIX_53_TOTAL] ' + nome + '\n' + arquivos[nome].join('\n\n');
  fs.writeFileSync(path.join(JS_DIR, nome), conteudo, 'utf8');
  arquivosGerados.push({ nome: nome, bytes: conteudo.length });
  console.log('  ' + nome + ': ' + Math.round(conteudo.length/1024) + ' KB');
});

// ============================================================
// REMOVER TODOS OS BLOCOS DO HTML
// ============================================================
blocos.forEach((b, i) => {
  const idx = i + 1;
  if (!MAPA[idx]) return;
  html = html.replace(b.match, '<!-- [FIX_53_TOTAL] Bloco ' + idx + ' extraido -->');
});

// ============================================================
// INSERIR <script src="..."> NA ORDEM CORRETA
// ============================================================
const ORDEM = [
  'utils.js',
  'app.js',
  'dashboard.js',
  'cadastros.js',
  'financeiro.js',
  'admin.js',
  'backup.js',
  'pdf.js',
  'pwa.js',
  'login.js',
  'modais.js'
];

const scriptTags = ORDEM
  .filter(nome => arquivos[nome])
  .map(nome => '  <script src="/js/' + nome + '"></script>')
  .join('\n');

html = html.replace(
  '</body>',
  '\n  <!-- [FIX_53_TOTAL] Scripts modularizados -->\n' + scriptTags + '\n</body>'
);

fs.writeFileSync(INDEX_HTML, html, 'utf8');

console.log('\n[FIX_53_TOTAL] Concluido!');
console.log('  Arquivos JS gerados: ' + arquivosGerados.length);
console.log('  HTML antes: ' + Math.round(536 * 1024 / 1024) + ' KB');
console.log('  HTML depois: ' + Math.round(html.length/1024) + ' KB');
console.log('  Reducao: ' + Math.round((1 - html.length/(536*1024))*100) + '%');
