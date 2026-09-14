/**
 * ============================================================================
 * CORRECAO FASE 2 - 02b - Frontend da tela Historico (timeline + filtros)
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/02b_frontend_historico.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/02b_frontend_historico.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 1) CSS DA TIMELINE
// ---------------------------------------------------------------------------
const CSS_TIMELINE = [
'',
'    /* ==== TIMELINE DE HISTORICO ==== */',
'    .historico-filtros { background:#fff; border:1px solid var(--border); border-radius:var(--radius); padding:1rem 1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); }',
'    .historico-filtros-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:0.75rem; align-items:end; }',
'    .historico-filtro-item label { display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:4px; }',
'    .historico-filtro-item input, .historico-filtro-item select { width:100%; padding:0.5rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; background:#fff; }',
'    .historico-filtro-item input:focus, .historico-filtro-item select:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.15); }',
'    .historico-acoes { display:flex; gap:0.5rem; }',
'    .timeline { position:relative; padding-left:1.5rem; }',
'    .timeline::before { content:""; position:absolute; left:8px; top:0; bottom:0; width:2px; background:linear-gradient(180deg, #2563eb 0%, #cbd5e1 100%); border-radius:2px; }',
'    .timeline-dia { font-size:0.85rem; font-weight:700; color:#0f2a4a; margin:1.5rem 0 0.75rem; padding-left:0.5rem; }',
'    .timeline-dia:first-child { margin-top:0; }',
'    .timeline-item { position:relative; background:#fff; border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem; margin-bottom:0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:all 0.15s; }',
'    .timeline-item:hover { box-shadow:0 3px 12px rgba(0,0,0,0.10); transform:translateX(2px); }',
'    .timeline-item::before { content:""; position:absolute; left:-1.15rem; top:1rem; width:12px; height:12px; border-radius:50%; background:#2563eb; border:2px solid #fff; box-shadow:0 0 0 2px #2563eb; }',
'    .timeline-item.cat-cadastro::before { background:#059669; box-shadow:0 0 0 2px #059669; }',
'    .timeline-item.cat-operacao::before { background:#f59e0b; box-shadow:0 0 0 2px #f59e0b; }',
'    .timeline-item.cat-financeiro::before { background:#8b5cf6; box-shadow:0 0 0 2px #8b5cf6; }',
'    .timeline-item.cat-administracao::before { background:#dc2626; box-shadow:0 0 0 2px #dc2626; }',
'    .timeline-item.cat-sistema::before { background:#64748b; box-shadow:0 0 0 2px #64748b; }',
'    .timeline-hora { font-family:monospace; font-size:0.75rem; color:#64748b; font-weight:600; }',
'    .timeline-acao { font-weight:700; font-size:0.9rem; color:#0f2a4a; margin-left:0.5rem; }',
'    .timeline-meta { display:flex; flex-wrap:wrap; gap:0.5rem 1rem; font-size:0.8rem; color:#475569; margin-top:0.35rem; }',
'    .timeline-detalhe { font-size:0.85rem; color:#334155; margin-top:0.4rem; padding-top:0.4rem; border-top:1px dashed #e2e8f0; }',
'    .timeline-badge { display:inline-block; padding:1px 8px; border-radius:10px; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; }',
'    .badge-cadastro { background:#d1fae5; color:#065f46; }',
'    .badge-operacao { background:#fef3c7; color:#92400e; }',
'    .badge-financeiro { background:#ede9fe; color:#6d28d9; }',
'    .badge-administracao { background:#fee2e2; color:#991b1b; }',
'    .badge-sistema { background:#f1f5f9; color:#475569; }',
'    .badge-outro { background:#f1f5f9; color:#64748b; }',
'    .timeline-empty { text-align:center; padding:3rem 1rem; color:#64748b; background:#fff; border:1px dashed #cbd5e1; border-radius:8px; }',
'    .timeline-resumo { display:flex; gap:1rem; flex-wrap:wrap; padding:0.75rem 1rem; background:#f8fafc; border-radius:8px; margin-bottom:1rem; font-size:0.82rem; }',
'    .timeline-resumo-item { display:flex; align-items:center; gap:0.4rem; }',
'    .timeline-resumo-dot { width:10px; height:10px; border-radius:50%; }',
''].join('\n');

