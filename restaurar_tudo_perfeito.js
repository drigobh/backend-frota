const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

console.log('🔄 1. Restaurando public/index.html limpo pelo Git...');
try {
  // Restaura o index.html original antes das substituições destrutivas de regex
  execSync('git checkout 4d73d2e -- public/index.html', { stdio: 'inherit' });
  console.log('✔ public/index.html restaurado com sucesso!');
} catch (e) {
  console.log('Tentando checkout alternativo...');
  execSync('git checkout HEAD~3 -- public/index.html', { stdio: 'inherit' });
}

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('🔧 2. Aplicando melhorias de forma cirúrgica e segura...');

// 2.1 FORÇAR SEMPRE O DASHBOARD NO LOGIN E LOGOUT (Sem salvar activeTab no localStorage)
html = html.replace(
  /localStorage\.setItem\(['"]activeTab['"],\s*[^)]+\);?/g,
  "/* activeTab desativado para sempre abrir no Dashboard */"
);

html = html.replace(
  /const\s+savedTab\s*=\s*localStorage\.getItem\(['"]activeTab['"]\)[^;]*;/g,
  "const savedTab = 'dashboard';"
);

html = html.replace(
  /function\s+fazerLogout\s*\(\)\s*\{[\s\S]*?\}/,
  `function fazerLogout() {
      localStorage.clear();
      state.token = null;
      state.user = null;
      window.location.replace(window.location.origin + window.location.pathname);
    }`
);

// 2.2 GARANTIR A SEÇÃO DE AUDITORIA COMPLETA (Busca + Limpeza + Tabela)
const auditoriaSectionNova = `
      <!-- TAB: AUDITORIA -->
      <section id="tab-auditoria" class="tab-content">
        <div class="bar-controls" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1.25rem;">
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
                <th style="width: 150px;">Data / Hora</th>
                <th style="width: 180px;">Usuário</th>
                <th style="width: 130px;">Ação</th>
                <th style="width: 130px;">Módulo</th>
                <th>Detalhes do Registro</th>
              </tr>
            </thead>
            <tbody id="tbody-auditoria"></tbody>
          </table>
        </div>
      </section>
`;

if (html.includes('id="tab-auditoria"')) {
  html = html.replace(/<section id="tab-auditoria"[\s\S]*?<\/section>/, auditoriaSectionNova);
} else {
  html = html.replace('</main>', auditoriaSectionNova + '\n    </main>');
}

// 2.3 GARANTIR BARRA DE CONGELAMENTO DENTRO DO DASHBOARD
const barraCongelamentoDashboard = `
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

if (!html.includes('id="box-fechamento-dashboard"')) {
  html = html.replace(
    /(<section[^>]*id=["']tab-dashboard["'][^>]*>)/i,
    `$1\n${barraCongelamentoDashboard}`
  );
}

// 2.4 INJETAR AS FUNÇÕES JAVASCRIPT DE AUDITORIA E FECHAMENTO
const jsMotorCompleto = `
    // =========================================================================
    // AUDITORIA COMPLETA (ORDENAÇÃO, BUSCA, LIMPEZA COM FILTRO)
    // =========================================================================
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
        console.error('Erro ao carregar auditoria:', err);
      }
    }

    function renderAuditoria(lista) {
      const tbody = document.getElementById('tbody-auditoria');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || !Array.isArray(lista) || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum registro de auditoria encontrado.</td></tr>';
        return;
      }

      lista.forEach(a => {
        const dataFormatada = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        const acaoStr = String(a.acao || 'AÇÃO').toUpperCase();
        let badgeCor = 'badge-pos';
        if (acaoStr.includes('EXCLU') || acaoStr.includes('CONGELAR') || acaoStr.includes('DELETE') || acaoStr.includes('DESATIVAR')) {
          badgeCor = 'badge-neg';
        }

        let moduloTexto = a.modulo || a.entidade || 'SISTEMA';
        if (moduloTexto === 'null') moduloTexto = 'USUÁRIOS';

        let detalhesTexto = a.detalhes || a.descricao || '-';
        if (detalhesTexto === '-' || detalhesTexto === 'null') {
          detalhesTexto = (acaoStr === 'RESETAR_SENHA') ? 'Senha de usuário resetada pelo Administrador' : 'Alteração de dados cadastrais';
        }

        const usuarioNome = a.usuario_nome || 'Administrador';
        const usuarioEmail = a.usuario_email || '';

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${dataFormatada}</td>
          <td><strong>\${usuarioNome}</strong>\${usuarioEmail ? '<br><span style="font-size:11px;color:#64748b;">' + usuarioEmail + '</span>' : ''}</td>
          <td><span class="\${badgeCor}">\${acaoStr}</span></td>
          <td><span class="vehicle-tag" style="background:#e0f2fe; color:#0369a1; font-weight:600; padding:3px 8px; border-radius:4px;">\${moduloTexto}</span></td>
          <td style="max-width:380px; word-break:break-word; color:#334155;">\${detalhesTexto}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function filtrarAuditoriaNaTela() {
      const termo = (document.getElementById('filtro-auditoria')?.value || '').toLowerCase().trim();
      if (!termo) {
        renderAuditoria(_logsAuditoriaCache);
        return;
      }
      const filtrados = _logsAuditoriaCache.filter(item => {
        const dataStr = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR').toLowerCase() : '';
        const user = String(item.usuario_nome || '').toLowerCase();
        const email = String(item.usuario_email || '').toLowerCase();
        const acao = String(item.acao || '').toLowerCase();
        const mod = String(item.modulo || '').toLowerCase();
        const det = String(item.detalhes || '').toLowerCase();
        return dataStr.includes(termo) || user.includes(termo) || email.includes(termo) || acao.includes(termo) || mod.includes(termo) || det.includes(termo);
      });
      renderAuditoria(filtrados);
    }

    async function testarAuditoriaManual() {
      try {
        await registrarLog('TESTE_MANUAL', 'SISTEMA', 'Teste manual disparado pelo painel');
        await loadAuditoriaDaAPI();
        alert('✔ Log registrado com sucesso na Trilha de Auditoria!');
      } catch (e) {
        alert('Erro ao testar auditoria: ' + e.message);
      }
    }

    async function abrirModalLimparAuditoria() {
      const tipo = prompt(
        "ESCOLHA O TIPO DE LIMPEZA DE LOGS:\\n\\n" +
        "1: Por Usuário\\n" +
        "2: Por Mês (ex: 2026-08)\\n" +
        "3: Por Período de Datas\\n" +
        "4: Limpar TUDO\\n\\n" +
        "Digite o número da opção (1, 2, 3 ou 4):"
      );

      if (!tipo) return;

      const payload = {};
      if (tipo === '1') {
        const u = prompt("Digite o nome ou e-mail do usuário:");
        if (!u) return;
        payload.tipo = 'usuario';
        payload.usuario = u;
      } else if (tipo === '2') {
        const m = prompt("Digite o mês no formato AAAA-MM (ex: 2026-08):");
        if (!m) return;
        payload.tipo = 'mes';
        payload.mes = m;
      } else if (tipo === '3') {
        const d1 = prompt("Data inicial (AAAA-MM-DD):");
        const d2 = prompt("Data final (AAAA-MM-DD):");
        if (!d1 || !d2) return;
        payload.tipo = 'periodo';
        payload.data_inicio = d1;
        payload.data_fim = d2;
      } else if (tipo === '4') {
        if (!confirm("ATENÇÃO: Deseja apagar TODOS os registros da trilha de auditoria?")) return;
        payload.tipo = 'tudo';
      } else {
        alert("Opção inválida.");
        return;
      }

      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria/limpar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { 'Authorization': 'Bearer ' + t } : {})
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.mensagem || 'Logs limpos com sucesso!');
          await loadAuditoriaDaAPI();
        } else {
          alert('Erro: ' + (data.erro || 'Falha ao limpar logs'));
        }
      } catch (err) {
        alert('Erro ao processar limpeza: ' + err.message);
      }
    }

    async function registrarLog(acao, entidade, detalhes) {
      try {
        const u = state.user || {};
        const t = state.token || localStorage.getItem('token') || '';
        await fetch('/api/auditoria', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { 'Authorization': 'Bearer ' + t } : {})
          },
          body: JSON.stringify({
            acao: String(acao || 'AÇÃO').substring(0, 100),
            entidade: String(entidade || 'GERAL').substring(0, 100),
            detalhes: String(detalhes || ''),
            usuario_nome: u.nome || 'Administrador',
            usuario_email: u.email || 'admin@frota.com'
          })
        });
      } catch (e) {}
    }

    // =========================================================================
    // FECHAMENTO MENSAL COM PERSISTÊNCIA REAL
    // =========================================================================
    state.mesesFechados = [];

    function normalizarChaveMes(m) {
      if (!m) return '';
      return String(m).trim().toLowerCase();
    }

    function isMesFechado(mes = state.currentMonth) {
      if (!mes || !state.mesesFechados || !Array.isArray(state.mesesFechados)) return false;
      const alvo = normalizarChaveMes(mes);
      const alvoCurto = alvo.substring(0, 7);

      return state.mesesFechados.some(x => {
        const xNorm = normalizarChaveMes(x);
        return xNorm === alvo || xNorm === alvoCurto || xNorm.substring(0, 7) === alvoCurto;
      });
    }

    function atualizarInterfaceFechamento() {
      const mes = state.currentMonth;
      const fechado = isMesFechado(mes);
      const isAdmin = state.user?.perfil === 'Administrador';

      const badges = document.querySelectorAll('#badge-status-mes, .lock-badge');
      badges.forEach(b => {
        if (fechado) {
          b.className = 'lock-badge locked';
          b.style.background = '#fee2e2';
          b.style.color = '#991b1b';
          b.style.borderColor = '#f87171';
          b.innerHTML = '🔒 Mês Congelado';
        } else {
          b.className = 'lock-badge unlocked';
          b.style.background = '#dcfce7';
          b.style.color = '#166534';
          b.style.borderColor = '#86efac';
          b.innerHTML = '🔓 Mês Aberto';
        }
      });

      const btn = document.getElementById('btn-toggle-fechamento');
      if (btn) {
        btn.style.display = isAdmin ? 'inline-flex' : 'none';
        btn.innerHTML = fechado ? '<span>🔓</span> Descongelar Mês' : '<span>🔒</span> Congelar Mês';
        btn.style.background = fechado ? '#dc2626' : '#0f2a4a';
      }

      const bloquear = fechado && !isAdmin;
      document.querySelectorAll('#tab-km input, #tab-abastecimentos button:not(.btn-filtro)').forEach(el => {
        if (el.id !== 'btn-toggle-fechamento') el.disabled = bloquear;
      });
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
      } catch (e) {
        console.warn('Erro ao carregar fechamentos:', e);
      } finally {
        atualizarInterfaceFechamento();
      }
    }

    async function toggleFechamentoMes() {
      const mes = state.currentMonth;
      if (!mes) {
        alert('Selecione um mês primeiro.');
        return;
      }
      const fechadoAtual = isMesFechado(mes);
      const confirmar = confirm(
        fechadoAtual
          ? \`Deseja DESCONGELAR a competência de "\${mes}"? O mês voltará a aceitar edições.\`
          : \`Deseja CONGELAR a competência de "\${mes}"? Operadores não poderão alterar dados deste período.\`
      );
      if (!confirmar) return;

      try {
        const u = state.user || {};
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/meses-fechados/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { 'Authorization': 'Bearer ' + t } : {})
          },
          body: JSON.stringify({ mes, usuario_nome: u.nome || 'Administrador' })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || 'Falha no servidor');

        await loadFechamentosDaAPI();

        await registrarLog(
          data.fechado ? 'CONGELAR' : 'DESCONGELAR',
          'COMPETÊNCIA',
          \`Competência de \${mes} foi \${data.fechado ? 'congelada' : 'descongelada'}\`
        );

        alert(\`Competência de \${mes} \${data.fechado ? 'CONGELADA' : 'DESCONGELADA'} com sucesso!\`);
      } catch (err) {
        alert('Erro ao alterar fechamento: ' + err.message);
      }
    }

    // Clique em Auditoria recarrega logs
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-tab="auditoria"], [onclick*="auditoria"]');
      if (el) setTimeout(loadAuditoriaDaAPI, 80);
    });
`;

// Remove blocos antigos duplicados
html = html.replace(/\/\/ =========================================================================\s*\/\/ AUDITORIA COMPLETA[\s\S]*?if \(el\) setTimeout\(loadAuditoriaDaAPI, 80\);\s*\}\);/g, '');
html = html.replace(/\/\/ =========================================================================\s*\/\/ CONTROLE DE FECHAMENTO MENSAL[\s\S]*?alert\('Erro ao alterar fechamento: ' \+ err\.message\);\s*\}\s*\}/g, '');

