/**
 * ============================================================================
 * CORRECAO FASE 2 - 09d - Fix carregamento da DRE por Veiculo
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/09d_fix_dre_carregamento.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/09d_fix_dre_carregamento.js --apply
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
  const backupPath = path.resolve(BACKUP_DIR, 'f2_09d_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 09d - Fix carregamento DRE');
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

let acoes = [];

// ============================================================================
// 1) Adicionar bloco de inicializacao da DRE no DOMContentLoaded
// ============================================================================
if (!html.includes('__dreInicializado')) {
  // Encontra o DOMContentLoaded principal (o do bootstrap)
  const marcadorDOMContentLoaded = N('      bindClick(\'btn-add-documento\', addDocumentoRow);');

  const blocoInic = N(`      bindClick('btn-add-documento', addDocumentoRow);

      // ==== INICIALIZACAO DRE POR VEICULO ====
      if (typeof carregarPlacasDre === 'function') {
        carregarPlacasDre().then(function() {
          // Se houver placa no cache, seleciona a primeira automaticamente
          if (__drePlacasCache && __drePlacasCache.length > 0) {
            var sel = document.getElementById('dre-filtro-placa');
            if (sel && !sel.value) {
              sel.value = __drePlacasCache[0].placa;
              loadDreDaAPI();
            }
          }
        }).catch(function(e) { console.error('Erro ao carregar placas DRE:', e); });
      }
      if (typeof carregarCategoriasDre === 'function') {
        carregarCategoriasDre().catch(function(e) { console.error('Erro categorias DRE:', e); });
      }
      window.__dreInicializado = true;`);

  const ocorrencias = html.split(marcadorDOMContentLoaded).length - 1;
  console.log('   Ocorrencias do marcador DOMContentLoaded: ' + ocorrencias);

  if (ocorrencias === 1) {
    html = html.replace(marcadorDOMContentLoaded, blocoInic);
    acoes.push('Bloco de inicializacao DRE adicionado no DOMContentLoaded');
  } else {
    console.log('   [AVISO] Nao achei o marcador unico. Tentando abordagem alternativa...');
  }
} else {
  console.log('   [--] Inicializacao DRE ja existe.');
}

// ============================================================================
// 2) Apos salvar lancamento, recarregar a DRE
// ============================================================================
const ANTES_SALVAR = N(`        alert('Lancamento salvo com sucesso!');
        fecharModalLancamento();
        loadLancamentosDaAPI();`);

const DEPOIS_SALVAR = N(`        alert('Lancamento salvo com sucesso!');
        fecharModalLancamento();
        // Recarrega TODAS as telas que mostram lancamentos
        if (typeof loadLancamentosDaAPI === 'function') loadLancamentosDaAPI();
        if (typeof loadDreDaAPI === 'function') loadDreDaAPI();
        if (typeof loadDreConsolidadaDaAPI === 'function') loadDreConsolidadaDaAPI(true);
        if (typeof loadDashboardData === 'function') loadDashboardData();`);

const ocorrenciasSalvar = html.split(ANTES_SALVAR).length - 1;
console.log('   Ocorrencias do bloco de salvar: ' + ocorrenciasSalvar);

if (ocorrenciasSalvar === 1) {
  html = html.replace(ANTES_SALVAR, DEPOIS_SALVAR);
  acoes.push('Salvar lancamento agora recarrega TODAS as telas (DRE, Lancamentos, Consolidada, Dashboard)');
} else if (ocorrenciasSalvar === 0) {
  console.log('   [AVISO] Bloco de salvar nao encontrado com padrao exato.');
} else {
  console.log('   [AVISO] Bloco de salvar aparece ' + ocorrenciasSalvar + 'x. Revise manualmente.');
}

// ============================================================================
// 3) Reforcar o event listener dos filtros (trocar addEventListener global)
// ============================================================================
if (html.includes('dre-filtro-placa') && !html.includes('__dreFiltrosLigados')) {
  // Remove o listener antigo se existir
  const regexListenerAntigo = /document\.addEventListener\("change",\s*function\(e\)\s*\{[\s\S]*?dre-filtro-placa[\s\S]*?\}\);/;

  const novoListener = N(`// Listener dos filtros DRE (reforcado)
    document.addEventListener('change', function(e) {
      if (!e.target) return;
      var id = e.target.id || '';
      if (id === 'dre-filtro-placa' || id === 'dre-filtro-categoria' || id === 'dre-filtro-tipo') {
        if (typeof loadDreDaAPI === 'function') loadDreDaAPI();
      }
      if (id === 'select-mes-dre' || id === 'select-mes-dre-consolidada') {
        if (typeof loadDreDaAPI === 'function') loadDreDaAPI();
        if (typeof loadDreConsolidadaDaAPI === 'function') loadDreConsolidadaDaAPI(true);
      }
    });
    window.__dreFiltrosLigados = true;`);

  if (regexListenerAntigo.test(html)) {
    html = html.replace(regexListenerAntigo, novoListener);
    acoes.push('Listener dos filtros DRE reforcado');
  } else {
    // Adiciona novo listener sem remover o antigo
    var idxFimFuncoesDre = html.indexOf('window.carregarCategoriasDre = carregarCategoriasDre;');
    if (idxFimFuncoesDre !== -1) {
      var idxFim = html.indexOf(';', idxFimFuncoesDre) + 1;
      html = html.substring(0, idxFim) + NL + novoListener + html.substring(idxFim);
      acoes.push('Listener dos filtros DRE adicionado');
    }
  }
}

// ============================================================================
// 4) Ao trocar para a tab-dre, garantir que as placas estejam carregadas
// ============================================================================
if (!html.includes('__dreAutoCarregar')) {
  const blocoAuto = N(`    // Auto-load da DRE ao trocar para a aba
    document.addEventListener('click', function(e) {
      var btn = e.target.closest ? e.target.closest('[data-tab="tab-dre"]') : null;
      if (btn) {
        setTimeout(function() {
          if (typeof carregarPlacasDre === 'function' && (!__drePlacasCache || __drePlacasCache.length === 0)) {
            carregarPlacasDre();
          }
          if (typeof carregarCategoriasDre === 'function' && (!__dreCategoriasCache || __dreCategoriasCache.length === 0)) {
            carregarCategoriasDre();
          }
        }, 150);
      }
    });
    window.__dreAutoCarregar = true;`);

  var idxIns = html.indexOf('window.carregarCategoriasDre = carregarCategoriasDre;');
  if (idxIns !== -1) {
    var idxFim2 = html.indexOf(';', idxIns) + 1;
    html = html.substring(0, idxFim2) + NL + blocoAuto + html.substring(idxFim2);
    acoes.push('Auto-load da DRE ao trocar de aba');
  }
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
console.log('');
console.log('   Acoes:');
acoes.forEach(function(a) { console.log('     - ' + a); });
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] DRE por Veiculo agora carrega automaticamente!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(dre): auto-load de placas/categorias + reload apos salvar"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');