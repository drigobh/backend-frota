const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');
const JS_DIR = path.join(process.cwd(), 'public', 'js');

console.log('[FIX_53_FINAL] Extraindo APENAS blocos independentes...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// Backup
const backup = INDEX_HTML + '.backup.fix53_final.' + Date.now();
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

// ============================================================
// MAPA: APENAS blocos INDEPENDENTES
// ============================================================
// Blocos 2, 3, 4, 20, 21, 22, 23, 24 -> MANTIDOS no index.html
// (porque dependem do Bloco 3 ou sao o proprio Bloco 3)
const MAPA = {
  1: 'utils.js',       // Blindagem global
  // 2 = vazio (ignorar)
  // 3 = MANTIDO no index.html (core do sistema)
  // 4 = MANTIDO no index.html (funcao anonima)
  5: 'utils.js',       // Modo escuro
  6: 'utils.js',       // Skeleton
  7: 'utils.js',       // Filtros
  8: 'pdf.js',         // PDF export
  9: 'pwa.js',         // Service Worker
  10: 'pwa.js',        // PWA
  11: 'pwa.js',        // PWA
  12: 'pwa.js',        // Ajuda instalar
  13: 'admin.js',      // Configuracoes
  14: 'utils.js',      // Email suporte
  15: 'admin.js',      // Atualizar App
  16: 'utils.js',      // Versao sistema
  17: 'login.js',      // Toggle senha
  18: 'login.js',      // Recuperar senha
  19: 'login.js',      // Validador email
  // 20 = MANTIDO no index.html (relatorios PDF, depende do core)
  // 21 = MANTIDO no index.html (listener Resumo, depende do core)
  // 22 = MANTIDO no index.html (carrega lancamentos, depende do core)
  // 23 = MANTIDO no index.html (backup, depende do core)
  // 24 = MANTIDO no index.html (restore, depende do core)
  25: 'utils.js',      // Versao dinamica
  26: 'utils.js',      // Sessao info
  27: 'utils.js',      // Sessao ajuda
  28: 'login.js',      // Loading login
  29: 'admin.js',      // Auditoria
  30: 'modais.js'      // Modais (Trocar Senha, 2FA)
};

// Agrupar por arquivo
const arquivos = {};

blocos.forEach((b, i) => {
  const idx = i + 1;
  const destino = MAPA[idx];
  if (!destino) return;
  if (!arquivos[destino]) arquivos[destino] = [];
  arquivos[destino].push(b.conteudo.trim());
});

// Salvar arquivos
const arquivosGerados = [];
Object.keys(arquivos).forEach(nome => {
  const conteudo = '// [FIX_53_FINAL] ' + nome + '\n' + arquivos[nome].join('\n\n');
  fs.writeFileSync(path.join(JS_DIR, nome), conteudo, 'utf8');
  arquivosGerados.push({ nome: nome, bytes: conteudo.length });
  console.log('  ' + nome + ': ' + Math.round(conteudo.length/1024) + ' KB');
});

// Remover APENAS os blocos extraidos do HTML
blocos.forEach((b, i) => {
  const idx = i + 1;
  if (!MAPA[idx]) return;
  html = html.replace(b.match, '<!-- [FIX_53_FINAL] Bloco ' + idx + ' extraido -->');
});

// Inserir <script src="..."> no final do body (ANTES do Bloco 3)
const ORDEM = [
  'utils.js',
  'pdf.js',
  'pwa.js',
  'admin.js',
  'login.js',
  'modais.js'
];

const scriptTags = ORDEM
  .filter(nome => arquivos[nome])
  .map(nome => '  <script src="/js/' + nome + '"></script>')
  .join('\n');

// Inserir ANTES do Bloco 3 (que ficou no HTML)
html = html.replace(
  '<script>\n    // @ts-nocheck\n    // FASE_10_FIX_LOGIN',
  scriptTags + '\n  <script>\n    // @ts-nocheck\n    // FASE_10_FIX_LOGIN'
);

fs.writeFileSync(INDEX_HTML, html, 'utf8');

console.log('\n[FIX_53_FINAL] Concluido!');
console.log('  Arquivos JS gerados: ' + arquivosGerados.length);
console.log('  HTML antes: 536 KB');
console.log('  HTML depois: ' + Math.round(html.length/1024) + ' KB');
console.log('  Reducao: ' + Math.round((1 - html.length/(536*1024))*100) + '%');