// ---------------------------------------------------------------------------
// 2) SECAO HTML #tab-historico
// ---------------------------------------------------------------------------
const SECAO_HISTORICO = [
'      <!-- TAB: HISTORICO -->',
'      <section id="tab-historico" class="tab-content">',
'        <div class="bar-controls">',
'          <div class="bar-controls-left">',
'            <span class="label-month-select">Historico de Atividades:</span>',
'          </div>',
'          <div class="bar-controls-right">',
'            <button class="btn-action btn-action-secondary" onclick="exportarHistoricoCSV()">&#11015;&#65039; Exportar CSV</button>',
'            <button class="btn-action btn-action-primary" onclick="loadHistoricoDaAPI()">&#128260; Atualizar</button>',
'          </div>',
'        </div>',
'',
'        <div class="historico-filtros">',
'          <div class="historico-filtros-grid">',
'            <div class="historico-filtro-item">',
'              <label for="hist-filtro-data-ini">Data Inicio</label>',
'              <input type="date" id="hist-filtro-data-ini">',
'            </div>',
'            <div class="historico-filtro-item">',
'              <label for="hist-filtro-data-fim">Data Fim</label>',
'              <input type="date" id="hist-filtro-data-fim">',
'            </div>',
'            <div class="historico-filtro-item">',
'              <label for="hist-filtro-usuario">Usuario</label>',
'              <select id="hist-filtro-usuario"><option value="">Todos</option></select>',
'            </div>',
'            <div class="historico-filtro-item">',
'              <label for="hist-filtro-tipo">Tipo de Acao</label>',
'              <input type="text" id="hist-filtro-tipo" placeholder="Ex: CRIAR, EDITAR">',
'            </div>',
'            <div class="historico-filtro-item">',
'              <label for="hist-filtro-modulo">Modulo</label>',
'              <select id="hist-filtro-modulo"><option value="">Todos</option></select>',
'            </div>',
'            <div class="historico-filtro-item">',
'              <label for="hist-filtro-veiculo">Veiculo / Texto</label>',
'              <input type="text" id="hist-filtro-veiculo" placeholder="Ex: ABC1234">',
'            </div>',
'            <div class="historico-filtro-item historico-acoes">',
'              <button class="btn-action btn-action-secondary" onclick="limparFiltrosHistorico()">Limpar</button>',
'              <button class="btn-action btn-action-primary" onclick="aplicarFiltrosHistorico()">&#128269; Filtrar</button>',
'            </div>',
'          </div>',
'        </div>',
'',
'        <div class="section-title-wrap">',
'          <h2 class="section-title"><span>&#128220;</span> Linha do Tempo de Eventos</h2>',
'        </div>',
'',
'        <div class="timeline-resumo" id="historico-resumo"></div>',
'        <div class="timeline" id="historico-timeline">',
'          <div class="timeline-empty">Carregando historico...</div>',
'        </div>',
'      </section>',
''].join('\n');

