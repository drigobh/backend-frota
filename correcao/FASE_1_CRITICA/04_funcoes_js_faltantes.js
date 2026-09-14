/**
 * ============================================================================
 * CORRECAO 04 - Injetar funcoes JS faltantes no public/index.html
 * ============================================================================
 * Injeta: loadPerfisDaAPI, renderPerfis, loadAuditoriaDaAPI, renderAuditoria,
 *         filtrarAuditoriaNaTela, testarAuditoriaManual
 *
 * ANCORA: injeta ANTES do ultimo </script> que precede </body>.
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/04_funcoes_js_faltantes.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/04_funcoes_js_faltantes.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

const BLOCO_FUNCOES = `
    // =========================================================================
    // FUNCOES COMPLEMENTARES (injetadas pela correcao 04)
    // =========================================================================

    async function loadPerfisDaAPI() {
      try {
        const res = await apiFetch('/perfis');
        if (!res.ok) return;
        const data = await res.json();
        renderPerfis(data);
      } catch (err) {
        console.error('Erro ao carregar perfis:', err);
      }
    }

    function renderPerfis(lista) {
      const tbody = document.getElementById('tbody-perfis');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum perfil cadastrado.</td></tr>';
        return;
      }

      lista.forEach((p, idx) => {
        const statusBadge = p.ativo
          ? '<span class="badge-pos">Ativo</span>'
          : '<span class="badge-neg">Inativo</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (idx + 1) + '</td>' +
                       '<td><strong>' + p.nome + '</strong></td>' +
                       '<td>' + (p.descricao || '-') + '</td>' +
                       '<td class="col-center">' + statusBadge + '</td>';
        tbody.appendChild(tr);
      });
    }

    async function loadAuditoriaDaAPI() {
      try {
        const res = await apiFetch('/auditoria');
        if (!res.ok) return;
        const data = await res.json();
        renderAuditoria(data);
      } catch (err) {
        console.error('Erro ao carregar auditoria:', err);
      }
    }

    function renderAuditoria(lista) {
      const tbody = document.getElementById('tbody-auditoria');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum log registrado.</td></tr>';
        return;
      }

      lista.forEach(a => {
        const data = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + data + '</td>' +
                       '<td>' + (a.usuario_nome || '-') + '</td>' +
                       '<td>' + (a.acao || '-') + '</td>' +
                       '<td>' + (a.modulo || '-') + '</td>' +
                       '<td>' + (a.detalhes || '-') + '</td>';
        tbody.appendChild(tr);
      });
    }

    function filtrarAuditoriaNaTela() {
      const termo = (document.getElementById('filtro-auditoria')?.value || '').toLowerCase().trim();
      document.querySelectorAll('#tbody-auditoria tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(termo) ? '' : 'none';
      });
    }

    function testarAuditoriaManual() {
      if (typeof registrarLog === 'function') {
        registrarLog('TESTE', 'SISTEMA', 'Teste manual de auditoria');
        setTimeout(loadAuditoriaDaAPI, 400);
      } else {
        alert('Funcao registrarLog nao disponivel.');
      }
    }

    window.loadPerfisDaAPI = loadPerfisDaAPI;
    window.loadAuditoriaDaAPI = loadAuditoriaDaAPI;
    window.filtrarAuditoriaNaTela = filtrarAuditoriaNaTela;
    window.testarAuditoriaManual = testarAuditoriaManual;

`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '04_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 04 - Injetar funcoes JS faltantes');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);

if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

const original = fs.readFileSync(absPath, 'utf8');

if (original.includes('FUNCOES COMPLEMENTARES (injetadas pela correcao 04)')) {
  console.log('   [--] Ja foi aplicado. Nada a fazer.\n');
  process.exit(0);
}

const idxBody = original.lastIndexOf('</body>');
if (idxBody === -1) {
  console.log('   [ERRO] Nao encontrei </body>.');
  process.exit(1);
}

const antesDoBody = original.substring(0, idxBody);
const idxScript = antesDoBody.lastIndexOf('</script>');

if (idxScript === -1) {
  console.log('   [ERRO] Nao encontrei </script> antes de </body>.');
  process.exit(1);
}

const linhaScript = original.substring(0, idxScript).split('\n').length;
const novoConteudo = original.substring(0, idxScript) + BLOCO_FUNCOES + original.substring(idxScript);

console.log('   Arquivo: ' + ARQUIVO);
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   </script> alvo: linha ' + linhaScript);
console.log('   Funcoes: 6 (loadPerfisDaAPI, renderPerfis, loadAuditoriaDaAPI, renderAuditoria, filtrarAuditoriaNaTela, testarAuditoriaManual)');
console.log('   Tamanho novo: ' + novoConteudo.length + ' chars (+' + (novoConteudo.length - original.length) + ')');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/04_funcoes_js_faltantes.js --apply\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, novoConteudo, 'utf8');
console.log('   [OK] Funcoes injetadas com sucesso!');
console.log('\n✅ Aplicado. Proximos passos:');
console.log('   1. git add . && git commit -m "feat(front): injetar funcoes JS faltantes"');
console.log('   2. git push origin main');
console.log('   3. Abrir site: Administracao -> Perfis e Administracao -> Auditoria\n');