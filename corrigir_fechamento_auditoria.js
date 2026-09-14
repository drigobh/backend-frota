const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Aplicando correções definitivas de Fechamento e Auditoria...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. INJETAR BARRA DE CONGELAMENTO NO TOPO DO DASHBOARD
const barraFechamentoHtml = `
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

// Remove inserção anterior se houver e insere logo após a abertura do tab-dashboard
html = html.replace(/<!-- BARRA DE CONTROLE DE COMPETÊNCIA -->[\s\S]*?<\/div>\s*<\/div>/, '');
const regexTabDash = /(<section[^>]*id=["']tab-dashboard["'][^>]*>)/i;

if (regexTabDash.test(html)) {
  html = html.replace(regexTabDash, `$1\n${barraFechamentoHtml}`);
  console.log('✔ Barra de Congelamento do Mês injetada no topo do Dashboard.');
} else {
  console.log('⚠️ Tag #tab-dashboard não encontrada de forma direta.');
}

// 2. FUNÇÕES DE FECHAMENTO E AUDITORIA AUTO-EXECUTÁVEIS
const jsMotorCompleto = `
    // =========================================================================
    // MOTOR DE FECHAMENTO MENSAL E AUDITORIA ATIVA
    // =========================================================================
    state.mesesFechados = [];

    async function loadFechamentosDaAPI() {
      try {
        const res = await fetch('/api/meses-fechados', {
          headers: { 'Authorization': 'Bearer ' + (state.token || localStorage.getItem('token') || '') }
        });
        if (res.ok) {
          state.mesesFechados = (await res.json()).map(x => x.mes);
          atualizarInterfaceFechamento();
        }
      } catch (e) {}
    }

    function isMesFechado(mes = state.currentMonth) {
      return state.mesesFechados.includes(mes);
    }

    function atualizarInterfaceFechamento() {
      const mes = state.currentMonth;
      const fechado = isMesFechado(mes);
      const badge = document.getElementById('badge-status-mes');
      const btn = document.getElementById('btn-toggle-fechamento');

      if (badge) {
        if (fechado) {
          badge.className = 'lock-badge locked';
          badge.style.background = '#fee2e2';
          badge.style.color = '#991b1b';
          badge.style.borderColor = '#f87171';
          badge.innerHTML = '🔒 Mês Congelado';
        } else {
          badge.className = 'lock-badge unlocked';
          badge.style.background = '#dcfce7';
          badge.style.color = '#166534';
          badge.style.borderColor = '#86efac';
          badge.innerHTML = '🔓 Mês Aberto';
        }
      }

      if (btn) {
        btn.innerHTML = fechado ? '<span>🔓</span> Descongelar Mês' : '<span>🔒</span> Congelar Mês';
        btn.style.background = fechado ? '#dc2626' : '#0f2a4a';
      }

      // Se o mês estiver fechado e não for admin, desabilita inputs de digitação
      const isAdmin = state.user?.perfil === 'Administrador';
      const bloquear = fechado && !isAdmin;
      document.querySelectorAll('#tab-km input, #tab-abastecimentos button:not(.btn-filtro)').forEach(el => {
        if (el.id !== 'btn-toggle-fechamento') el.disabled = bloquear;
      });
    }

    async function toggleFechamentoMes() {
      const mes = state.currentMonth;
      const fechadoAtual = isMesFechado(mes);
      const confirmar = confirm(
        fechadoAtual
          ? \`Deseja DESCONGELAR a competência de "\${mes}"? O mês voltará a aceitar edições.\`
          : \`Deseja CONGELAR a competência de "\${mes}"? Operadores não poderão alterar dados deste período.\`
      );
      if (!confirmar) return;

      try {
        const u = state.user || {};
        const res = await fetch('/api/meses-fechados/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (state.token || localStorage.getItem('token') || '')
          },
          body: JSON.stringify({ mes, usuario_nome: u.nome || 'Administrador' })
        });
        if (res.ok) {
          await loadFechamentosDaAPI();
          registrarLog(
            fechadoAtual ? 'Descongelar Mês' : 'Congelar Mês',
            'COMPETÊNCIA',
            \`Competência de \${mes} \${fechadoAtual ? 'descongelada' : 'congelada'}\`
          );
        }
      } catch (err) {
        alert('Erro ao processar fechamento: ' + err.message);
      }
    }

    async function registrarLog(acao, entidade, detalhes) {
      try {
        const u = state.user || {};
        await fetch('/api/auditoria', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (state.token || localStorage.getItem('token') || '')
          },
          body: JSON.stringify({
            acao,
            entidade,
            detalhes: String(detalhes || ''),
            usuario_nome: u.nome || 'Administrador',
            usuario_email: u.email || 'admin@frota.com'
          })
        });
      } catch (e) {}
    }

    async function loadAuditoriaDaAPI() {
      try {
        const res = await fetch('/api/auditoria', {
          headers: { 'Authorization': 'Bearer ' + (state.token || localStorage.getItem('token') || '') }
        });
        if (!res.ok) return;
        const data = await res.json();
        renderAuditoria(data);
      } catch (err) {
        console.error('Erro ao buscar auditoria:', err);
      }
    }

    function renderAuditoria(lista) {
      const tbody = document.getElementById('tbody-auditoria');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum registro de auditoria no momento.</td></tr>';
        return;
      }

      lista.forEach(a => {
        const dataFormatada = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        let badgeCor = 'badge-pos';
        if (a.acao.toLowerCase().includes('exclu') || a.acao.toLowerCase().includes('congelar')) badgeCor = 'badge-neg';

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${dataFormatada}</td>
          <td><strong>\${a.usuario_nome}</strong><br><span style="font-size:11px;color:#64748b;">\${a.usuario_email}</span></td>
          <td><span class="\${badgeCor}">\${a.acao}</span></td>
          <td><span class="vehicle-tag">\${a.entidade}</span></td>
          <td>\${a.detalhes || '-'}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    // Gatilho global: sempre que clicar em algo do menu que leve para auditoria, recarrega
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-tab="auditoria"], [onclick*="auditoria"]');
      if (el) setTimeout(loadAuditoriaDaAPI, 80);
    });
`;

// Substitui ou injeta o motor completo antes do fechamento do script principal
if (!html.includes('MOTOR DE FECHAMENTO MENSAL E AUDITORIA ATIVA')) {
  html = html.replace('function renderAll() {', jsMotorCompleto + '\n    function renderAll() {');
  console.log('✔ Motor de Fechamento e Auditoria injetado no JS.');
}

// 3. AUTO-AUDITORIA NO apiFetch (Interceptador Global)
const interceptadorFetch = `
      // Interceptador de Auditoria Automática
      if (res && res.ok && options && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
        if (!url.includes('/auditoria') && !url.includes('/login') && !url.includes('/meses-fechados')) {
          const mapaAcoes = { 'POST': 'Cadastro/Inclusão', 'PUT': 'Edição', 'DELETE': 'Exclusão' };
          const acao = mapaAcoes[options.method.toUpperCase()] || options.method;
          const rotaLimpa = url.replace('/api/', '').split('/')[0].toUpperCase();
          let payloadResumo = url;
          try {
            if (options.body) {
              const b = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
              payloadResumo = JSON.stringify(b);
            }
          } catch(e) {}
          if (payloadResumo.length > 200) payloadResumo = payloadResumo.substring(0, 200) + '...';
          registrarLog(acao, rotaLimpa, payloadResumo);
        }
      }
`;

if (!html.includes('Interceptador de Auditoria Automática')) {
  html = html.replace('return res;', `${interceptadorFetch}\n      return res;`);
  console.log('✔ Interceptador global de auditoria conectado ao apiFetch.');
}

// 4. CHAMADAS NA INICIALIZAÇÃO
if (!html.includes('loadFechamentosDaAPI();')) {
  html = html.replace('loadDashboardData();', 'loadDashboardData(); loadFechamentosDaAPI(); loadAuditoriaDaAPI();');
  console.log('✔ Carregamentos automáticos adicionados ao initApp.');
}

// 5. VALIDAR SINTAXE
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
  console.log('🎉 public/index.html atualizado e validado com 0 erros!');
} else {
  console.error('⚠️ Não foi possível salvar por erro de sintaxe.');
}
