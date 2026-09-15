/**
 * ============================================================================
 * CORRECAO FASE 2 - 02c - Fix timeout/retry na loadHistoricoDaAPI
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/02c_fix_historico_timeout.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/02c_fix_historico_timeout.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// Substituicao: a funcao antiga vira nova com timeout + retry
const FUNCAO_ANTIGA = `    async function loadHistoricoDaAPI() {
      var timeline = document.getElementById("historico-timeline");
      if (timeline) timeline.innerHTML = '<div class="timeline-empty">Carregando historico...</div>';
      try {
        // Preenche os selects de filtro
        await carregarFiltrosHistorico();

        // Monta a query string com os filtros ativos
        var params = new URLSearchParams();
        var di = document.getElementById("hist-filtro-data-ini");
        var df = document.getElementById("hist-filtro-data-fim");
        var us = document.getElementById("hist-filtro-usuario");
        var tp = document.getElementById("hist-filtro-tipo");
        var md = document.getElementById("hist-filtro-modulo");
        var vc = document.getElementById("hist-filtro-veiculo");
        if (di && di.value) params.append("data_inicio", di.value);
        if (df && df.value) params.append("data_fim", df.value);
        if (us && us.value) params.append("usuario", us.value);
        if (tp && tp.value) params.append("tipo", tp.value);
        if (md && md.value) params.append("modulo", md.value);
        if (vc && vc.value) params.append("veiculo", vc.value);

        var url = "/historico" + (params.toString() ? "?" + params.toString() : "");
        var res = await apiFetch(url);
        if (!res.ok) {
          if (timeline) timeline.innerHTML = '<div class="timeline-empty">Erro ao carregar: ' + res.status + "</div>";
          return;
        }
        var data = await res.json();
        __historicoCache = (data.eventos || []);
        renderHistorico(data);
      } catch (err) {
        console.error("Erro ao carregar historico:", err);
        if (timeline) timeline.innerHTML = '<div class="timeline-empty">Erro: ' + err.message + "</div>";
      }
    }`;

const FUNCAO_NOVA = `    async function loadHistoricoDaAPI() {
      var timeline = document.getElementById("historico-timeline");
      if (timeline) {
        timeline.innerHTML = '<div class="timeline-empty"><div style="margin-bottom:8px;">Carregando historico...</div><div style="font-size:0.75rem; color:#94a3b8;">Se o servidor estiver hibernando, pode levar ate 60s.</div></div>';
      }

      // Filtros em paralelo (nao bloqueia)
      carregarFiltrosHistorico().catch(function(e) { console.warn("Filtros:", e); });

      try {
        // Monta a query string com os filtros ativos
        var params = new URLSearchParams();
        var di = document.getElementById("hist-filtro-data-ini");
        var df = document.getElementById("hist-filtro-data-fim");
        var us = document.getElementById("hist-filtro-usuario");
        var tp = document.getElementById("hist-filtro-tipo");
        var md = document.getElementById("hist-filtro-modulo");
        var vc = document.getElementById("hist-filtro-veiculo");
        if (di && di.value) params.append("data_inicio", di.value);
        if (df && df.value) params.append("data_fim", df.value);
        if (us && us.value) params.append("usuario", us.value);
        if (tp && tp.value) params.append("tipo", tp.value);
        if (md && md.value) params.append("modulo", md.value);
        if (vc && vc.value) params.append("veiculo", vc.value);

        var url = "/historico" + (params.toString() ? "?" + params.toString() : "");

        // Timeout de 90 segundos (Render pode demorar a acordar)
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 90000);

        var res;
        try {
          res = await apiFetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!res.ok) {
          var msg = res.status === 401 ? "Sessao expirada. Faca login novamente."
                  : res.status === 500 ? "Erro interno do servidor."
                  : "Erro " + res.status;
          if (timeline) timeline.innerHTML = '<div class="timeline-empty">' + msg + '</div>';
          return;
        }
        var data = await res.json();
        __historicoCache = (data.eventos || []);
        renderHistorico(data);
      } catch (err) {
        console.error("Erro ao carregar historico:", err);
        var mensagem = err.name === "AbortError"
          ? "Tempo esgotado (servidor pode estar hibernando). Clique em Atualizar novamente em alguns segundos."
          : "Erro: " + err.message;
        if (timeline) {
          timeline.innerHTML = '<div class="timeline-empty">' + mensagem +
            '<div style="margin-top:12px;"><button class="btn-action btn-action-primary" onclick="loadHistoricoDaAPI()">&#128260; Tentar novamente</button></div></div>';
        }
      }
    }`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_02c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 02c - Fix timeout loadHistoricoDaAPI');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');

// Detecta quebra de linha
const NL = html.includes('\r\n') ? '\r\n' : '\n';
console.log('   Quebra de linha: ' + (NL === '\r\n' ? 'CRLF' : 'LF'));

// Normaliza para o NL detectado
const antigaNorm = FUNCAO_ANTIGA.replace(/\n/g, NL);
const novaNorm = FUNCAO_NOVA.replace(/\n/g, NL);

const ocorrencias = html.split(antigaNorm).length - 1;
console.log('   Ocorrencias da funcao antiga: ' + ocorrencias);
console.log('');

if (ocorrencias === 0) {
  console.log('   [ERRO] Funcao antiga nao encontrada. Pode ja ter sido substituida.');
  process.exit(1);
}

if (ocorrencias > 1) {
  console.log('   [ERRO] Funcao antiga aparece ' + ocorrencias + 'x. Necessario revisar manualmente.');
  process.exit(1);
}

html = html.replace(antigaNorm, novaNorm);

console.log('   Tamanho original: ' + (html.length - novaNorm.length + antigaNorm.length) + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Funcao loadHistoricoDaAPI seria substituida por versao com timeout + retry.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Funcao substituida!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(historico): timeout + retry na loadHistoricoDaAPI"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');