// Injeta o motor limpo logo antes de renderAll
html = html.replace('function renderAll() {', `${jsMotorCompleto}\n    function renderAll() {\n      atualizarInterfaceFechamento();`);

// Interceptador global para auto-auditar todas as inclusões, edições e exclusões
const interceptadorFetchSeguro = `
    // Interceptador Global para Auditoria Automática
    const _originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await _originalFetch.apply(this, args);
      try {
        const inputUrl = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
        const options = args[1] || {};
        const method = (options.method || 'GET').toUpperCase();

        if (response.ok && ['POST', 'PUT', 'DELETE'].includes(method)) {
          if (!inputUrl.includes('/auditoria') && !inputUrl.includes('/login') && !inputUrl.includes('/meses-fechados')) {
            const modulo = inputUrl.replace('/api/', '').split('/')[0].toUpperCase() || 'SISTEMA';
            const mapaAcoes = { 'POST': 'Inclusão', 'PUT': 'Edição', 'DELETE': 'Exclusão' };
            let detalhe = inputUrl;
            if (options.body) {
              try {
                detalhe = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
              } catch(e) {}
            }
            if (detalhe.length > 200) detalhe = detalhe.substring(0, 200) + '...';
            registrarLog(mapaAcoes[method] || method, modulo, detalhe);
          }
        }
      } catch(e) {}
      return response;
    };
`;

if (!html.includes('Interceptador Global para Auditoria Automática')) {
  html = html.replace('<script>', '<script>\n' + interceptadorFetchSeguro);
}

// 2.5 VALIDAR SINTAXE JAVASCRIPT DO HTML
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
  console.log('🎉 public/index.html restaurado, estruturado e validado com 0 erros!');
} else {
  console.error('⚠️ Cancelando gravação devido a erro de sintaxe.');
  process.exit(1);
}
