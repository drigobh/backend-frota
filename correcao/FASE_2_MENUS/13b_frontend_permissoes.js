/**
 * ============================================================================
 * CORRECAO FASE 2 - 13b - Frontend: aplicar permissoes na UI
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

// Mapa: ID da tab -> permissao necessaria para ver
const MAPA_PERMISSOES = {
  'tab-dashboard': 'dashboard.visualizar',
  'tab-cadastro': 'veiculos.visualizar',
  'tab-acoplamento': 'acoplamentos.visualizar',
  'tab-km': 'km.visualizar',
  'tab-abastecimentos': 'abastecimentos.visualizar',
  'tab-manutencoes': 'manutencoes.visualizar',
  'tab-documentos': 'manutencoes.visualizar',
  'tab-historico': 'historico.visualizar',
  'tab-lancamentos': 'lancamentos.visualizar',
  'tab-dre': 'dre.visualizar',
  'tab-dre-consolidada': 'dre.consolidada.visualizar',
  'tab-categorias': 'categorias.visualizar',
  'tab-centros-custo': 'centros_custo.visualizar',
  'tab-resumo': 'resumo.visualizar',
  'tab-graficos': 'graficos.visualizar',
  'tab-ranking': 'ranking.visualizar',
  'tab-metas': 'metas.visualizar',
  'tab-usuarios': 'usuarios.visualizar',
  'tab-perfis': 'perfis.visualizar',
  'tab-auditoria': 'auditoria.visualizar',
};

const FUNCOES = [
'',
'    // ==== PERMISSOES NA UI ====',
'    var __minhasPermissoes = [];',
'    var __souAdmin = false;',
'',
'    async function carregarMinhasPermissoes() {',
'      try {',
'        var res = await apiFetch("/me/permissoes");',
'        if (!res.ok) return;',
'        var data = await res.json();',
'        __minhasPermissoes = data.permissoes || [];',
'        __souAdmin = !!data.administrador;',
'        aplicarPermissoesNaUI();',
'      } catch (e) { console.error("Erro permissoes:", e); }',
'    }',
'',
'    function temPermissao(chave) {',
'      if (__souAdmin) return true;',
'      return __minhasPermissoes.indexOf(chave) !== -1;',
'    }',
'',
'    function aplicarPermissoesNaUI() {',
'      if (__souAdmin) return;',
'',
'      // 1) Esconde BOTOES do menu lateral com base nas permissoes',
'      var mapa = ' + JSON.stringify(MAPA_PERMISSOES) + ';',
'      Object.keys(mapa).forEach(function(tabId) {',
'        var perm = mapa[tabId];',
'        var btns = document.querySelectorAll(\'[data-tab="\' + tabId + \'"]\');',
'        btns.forEach(function(btn) {',
'          if (!temPermissao(perm)) {',
'            btn.style.display = "none";',
'          }',
'        });',
'      });',
'',
'      // 2) Esconde BOTOES de acao (criar/editar/excluir)',
'      var acoes = [',
'        { id: "btn-add-cavalo", perm: "veiculos.criar" },',
'        { id: "btn-add-carreta", perm: "carretas.criar" },',
'        { id: "btn-add-motorista", perm: "motoristas.criar" },',
'        { id: "btn-add-acoplamento", perm: "acoplamentos.criar" },',
'        { id: "btn-add-abastecimento", perm: "abastecimentos.criar" },',
'        { id: "btn-add-lancamento", perm: "lancamentos.criar" },',
'        { id: "btn-add-manutencao", perm: "manutencoes.criar" },',
'        { id: "btn-add-documento", perm: "manutencoes.criar" },',
'        { id: "btn-add-usuario", perm: "usuarios.criar" },',
'        { id: "btn-add-perfil", perm: "perfis.criar" },',
'      ];',
'      acoes.forEach(function(a) {',
'        var el = document.getElementById(a.id);',
'        if (el && !temPermissao(a.perm)) el.style.display = "none";',
'      });',
'',
'      // 3) Se estiver numa tab sem permissao, redireciona para Dashboard',
'      var tabs = document.querySelectorAll(".tab-content");',
'      tabs.forEach(function(tab) {',
'        var perm = mapa[tab.id];',
'        if (perm && !temPermissao(perm)) {',
'          tab.style.display = "none";',
'        }',
'      });',
'    }',
'',
'    // Intercepta cliques em tabs proibidas',
'    document.addEventListener("click", function(e) {',
'      var btn = e.target.closest ? e.target.closest("[data-tab]") : null;',
'      if (!btn || __souAdmin) return;',
'      var tabId = btn.getAttribute("data-tab");',
'      var perm = ' + JSON.stringify(MAPA_PERMISSOES) + '[tabId];',
'      if (perm && !temPermissao(perm)) {',
'        e.preventDefault();',
'        e.stopPropagation();',
'        alert("Voce nao tem permissao para acessar: " + tabId.replace("tab-", ""));',
'      }',
'    }, true);',
'',
'    window.carregarMinhasPermissoes = carregarMinhasPermissoes;',
'    window.temPermissao = temPermissao;',
''].join('\n');

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_13b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 13b - Frontend Permissoes');
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

// ---- 1) Substitui a funcao initApp para carregar permissoes ----
const INIT_ANTES = N(`    function initApp() {
      populateMonthSelectors();
      applyPermissions();
      loadCadastrosDaAPI().then(() => {`);

const INIT_DEPOIS = N(`    function initApp() {
      populateMonthSelectors();
      applyPermissions();
      if (typeof carregarMinhasPermissoes === "function") {
        carregarMinhasPermissoes();
      }
      loadCadastrosDaAPI().then(() => {`);

let ok = 0;

if (html.includes(INIT_ANTES)) {
  html = html.replace(INIT_ANTES, INIT_DEPOIS);
  console.log('   [OK] initApp atualizada para carregar permissoes.');
  ok++;
} else {
  console.log('   [--] initApp ja atualizada ou padrao diferente.');
}

// ---- 2) Adiciona as funcoes no bloco principal ----
if (!html.includes('carregarMinhasPermissoes = carregarMinhasPermissoes')) {
  var idxMarc = html.indexOf('window.imprimirMetas = imprimirMetas;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.imprimirCategorias = imprimirCategorias;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.carregarCategoriasDre = carregarCategoriasDre;');

  if (idxMarc !== -1) {
    var idxFim = html.indexOf(';', idxMarc) + 1;
    html = html.substring(0, idxFim) + NL + N(FUNCOES) + html.substring(idxFim);
    console.log('   [OK] Funcoes de permissoes adicionadas.');
    ok++;
  } else {
    console.log('   [ERRO] Nao achei marcador para injetar funcoes.');
    process.exit(1);
  }
} else {
  console.log('   [--] Funcoes ja existem.');
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Permissoes na UI instaladas!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(permissoes): aplicar permissoes na UI"');
console.log('  2. git push origin main');
console.log('  3. Testar no Render com usuarios diferentes');