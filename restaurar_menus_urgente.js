const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🚨 Iniciando recuperação total dos menus e do frontend...');

// 1. Encontrar o último commit antes do início dos problemas de auditoria
// O commit d85c8f9 ou 444d564 tinha o index.html com o layout e sidebar intactos
let commitBase = '444d564';
try {
  execSync(`git checkout ${commitBase} -- public/index.html`, { stdio: 'inherit' });
  console.log(`✔ public/index.html recuperado do commit seguro (${commitBase})!`);
} catch (e) {
  try {
    execSync('git checkout 2db57b4 -- public/index.html', { stdio: 'inherit' });
    console.log('✔ public/index.html recuperado de 2db57b4!');
  } catch (err) {
    console.error('Falha ao restaurar pelo Git, aplicando injeção de emergência...');
  }
}

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 2. GARANTIR QUE A NAVEGAÇÃO ENTRE MENUS FUNCIONE SEMPRE
// Forçar abertura inicial fixa no Dashboard
html = html.replace(/localStorage\.setItem\(['"]activeTab['"][^)]*\);?/g, '');
html = html.replace(/const\s+savedTab\s*=\s*localStorage\.getItem\(['"]activeTab['"]\)[^;]*;/g, "const savedTab = 'dashboard';");

// 3. REINSERIR DE FORMA SEGURA A ABA DE AUDITORIA NO FINAL DO MAIN (SEM TOCAR NOS OUTROS MENUS)
if (!html.includes('id="tab-auditoria"')) {
  const abaAuditoria = `
      <!-- TAB: AUDITORIA -->
      <section id="tab-auditoria" class="tab-content" style="display:none;">
        <div class="bar-controls" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <input type="text" id="filtro-auditoria" placeholder="🔍 Pesquisar em qualquer coluna..." oninput="filtrarAuditoriaNaTela()" style="padding:0.45rem 0.85rem; border:1px solid #cbd5e1; border-radius:6px; width:280px; font-size:0.85rem;">
            <span style="font-size:0.85rem; color:var(--text-muted);">Trilha de Auditoria</span>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn-action btn-action-secondary" onclick="loadAuditoriaDaAPI()">🔄 Atualizar</button>
            <button class="btn-action" style="background:#0284c7;color:#fff;" onclick="testarAuditoriaManual()">🧪 Testar</button>
            <button class="btn-action" style="background:#dc2626;color:#fff;" onclick="abrirModalLimparAuditoria()">🗑️ Limpar Logs</button>
            <button class="btn-action btn-action-secondary" onclick="exportTableToCSV('Trilha_Auditoria.csv', 'table-auditoria')">⬇️ Exportar CSV</button>
          </div>
        </div>

        <div class="section-title-wrap">
          <h2 class="section-title"><span>🕵️</span> Histórico de Ações da Frota</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-auditoria">
            <thead>
              <tr>
                <th style="width: 160px;">Data / Hora</th>
                <th style="width: 180px;">Usuário</th>
                <th style="width: 130px;">Ação</th>
                <th style="width: 140px;">Módulo</th>
                <th>Detalhes do Registro</th>
              </tr>
            </thead>
            <tbody id="tbody-auditoria"></tbody>
          </table>
        </div>
      </section>
  `;
  html = html.replace('</main>', abaAuditoria + '\n    </main>');
  console.log('✔ Aba de auditoria adicionada de forma não-invasiva.');
}

// 4. GARANTIR A BARRA DE COMPETÊNCIA NO DASHBOARD
if (!html.includes('id="box-fechamento-dashboard"')) {
  const barraFechamento = `
        <!-- BARRA DE CONTROLE DE COMPETÊNCIA -->
        <div id="box-fechamento-dashboard" style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:0.75rem 1.25rem; margin-top:1rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-weight:700; color:#0f2a4a; font-size:0.95rem;">Competência Mensal:</span>
            <span id="badge-status-mes" class="lock-badge unlocked" style="padding:4px 10px; border-radius:6px; font-weight:700; font-size:0.85rem; background:#dcfce7; color:#166534; border:1px solid #86efac;">🔓 Mês Aberto</span>
          </div>
          <div>
            <button id="btn-toggle-fechamento" onclick="toggleFechamentoMes()" class="btn-action" style="background:#0f2a4a; color:#ffffff; font-weight:600; padding:0.45rem 1.1rem; border-radius:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span>🔒</span> Congelar Mês
            </button>
          </div>
        </div>
  `;
  html = html.replace(/(<section[^>]*id=["']tab-dashboard["'][^>]*>)/i, `$1\n${barraFechamento}`);
}

// 5. INJETAR SCRIPTS DE APOIO DE FORMA SEGURA ANTES DE </script>
const scriptsSeguros = `
    // --- FUNÇÕES DE CONTROLE DE MENUS E FECHAMENTO ---
    let _logsAuditoriaCache = [];

    async function loadAuditoriaDaAPI() {
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria', {
          headers: { ...(t ? { 'Authorization': 'Bearer ' + t } : {}) }
        });
        if (!res.ok) return;
        _logsAuditoriaCache = await res.json();
        renderAuditoria(_logsAuditoriaCache);
      } catch (err) {
        console.error('Erro auditoria:', err);
      }
    }

    function renderAuditoria(lista) {
      const tbody = document.getElementById('tbody-auditoria');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum registro de auditoria.</td></tr>';
        return;
      }
      lista.forEach(a => {
        const dataFormatada = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        const acaoStr = String(a.acao || 'AÇÃO').toUpperCase();
        let badgeCor = 'badge-pos';
        if (acaoStr.includes('EXCLU') || acaoStr.includes('CONGELAR') || acaoStr.includes('DELETE')) badgeCor = 'badge-neg';
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${dataFormatada}</td>
          <td><strong>\${a.usuario_nome || 'Administrador'}</strong></td>
          <td><span class="\${badgeCor}">\${acaoStr}</span></td>
          <td><span class="vehicle-tag">\${a.modulo || a.entidade || 'SISTEMA'}</span></td>
          <td style="max-width:380px; word-break:break-word;">\${a.detalhes || '-'}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function filtrarAuditoriaNaTela() {
      const termo = (document.getElementById('filtro-auditoria')?.value || '').toLowerCase().trim();
      if (!termo) { renderAuditoria(_logsAuditoriaCache); return; }
      const filtrados = _logsAuditoriaCache.filter(item => {
        const dataStr = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR').toLowerCase() : '';
        const user = String(item.usuario_nome || '').toLowerCase();
        const acao = String(item.acao || '').toLowerCase();
        const mod = String(item.modulo || '').toLowerCase();
        const det = String(item.detalhes || '').toLowerCase();
        return dataStr.includes(termo) || user.includes(termo) || acao.includes(termo) || mod.includes(termo) || det.includes(termo);
      });
      renderAuditoria(filtrados);
    }

    async function testarAuditoriaManual() {
      try {
        await registrarLog('TESTE_MANUAL', 'SISTEMA', 'Teste de auditoria disparado manualmente');
        await loadAuditoriaDaAPI();
        alert('✔ Log registrado com sucesso!');
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    async function abrirModalLimparAuditoria() {
      const op = prompt("LIMPAR LOGS:\\n1: Por Usuário\\n2: Por Mês (AAAA-MM)\\n3: Tudo\\nDigite 1, 2 ou 3:");
      if (!op) return;
      const payload = {};
      if (op === '1') { payload.tipo = 'usuario'; payload.usuario = prompt("Nome/e-mail:"); }
      else if (op === '2') { payload.tipo = 'mes'; payload.mes = prompt("Mês (ex: 2026-08):"); }
      else if (op === '3') { if (!confirm("Apagar todos os logs?")) return; payload.tipo = 'tudo'; }
      else return;

      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria/limpar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(t ? { 'Authorization': 'Bearer ' + t } : {}) },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.mensagem || 'Concluído');
        await loadAuditoriaDaAPI();
      } catch (err) { alert('Erro ao limpar: ' + err.message); }
    }

    state.mesesFechados = [];
    function isMesFechado(mes = state.currentMonth) {
      if (!mes || !state.mesesFechados) return false;
      const mStr = String(mes).trim().substring(0, 7);
      return state.mesesFechados.some(x => String(x).trim().substring(0, 7) === mStr);
    }

    function atualizarInterfaceFechamento() {
      const fechado = isMesFechado();
      const isAdmin = state.user?.perfil === 'Administrador';
      const badge = document.getElementById('badge-status-mes');
      const btn = document.getElementById('btn-toggle-fechamento');
      if (badge) {
        badge.className = 'lock-badge ' + (fechado ? 'locked' : 'unlocked');
        badge.style.background = fechado ? '#fee2e2' : '#dcfce7';
        badge.style.color = fechado ? '#991b1b' : '#166534';
        badge.innerHTML = fechado ? '🔒 Mês Congelado' : '🔓 Mês Aberto';
      }
      if (btn) {
        btn.style.display = isAdmin ? 'inline-flex' : 'none';
        btn.innerHTML = fechado ? '<span>🔓</span> Descongelar Mês' : '<span>🔒</span> Congelar Mês';
        btn.style.background = fechado ? '#dc2626' : '#0f2a4a';
      }
    }

    async function loadFechamentosDaAPI() {
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/meses-fechados', {
          headers: { ...(t ? { 'Authorization': 'Bearer ' + t } : {}) }
        });
        if (res.ok) {
          const dados = await res.json();
          state.mesesFechados = Array.isArray(dados) ? dados.map(x => String(x.mes).trim()) : [];
        }
      } catch (e) {}
      finally { atualizarInterfaceFechamento(); }
    }

    async function toggleFechamentoMes() {
      const mes = state.currentMonth;
      const fechadoAtual = isMesFechado(mes);
      if (!confirm(fechadoAtual ? \`Descongelar "\${mes}"?\` : \`Congelar "\${mes}"?\`)) return;
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/meses-fechados/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(t ? { 'Authorization': 'Bearer ' + t } : {}) },
          body: JSON.stringify({ mes, usuario_nome: state.user?.nome || 'Administrador' })
        });
        const data = await res.json();
        await loadFechamentosDaAPI();
        alert(\`Competência \${data.fechado ? 'CONGELADA' : 'DESCONGELADA'} com sucesso!\`);
      } catch (e) { alert('Erro: ' + e.message); }
    }

    async function registrarLog(acao, entidade, detalhes) {
      try {
        const t = state.token || localStorage.getItem('token') || '';
        await fetch('/api/auditoria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(t ? { 'Authorization': 'Bearer ' + t } : {}) },
          body: JSON.stringify({
            acao, entidade, detalhes: String(detalhes || ''),
            usuario_nome: state.user?.nome || 'Administrador',
            usuario_email: state.user?.email || 'admin@frota.com'
          })
        });
      } catch(e) {}
    }
`;

// Substitui a chamada de logout para garantir redirecionamento limpo
html = html.replace(
  /function\s+fazerLogout\s*\(\)\s*\{[\s\S]*?\}/,
  `function fazerLogout() {
      localStorage.clear();
      state.token = null;
      state.user = null;
      window.location.replace(window.location.origin + window.location.pathname);
    }`
);

// Injeta os scripts antes do fechamento da tag script
html = html.replace('</script>', `${scriptsSeguros}\n</script>`);

// Conecta o clique do menu de auditoria
html = html.replace(
  "switchTab('auditoria');",
  "switchTab('auditoria'); loadAuditoriaDaAPI();"
);

// Validação final de sintaxe
let erros = 0;
const validador = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m;
while ((m = validador.exec(html)) !== null) {
  try {
    new vm.Script(m[1]);
  } catch (e) {
    erros++;
    console.error('❌ Erro de sintaxe:', e.message);
  }
}

if (erros === 0) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('🎉 public/index.html corrigido, com menus íntegros e 0 erros de sintaxe!');
} else {
  console.error('Falha na validação de sintaxe.');
  process.exit(1);
}
