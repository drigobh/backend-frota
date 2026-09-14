const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Corrigindo o menu Auditoria e a sincronização visual do Mês Congelado...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. GARANTIR O LINK CORRETO DO MENU AUDITORIA NA SIDEBAR
const itemMenuAuditoria = `
              <a href="#" class="nav-item" id="nav-tab-auditoria" onclick="switchTab('auditoria'); loadAuditoriaDaAPI(); return false;">
                <span class="nav-item-icon">🕵️</span>
                <span class="nav-item-text">Auditoria</span>
              </a>`;

// Se o menu lateral tiver o link de auditoria quebrado, substitui pelo correto
if (html.includes('id="nav-tab-auditoria"')) {
  html = html.replace(
    /<a[^>]*id=["']nav-tab-auditoria["'][\s\S]*?<\/a>/i,
    itemMenuAuditoria.trim()
  );
} else if (html.includes('id="grupo-admin"')) {
  html = html.replace(
    /(<div[^>]*id=["']grupo-admin["'][^>]*>)/i,
    `$1\n${itemMenuAuditoria}`
  );
}

// 2. CORRIGIR A LÓGICA DE ATUALIZAÇÃO VISUAL DO FECHAMENTO (Sincronização imediata)
const scriptFechamentoSincronizado = `
    // =========================================================================
    // CONTROLE DE FECHAMENTO MENSAL E AUDITORIA SINCRONIZADA
    // =========================================================================
    state.mesesFechados = state.mesesFechados || [];

    function isMesFechado(mes = state?.currentMonth) {
      if (!mes || !state.mesesFechados || !Array.isArray(state.mesesFechados)) return false;
      const mStr = String(mes).trim().toLowerCase();
      const m7 = mStr.substring(0, 7);
      return state.mesesFechados.some(x => {
        const xStr = String(x).trim().toLowerCase();
        return xStr === mStr || xStr === m7 || xStr.substring(0, 7) === m7;
      });
    }

    function atualizarInterfaceFechamento() {
      const badge = document.getElementById('badge-status-mes');
      const btn = document.getElementById('btn-toggle-fechamento');
      if (!badge) return;

      const mesAtual = state?.currentMonth || '';
      const fechado = isMesFechado(mesAtual);
      const isAdmin = state?.user?.perfil === 'Administrador';

      if (fechado) {
        badge.className = 'lock-badge locked';
        badge.style.setProperty('background', '#fee2e2', 'important');
        badge.style.setProperty('color', '#991b1b', 'important');
        badge.style.setProperty('border-color', '#f87171', 'important');
        badge.textContent = '🔒 Mês Congelado (' + mesAtual + ')';
      } else {
        badge.className = 'lock-badge unlocked';
        badge.style.setProperty('background', '#dcfce7', 'important');
        badge.style.setProperty('color', '#166534', 'important');
        badge.style.setProperty('border-color', '#86efac', 'important');
        badge.textContent = '🔓 Mês Aberto (' + mesAtual + ')';
      }

      if (btn) {
        btn.style.display = isAdmin ? 'inline-flex' : 'none';
        btn.innerHTML = fechado ? '<span>🔓</span> Descongelar Mês' : '<span>🔒</span> Congelar Mês';
        btn.style.backgroundColor = fechado ? '#dc2626' : '#0f2a4a';
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
      const acaoDesejada = !fechadoAtual;

      const confirmar = confirm(
        acaoDesejada
          ? \`Deseja CONGELAR a competência de "\${mes}"? Operadores não poderão alterar dados deste período.\`
          : \`Deseja DESCONGELAR a competência de "\${mes}"? O mês voltará a aceitar edições.\`
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
`;

// Remove blocos anteriores para evitar duplicidade de funções de fechamento
html = html.replace(/\/\/ =========================================================================\s*\/\/ CONTROLE DE FECHAMENTO MENSAL[\s\S]*?registrarLog\([\s\S]*?\}\s*\}/g, '');
html = html.replace(/\/\/ =========================================================================\s*\/\/ MOTOR DE AUDITORIA E FECHAMENTO MENSAL[\s\S]*?registrarLog\([\s\S]*?\}\s*\}/g, '');

// Insere antes do fechamento do script
html = html.replace('</script>', `${scriptFechamentoSincronizado}\n</script>`);

// Garante que loadFechamentosDaAPI seja chamado ao iniciar o app logado
if (!html.includes('await loadFechamentosDaAPI();')) {
  html = html.replace('await loadDashboardData();', 'await loadFechamentosDaAPI();\n      await loadDashboardData();');
}

// Validação de sintaxe
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
  console.log('🎉 public/index.html corrigido e validado com 0 erros!');
} else {
  console.error('⚠️ Falha na sintaxe.');
  process.exit(1);
}
