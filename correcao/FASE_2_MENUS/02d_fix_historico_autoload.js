/**
 * ============================================================================
 * CORRECAO FASE 2 - 02d - Fix auto-load + cache + timeout curto
 * ============================================================================
 * Corrige 3 problemas:
 *   1. Adiciona onclick no botao Historico do menu (auto-load)
 *   2. Adiciona cache em memoria (2a visita instantanea)
 *   3. Reduz timeout de 90s -> 30s
 *
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/02d_fix_historico_autoload.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/02d_fix_historico_autoload.js --apply
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
  const backupPath = path.resolve(BACKUP_DIR, 'f2_02d_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 02d - Fix auto-load Historico');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;

// ---------------------------------------------------------------------------
// 1) Adicionar onclick no botao Historico do menu
// ---------------------------------------------------------------------------
const BOTAO_ANTIGO = '<button class="nav-tab-btn" data-tab="tab-historico"><span>&#128220;</span><span class="nav-label">Historico</span></button>';
const BOTAO_NOVO = '<button class="nav-tab-btn" data-tab="tab-historico" onclick="setTimeout(loadHistoricoDaAPI, 150)"><span>&#128220;</span><span class="nav-label">Historico</span></button>';

if (html.includes(BOTAO_ANTIGO)) {
  html = html.replace(BOTAO_ANTIGO, BOTAO_NOVO);
  console.log('   [OK] onclick adicionado no botao Historico do menu.');
} else if (html.includes('onclick="setTimeout(loadHistoricoDaAPI')) {
  console.log('   [--] Botao Historico ja tem onclick.');
} else {
  console.log('   [AVISO] Botao Historico nao encontrado com padrao exato.');
  console.log('           Pulando etapa 1.');
}

// ---------------------------------------------------------------------------
// 2) Substituir a funcao loadHistoricoDaAPI por versao com cache + timeout curto
// ---------------------------------------------------------------------------
const regex = /(\s+async function loadHistoricoDaAPI\(\) \{[\s\S]*?\n\s+\})(\s*async function carregarFiltrosHistorico)/;

const match = html.match(regex);
if (!match) {
  console.log('   [ERRO] Funcao loadHistoricoDaAPI nao encontrada via regex.');
  process.exit(1);
}

const NOVA_FUNCAO = [
'',
'    async function loadHistoricoDaAPI(forceRefresh) {',
'      var timeline = document.getElementById("historico-timeline");',
'',
'      // Cache em memoria: se ja temos dados e nao forcou refresh, renderiza direto',
'      if (!forceRefresh && __historicoCache && __historicoCache.length > 0) {',
'        renderHistorico({ total: __historicoCache.length, porTipo: __historicoUltimoPorTipo || {}, eventos: __historicoCache });',
'        // Atualiza em background sem travar a UI',
'        setTimeout(function() { loadHistoricoDaAPI(true); }, 500);',
'        return;',
'      }',
'',
'      if (timeline && !forceRefresh) {',
'        timeline.innerHTML = \'<div class="timeline-empty"><div style="margin-bottom:8px;">Carregando historico...</div><div style="font-size:0.75rem; color:#94a3b8;">Consultando servidor...</div></div>\';',
'      }',
'',
'      // Filtros em paralelo (nao bloqueia)',
'      carregarFiltrosHistorico().catch(function(e) { console.warn("Filtros:", e); });',
'',
'      try {',
'        var params = new URLSearchParams();',
'        var di = document.getElementById("hist-filtro-data-ini");',
'        var df = document.getElementById("hist-filtro-data-fim");',
'        var us = document.getElementById("hist-filtro-usuario");',
'        var tp = document.getElementById("hist-filtro-tipo");',
'        var md = document.getElementById("hist-filtro-modulo");',
'        var vc = document.getElementById("hist-filtro-veiculo");',
'        if (di && di.value) params.append("data_inicio", di.value);',
'        if (df && df.value) params.append("data_fim", df.value);',
'        if (us && us.value) params.append("usuario", us.value);',
'        if (tp && tp.value) params.append("tipo", tp.value);',
'        if (md && md.value) params.append("modulo", md.value);',
'        if (vc && vc.value) params.append("veiculo", vc.value);',
'',
'        var url = "/historico" + (params.toString() ? "?" + params.toString() : "");',
'',
'        // Timeout curto de 30s (se nao respondeu, provavelmente travou)',
'        var controller = new AbortController();',
'        var timeoutId = setTimeout(function() { controller.abort(); }, 30000);',
'',
'        var res;',
'        try {',
'          res = await apiFetch(url, { signal: controller.signal });',
'        } finally {',
'          clearTimeout(timeoutId);',
'        }',
'',
'        if (!res.ok) {',
'          var msg = res.status === 401 ? "Sessao expirada. Faca login novamente."',
'                  : res.status === 500 ? "Erro interno do servidor."',
'                  : "Erro " + res.status;',
'          if (timeline) timeline.innerHTML = \'<div class="timeline-empty">\' + msg + \'<div style="margin-top:12px;"><button class="btn-action btn-action-primary" onclick="loadHistoricoDaAPI(true)">&#128260; Tentar novamente</button></div></div>\';',
'          return;',
'        }',
'        var data = await res.json();',
'        __historicoCache = (data.eventos || []);',
'        __historicoUltimoPorTipo = data.porTipo || {};',
'        renderHistorico(data);',
'      } catch (err) {',
'        console.error("Erro ao carregar historico:", err);',
'        var mensagem = err.name === "AbortError"',
'          ? "Tempo esgotado. O servidor pode estar ocupado. Tente novamente."',
'          : "Erro: " + err.message;',
'        if (timeline) {',
'          timeline.innerHTML = \'<div class="timeline-empty">\' + mensagem +',
'            \'<div style="margin-top:12px;"><button class="btn-action btn-action-primary" onclick="loadHistoricoDaAPI(true)">&#128260; Tentar novamente</button></div></div>\';',
'        }',
'      }',
'    }',
'',
''].join('\n');

html = html.replace(regex, NOVA_FUNCAO + '$2');
console.log('   [OK] loadHistoricoDaAPI substituida (cache + timeout 30s).');

// ---------------------------------------------------------------------------
// 3) Adicionar variavel de cache por tipo
// ---------------------------------------------------------------------------
if (!html.includes('__historicoUltimoPorTipo')) {
  html = html.replace(
    'var __historicoCache = [];',
    'var __historicoCache = [];\n    var __historicoUltimoPorTipo = null;'
  );
  console.log('   [OK] Variavel __historicoUltimoPorTipo adicionada.');
}

// ---------------------------------------------------------------------------
// 4) Marcar "force" nos botoes Atualizar e Filtrar
// ---------------------------------------------------------------------------
const BOTAO_ATUALIZAR_ANTIGO = 'onclick="loadHistoricoDaAPI()"';
const BOTAO_ATUALIZAR_NOVO = 'onclick="loadHistoricoDaAPI(true)"';

const ocorrencias = html.split(BOTAO_ATUALIZAR_ANTIGO).length - 1;
if (ocorrencias > 0) {
  html = html.split(BOTAO_ATUALIZAR_ANTIGO).join(BOTAO_ATUALIZAR_NOVO);
  console.log('   [OK] ' + ocorrencias + ' botao(oes) Atualizar/Filtrar marcados para forcar refresh.');
}

// ---------------------------------------------------------------------------
// 5) Verificacoes finais
// ---------------------------------------------------------------------------
if (!html.includes('__historicoUltimoPorTipo')) {
  console.log('   [ERRO] Falha na injecao da variavel de cache.');
  process.exit(1);
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
console.log('   [OK] Historico corrigido!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(historico): auto-load + cache + timeout 30s"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');