// ---------------------------------------------------------------------------
// 3) FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_HISTORICO = [
'',
'    // ==== MODULO DE HISTORICO ====',
'    var __historicoCache = [];',
'',
'    async function loadHistoricoDaAPI() {',
'      var timeline = document.getElementById("historico-timeline");',
'      if (timeline) timeline.innerHTML = \'<div class="timeline-empty">Carregando historico...</div>\';',
'      try {',
'        // Preenche os selects de filtro',
'        await carregarFiltrosHistorico();',
'',
'        // Monta a query string com os filtros ativos',
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
'        var res = await apiFetch(url);',
'        if (!res.ok) {',
'          if (timeline) timeline.innerHTML = \'<div class="timeline-empty">Erro ao carregar: \' + res.status + "</div>";',
'          return;',
'        }',
'        var data = await res.json();',
'        __historicoCache = (data.eventos || []);',
'        renderHistorico(data);',
'      } catch (err) {',
'        console.error("Erro ao carregar historico:", err);',
'        if (timeline) timeline.innerHTML = \'<div class="timeline-empty">Erro: \' + err.message + "</div>";',
'      }',
'    }',
'',
'    async function carregarFiltrosHistorico() {',
'      // Usuarios',
'      var selU = document.getElementById("hist-filtro-usuario");',
'      if (selU && selU.options.length <= 1) {',
'        try {',
'          var r = await apiFetch("/historico/usuarios");',
'          if (r.ok) {',
'            var us = await r.json();',
'            us.forEach(function(u) {',
'              var o = document.createElement("option");',
'              o.value = u; o.textContent = u;',
'              selU.appendChild(o);',
'            });',
'          }',
'        } catch (e) {}',
'      }',
'      // Modulos',
'      var selM = document.getElementById("hist-filtro-modulo");',
'      if (selM && selM.options.length <= 1) {',
'        try {',
'          var r2 = await apiFetch("/historico/modulos");',
'          if (r2.ok) {',
'            var mods = await r2.json();',
'            mods.forEach(function(m) {',
'              var o = document.createElement("option");',
'              o.value = m; o.textContent = m;',
'              selM.appendChild(o);',
'            });',
'          }',
'        } catch (e) {}',
'      }',
'    }',
'',
'    function classificarEvento(modulo, tipo) {',
'      var mod = String(modulo || "").toUpperCase();',
'      var tp = String(tipo || "").toUpperCase();',
'      if (mod.indexOf("COMPET") !== -1 || mod.indexOf("FECHAMENTO") !== -1) return "sistema";',
'      if (mod.indexOf("CADASTRO") !== -1 || mod.indexOf("VEICULO") !== -1 || mod.indexOf("MOTORISTA") !== -1 || mod.indexOf("CARRETA") !== -1) return "cadastro";',
'      if (mod.indexOf("OPERAC") !== -1 || mod.indexOf("ACOPLAMENTO") !== -1 || mod.indexOf("KM") !== -1 || mod.indexOf("ABASTECIMENTO") !== -1 || mod.indexOf("MANUTEN") !== -1) return "operacao";',
'      if (mod.indexOf("FINANC") !== -1 || mod.indexOf("LANCAMENTO") !== -1 || mod.indexOf("DRE") !== -1) return "financeiro";',
'      if (mod.indexOf("ADMIN") !== -1 || mod.indexOf("USUARIO") !== -1 || mod.indexOf("PERFIL") !== -1 || mod.indexOf("AUDITORIA") !== -1) return "administracao";',
'      return "outro";',
'    }',
'',
'    function renderHistorico(data) {',
'      var timeline = document.getElementById("historico-timeline");',
'      var resumo = document.getElementById("historico-resumo");',
'      if (!timeline) return;',
'',
'      var eventos = data.eventos || [];',
'',
'      // Resumo (badges)',
'      if (resumo) {',
'        var pt = data.porTipo || {};',
'        var htmlRes = \'<div class="timeline-resumo-item"><span class="timeline-resumo-dot" style="background:#2563eb"></span><strong>\' + (pt.total || 0) + "</strong> total</div>";',
'        htmlRes += \'<div class="timeline-resumo-item"><span class="timeline-resumo-dot" style="background:#dc2626"></span>Adm: \' + (pt.administracao || 0) + "</div>";',
'        htmlRes += \'<div class="timeline-resumo-item"><span class="timeline-resumo-dot" style="background:#059669"></span>Cad: \' + (pt.cadastro || 0) + "</div>";',
'        htmlRes += \'<div class="timeline-resumo-item"><span class="timeline-resumo-dot" style="background:#f59e0b"></span>Ope: \' + (pt.operacao || 0) + "</div>";',
'        htmlRes += \'<div class="timeline-resumo-item"><span class="timeline-resumo-dot" style="background:#8b5cf6"></span>Fin: \' + (pt.financeiro || 0) + "</div>";',
'        resumo.innerHTML = htmlRes;',
'      }',
'',
'      if (eventos.length === 0) {',
'        timeline.innerHTML = \'<div class="timeline-empty">Nenhum evento encontrado com os filtros atuais.</div>\';',
'        return;',
'      }',
'',
'      // Agrupa por dia',
'      var porDia = {};',
'      eventos.forEach(function(e) {',
'        var d = e.data_evento ? new Date(e.data_evento) : new Date();',
'        var diaKey = d.toLocaleDateString("pt-BR");',
'        if (!porDia[diaKey]) porDia[diaKey] = [];',
'        porDia[diaKey].push(e);',
'      });',
'',
'      var html = "";',
'      Object.keys(porDia).forEach(function(dia) {',
'        html += \'<div class="timeline-dia">&#128197; \' + dia + " (" + porDia[dia].length + " evento" + (porDia[dia].length > 1 ? "s" : "") + ")</div>";',
'        porDia[dia].forEach(function(e) {',
'          var cat = classificarEvento(e.modulo, e.tipo_evento);',
'          var catClass = "cat-" + cat;',
'          var badgeClass = "badge-" + cat;',
'          var hora = e.data_evento ? new Date(e.data_evento).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--";',
'          html += \'<div class="timeline-item \' + catClass + \'">\';',
'          html += \'<div><span class="timeline-hora">\' + hora + \'</span><span class="timeline-acao">\' + (e.tipo_evento || "ACAO") + \'</span>\';',
'          html += \' <span class="timeline-badge \' + badgeClass + \'">\' + cat + "</span></div>";',
'          html += \'<div class="timeline-meta">\';',
'          html += \'<span>&#128100; \' + (e.usuario || "Sistema") + "</span>";',
'          html += \'<span>&#128193; \' + (e.modulo || "SISTEMA") + "</span>";',
'          html += "</div>";',
'          if (e.detalhes) {',
'            html += \'<div class="timeline-detalhe">\' + e.detalhes + "</div>";',
'          }',
'          html += "</div>";',
'        });',
'      });',
'      timeline.innerHTML = html;',
'    }',
'',
'    function aplicarFiltrosHistorico() {',
'      loadHistoricoDaAPI();',
'    }',
'',
'    function limparFiltrosHistorico() {',
'      ["hist-filtro-data-ini","hist-filtro-data-fim","hist-filtro-usuario","hist-filtro-tipo","hist-filtro-modulo","hist-filtro-veiculo"].forEach(function(id) {',
'        var el = document.getElementById(id);',
'        if (el) el.value = "";',
'      });',
'      loadHistoricoDaAPI();',
'    }',
'',
'    function exportarHistoricoCSV() {',
'      if (!__historicoCache || __historicoCache.length === 0) {',
'        alert("Nada para exportar.");',
'        return;',
'      }',
'      var linhas = [["Data","Hora","Usuario","Tipo","Modulo","Detalhes"]];',
'      __historicoCache.forEach(function(e) {',
'        var d = e.data_evento ? new Date(e.data_evento) : null;',
'        linhas.push([',
'          d ? d.toLocaleDateString("pt-BR") : "",',
'          d ? d.toLocaleTimeString("pt-BR") : "",',
'          e.usuario || "",',
'          e.tipo_evento || "",',
'          e.modulo || "",',
'          (e.detalhes || "").replace(/"/g, ""),',
'        ]);',
'      });',
'      var csv = linhas.map(function(l) { return l.map(function(c) { return \'"\' + String(c).replace(/"/g, \'""\') + \'"\'; }).join(","); }).join("\\n");',
'      var blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });',
'      var url = URL.createObjectURL(blob);',
'      var a = document.createElement("a");',
'      a.href = url;',
'      a.download = "historico_" + new Date().toISOString().substring(0,10) + ".csv";',
'      document.body.appendChild(a);',
'      a.click();',
'      document.body.removeChild(a);',
'      URL.revokeObjectURL(url);',
'    }',
'',
'    window.loadHistoricoDaAPI = loadHistoricoDaAPI;',
'    window.aplicarFiltrosHistorico = aplicarFiltrosHistorico;',
'    window.limparFiltrosHistorico = limparFiltrosHistorico;',
'    window.exportarHistoricoCSV = exportarHistoricoCSV;',
''].join('\n');

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_02b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 02b - Frontend Historico');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');

