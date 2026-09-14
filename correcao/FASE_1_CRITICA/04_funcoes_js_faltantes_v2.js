/**
 * ============================================================================
 * CORRECAO 04 v2 - Injetar funcoes JS faltantes no public/index.html
 * ============================================================================
 * ANCORA CORRETA: injeta ANTES do </script> que precede o comentario
 *                 "Graficos nativos em SVG" (bloco principal do app).
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/04_funcoes_js_faltantes_v2.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/04_funcoes_js_faltantes_v2.js --apply
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
  const backupPath = path.resolve(BACKUP_DIR, '04v2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 04 v2 - Injetar funcoes JS');
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

// ANCORA: procura o comentario "Graficos nativos em SVG"
const marcadorGraficos = '<!-- Gr';
let idxMarcador = -1;

// Tenta diferentes variacoes de encoding do comentario
const variacoes = ['<!-- Gráficos nativos em SVG -->', '<!-- GrÃ¡ficos nativos em SVG -->', '<!-- Graficos nativos em SVG -->'];
for (const v of variacoes) {
  idxMarcador = original.indexOf(v);
  if (idxMarcador !== -1) {
    console.log('   Marcador encontrado: "' + v + '"');
    break;
  }
}

if (idxMarcador === -1) {
  console.log('   [ERRO] Nao encontrei o comentario "Graficos nativos em SVG".');
  console.log('         O arquivo pode ter sido modificado. Revise manualmente.');
  process.exit(1);
}

// Encontra o </script> imediatamente antes desse comentario
const antesDoMarcador = original.substring(0, idxMarcador);
const idxScript = antesDoMarcador.lastIndexOf('</script>');

if (idxScript === -1) {
  console.log('   [ERRO] Nao encontrei </script> antes do marcador.');
  process.exit(1);
}

// Verifica se ha lixo entre o </script> e o marcador (deve ser so espaco/quebra)
const entreScriptMarcador = original.substring(idxScript + 9, idxMarcador).trim();
if (entreScriptMarcador.length > 0) {
  console.log('   [AVISO] Ha conteudo entre </script> e o marcador:');
  console.log('   "' + entreScriptMarcador.substring(0, 100) + '"');
}

const linhaScript = original.substring(0, idxScript).split('\n').length;
const novoConteudo = original.substring(0, idxScript) + BLOCO_FUNCOES + original.substring(idxScript);

console.log('   Arquivo: ' + ARQUIVO);
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   </script> alvo: linha ' + linhaScript + ' (bloco principal do app)');
console.log('   Funcoes: 6');
console.log('   Tamanho novo: ' + novoConteudo.length + ' chars (+' + (novoConteudo.length - original.length) + ')');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/04_funcoes_js_faltantes_v2.js --apply\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, novoConteudo, 'utf8');
console.log('   [OK] Funcoes injetadas com sucesso!');
console.log('\n✅ Aplicado. Proximos passos:');
console.log('   1. git add . && git commit -m "feat(front): injetar funcoes JS faltantes"');
console.log('   2. git push origin main');
console.log('   3. Testar no navegador (F12 -> Console)\n');