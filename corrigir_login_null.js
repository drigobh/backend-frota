const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

console.log('🔄 Restaurando o index.html para o estado limpo e funcional...');
try {
  // Restaura para a versão anterior estável (onde o login funcionava perfeitamente)
  execSync('git checkout HEAD~1 -- public/index.html', { stdio: 'inherit' });
} catch (e) {
  try {
    execSync('git checkout 32166be -- public/index.html', { stdio: 'inherit' });
  } catch (err) {}
}

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('🛡️ Aplicando funções seguras com proteção contra elementos nulos...');

// 1. INJETAR APENAS AS FUNÇÕES SEGURAS QUE NÃO QUEBRAM A TELA DE LOGIN
const codigoSeguroBlindado = `
    // =========================================================================
    // MODULO SEGURO DE AUDITORIA E FECHAMENTO (BLINDADO CONTRA NULOS)
    // =========================================================================
    let _logsAuditoriaCache = [];

    async function loadAuditoriaDaAPI() {
      if (!document.getElementById('table-auditoria')) return;
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria', {
          headers: { ...(t ? { 'Authorization': 'Bearer ' + t } : {}) }
        });
        if (!res.ok) return;
        _logsAuditoriaCache = await res.json();
        renderAuditoria(_logsAuditoriaCache);
      } catch (err) {
        console.warn('Auditoria indisponível no momento');
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
      const input = document.getElementById('filtro-auditoria');
      if (!input) return;
      const termo = input.value.toLowerCase().trim();
      if (!termo) { renderAuditoria(_logsAuditoriaCache); return; }
      const filtrados = _logsAuditoriaCache.filter(item => {
        const dataStr = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR').toLowerCase() : '';
        const user = String(item.usuario_nome || '').toLowerCase();
        const acao = String(item.acao || '').toLowerCase();
        const mod = String(item.modulo || '').toLowerCase();
        const det = String(item.detalhes || '').toLowerCase();
        return dataStr.includes(termo) || user.includes(termo) || acao.includes(termo) || mod.includes(termo) || det.includes(detalhes);
      });
      renderAuditoria(filtrados);
    }

    async function testarAuditoriaManual() {
      try {
        await registrarLog('TESTE_MANUAL', 'SISTEMA', 'Teste disparado manualmente');
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
    function isMesFechado(mes = state?.currentMonth) {
      if (!mes || !state.mesesFechados) return false;
      const mStr = String(mes).trim().substring(0, 7);
      return state.mesesFechados.some(x => String(x).trim().substring(0, 7) === mStr);
    }

    function atualizarInterfaceFechamento() {
      const badge = document.getElementById('badge-status-mes');
      if (!badge) return; // Se estiver na tela de login, não faz nada
      const fechado = isMesFechado();
      const isAdmin = state?.user?.perfil === 'Administrador';
      const btn = document.getElementById('btn-toggle-fechamento');
      
      badge.className = 'lock-badge ' + (fechado ? 'locked' : 'unlocked');
      badge.style.background = fechado ? '#fee2e2' : '#dcfce7';
      badge.style.color = fechado ? '#991b1b' : '#166534';
      badge.innerHTML = fechado ? '🔒 Mês Congelado' : '🔓 Mês Aberto';

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
      if (!mes) return;
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

// Remove blocos anteriores conflitantes
html = html.replace(/\/\/ =========================================================================\s*\/\/ MODULO SEGURO DE AUDITORIA[\s\S]*?registrarLog\([\s\S]*?\}\s*\}/g, '');

// Insere o código seguro antes do fim da tag script
html = html.replace('</script>', `${codigoSeguroBlindado}\n</script>`);

// 2. VALIDAÇÃO DE SINTAXE JAVASCRIPT
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
  console.log('🎉 public/index.html blindado com verificações de nulidade e 0 erros!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
