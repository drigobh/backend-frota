const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Restaurando atualizarInterfaceFechamento e sincronizando os badges...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. DECLARAÇÃO COMPLETA E ROBUSTA DE TODAS AS FUNÇÕES DE FECHAMENTO
const blocoFechamentoCompleto = `
    // =========================================================================
    // CONTROLE DE FECHAMENTO MENSAL (COMPETÊNCIA)
    // =========================================================================
    state.mesesFechados = [];

    function isMesFechado(mes = state.currentMonth) {
      if (!mes || !state.mesesFechados || !Array.isArray(state.mesesFechados)) return false;
      const mStr = String(mes).trim();
      const m7 = mStr.substring(0, 7);
      return state.mesesFechados.some(x => {
        const xStr = String(x).trim();
        return xStr === mStr || (m7.length === 7 && xStr.substring(0, 7) === m7);
      });
    }

    function atualizarInterfaceFechamento() {
      const mes = state.currentMonth;
      const fechado = isMesFechado(mes);
      const isAdmin = state.user?.perfil === 'Administrador';

      // Atualiza todos os badges de status de mês na tela
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

      // Atualiza o botão de alternância
      const btn = document.getElementById('btn-toggle-fechamento');
      if (btn) {
        btn.style.display = isAdmin ? 'inline-flex' : 'none';
        btn.innerHTML = fechado ? '<span>🔓</span> Descongelar Mês' : '<span>🔒</span> Congelar Mês';
        btn.style.background = fechado ? '#dc2626' : '#0f2a4a';
      }

      // Bloqueia campos de digitação de KM e lançamentos se não for admin
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
          state.mesesFechados = Array.isArray(dados) ? dados.map(x => x.mes) : [];
          atualizarInterfaceFechamento();
        }
      } catch (e) {
        console.warn('Erro ao carregar fechamentos:', e);
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

        if (data.fechado) {
          if (!state.mesesFechados.includes(mes)) state.mesesFechados.push(mes);
        } else {
          const m7 = String(mes).substring(0, 7);
          state.mesesFechados = state.mesesFechados.filter(x => String(x).substring(0, 7) !== m7 && x !== mes);
        }

        atualizarInterfaceFechamento();

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

// Remove blocos incompletos anteriores
html = html.replace(/\/\/ =========================================================================\s*\/\/ CONTROLE DE FECHAMENTO MENSAL[\s\S]*?alert\('Erro ao alterar fechamento: ' \+ err\.message\);\s*\}\s*\}/g, '');
html = html.replace(/\/\/ MOTOR DE FECHAMENTO MENSAL E AUDITORIA ATIVA[\s\S]*?alert\('Erro ao processar fechamento: ' \+ err\.message\);\s*\}\s*\}/g, '');

// Injeta o bloco completo logo antes de renderAll
html = html.replace('function renderAll() {', `${blocoFechamentoCompleto}\n    function renderAll() {`);
console.log('✔ Bloco de fechamento e atualizarInterfaceFechamento() inserido com sucesso.');

// 2. GARANTIR QUE atualizarInterfaceFechamento() SEJA CHAMADO NA TROCA DE MÊS
if (!html.includes('atualizarInterfaceFechamento();\n      renderKm();') && html.includes('function renderAll() {')) {
  html = html.replace('function renderAll() {', 'function renderAll() {\n      atualizarInterfaceFechamento();');
}

// 3. VALIDAR SINTAXE JAVASCRIPT
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
  console.log('🎉 public/index.html corrigido e 100% validado!');
} else {
  console.error('⚠️ Cancelando gravação devido a erro de sintaxe.');
}