// Detecta tipo de quebra de linha
const NL = html.includes('\r\n') ? '\r\n' : '\n';
console.log('   Quebra de linha: ' + (NL === '\r\n' ? 'CRLF' : 'LF'));

// Normaliza CSS e JS para o NL detectado
const cssNormalizado = CSS_TIMELINE.replace(/\n/g, NL);
const secaoNormalizada = SECAO_HISTORICO.replace(/\n/g, NL);
const funcoesNormalizado = FUNCOES_HISTORICO.replace(/\n/g, NL);

const original = html;
const acoes = [];

// ---- 1) CSS antes do 2o </style> ----
if (!html.includes('TIMELINE DE HISTORICO')) {
  const firstStyle = html.indexOf('</style>');
  const secondStyle = html.indexOf('</style>', firstStyle + 8);
  if (secondStyle === -1) {
    console.log('   [ERRO] Nao achei o 2o </style>');
    process.exit(1);
  }
  html = html.substring(0, secondStyle) + cssNormalizado + html.substring(secondStyle);
  acoes.push('CSS da timeline adicionado');
} else {
  console.log('   [--] CSS da timeline ja existe.');
}

// ---- 2) Substituir a secao #tab-historico ----
const idxIniSecao = html.indexOf('<!-- TAB: HISTORICO -->');
const idxIniSecaoFallback = html.indexOf('<section id="tab-historico"');

