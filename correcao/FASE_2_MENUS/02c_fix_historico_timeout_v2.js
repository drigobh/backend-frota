/**
 * ============================================================================
 * CORRECAO FASE 2 - 02c v2 - Fix timeout na loadHistoricoDaAPI (via regex)
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/02c_fix_historico_timeout_v2.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/02c_fix_historico_timeout_v2.js --apply
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
  const backupPath = path.resolve(BACKUP_DIR, 'f2_02cv2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 02c v2 - Fix timeout (regex)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// --- LOCALIZA a funcao inteira via regex nao-guloso ---
// Captura: "async function loadHistoricoDaAPI() { ... }" ate o proximo
// "async function carregarFiltrosHistorico" (que vem depois)
const regex = /(\s+async function loadHistoricoDaAPI\(\) \{[\s\S]*?\n\s+\})(\s*async function carregarFiltrosHistorico)/;

const match = html.match(regex);
if (!match) {
  console.log('   [ERRO] Nao consegui localizar a funcao via regex.');
  console.log('         Verifique se a funcao ainda existe.');
  process.exit(1);
}

console.log('   Funcao encontrada (' + match[1].length + ' chars).');
console.log('');

// --- NOVA FUNCAO (versao com timeout + retry) ---
const FUNCAO_NOVA = [
'',
'    async function loadHistoricoDaAPI() {',
'      var timeline = document.getElementById("historico-timeline");',
'      if (timeline) {',
'        timeline.innerHTML = \'<div class="timeline-empty"><div style="margin-bottom:8px;">Carregando historico...</div><div style="font-size:0.75rem; color:#94a3b8;">Se o servidor estiver hibernando, pode levar ate 60s.</div></div>\';',
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
'        // Timeout de 90 segundos (Render demora a acordar)',
'        var controller = new AbortController();',
'        var timeoutId = setTimeout(function() { controller.abort(); }, 90000);',
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
'          if (timeline) timeline.innerHTML = \'<div class="timeline-empty">\' + msg + "</div>";',
'          return;',
'        }',
'        var data = await res.json();',
'        __historicoCache = (data.eventos || []);',
'        renderHistorico(data);',
'      } catch (err) {',
'        console.error("Erro ao carregar historico:", err);',
'        var mensagem = err.name === "AbortError"',
'          ? "Tempo esgotado (servidor pode estar hibernando). Tente novamente."',
'          : "Erro: " + err.message;',
'        if (timeline) {',
'          timeline.innerHTML = \'<div class="timeline-empty">\' + mensagem +',
'            \'<div style="margin-top:12px;"><button class="btn-action btn-action-primary" onclick="loadHistoricoDaAPI()">&#128260; Tentar novamente</button></div></div>\';',
'        }',
'      }',
'    }',
'',
''].join('\n');

console.log('   Nova funcao: ' + FUNCAO_NOVA.length + ' chars');
console.log('   Tamanho original do arquivo: ' + html.length);
console.log('');

if (!APLICAR) {
  console.log('   [DRY] A funcao seria substituida pela versao com timeout + retry.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

// --- SUBSTITUICAO ---
const antes = match[1];
html = html.replace(regex, FUNCAO_NOVA + '$2');

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Funcao substituida!');
console.log('   Antes: ' + antes.length + ' chars');
console.log('   Depois: ' + FUNCAO_NOVA.length + ' chars');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(historico): timeout + retry"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');