let idxIni = idxIniSecao !== -1 ? idxIniSecao : idxIniSecaoFallback;
let idxFim = -1;

if (idxIni !== -1) {
  idxFim = html.indexOf('</section>', idxIni);
  if (idxFim === -1) {
    console.log('   [ERRO] Nao achei o </section> da tab-historico');
    process.exit(1);
  }
  html = html.substring(0, idxIni) + secaoNormalizada + html.substring(idxFim + '</section>'.length);
  acoes.push('Secao #tab-historico substituida');
} else {
  // Nao existe ainda - inserir apos #tab-documentos
  const idxDocs = html.indexOf('</section>', html.indexOf('id="tab-documentos"'));
  if (idxDocs === -1) {
    console.log('   [ERRO] Nao achei onde inserir a nova secao historico');
    process.exit(1);
  }
  html = html.substring(0, idxDocs + '</section>'.length) + NL + secaoNormalizada + html.substring(idxDocs + '</section>'.length);
  acoes.push('Secao #tab-historico criada apos #tab-documentos');
}

// ---- 3) Funcoes JS antes do 2o </script> ----
if (!html.includes('loadHistoricoDaAPI = loadHistoricoDaAPI')) {
  const idxScriptPrincipal = html.indexOf('window.testarAuditoriaManual = testarAuditoriaManual;');
  if (idxScriptPrincipal === -1) {
    console.log('   [ERRO] Nao achei o marcador do bloco JS principal');
    process.exit(1);
  }
  const idxFimBloco = idxScriptPrincipal + 'window.testarAuditoriaManual = testarAuditoriaManual;'.length;
  html = html.substring(0, idxFimBloco) + NL + funcoesNormalizado + html.substring(idxFimBloco);
  acoes.push('Funcoes de historico adicionadas');
} else {
  console.log('   [--] Funcoes de historico ja existem.');
}

// ---- Verificacoes ----
if (!html.includes('loadHistoricoDaAPI')) {
  console.log('   [ERRO] Falha na injecao.');
  process.exit(1);
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
console.log('   [OK] Frontend do historico aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(front): tela de historico com timeline e filtros"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');