/**
 * ============================================================================
 * FASE 3A — SCRIPT 02 (v2)
 * Remover chamada DUPLICADA de /lancamentos/resumo dentro de loadLancamentosDaAPI
 * ============================================================================
 * No seu arquivo, as chamadas estão nas linhas ~4073 e ~4087.
 *
 * COMO RODAR:
 *   node correcao/FASE_3A_UX/02_limpar_duplicata_resumo.js
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3A_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

console.log('\n═══════════════════════════════════════════════');
console.log('🔧 FASE 3A — Script 02 v2');
console.log('   Remover duplicata de /lancamentos/resumo');
console.log('═══════════════════════════════════════════════\n');

if (!fs.existsSync(ALVO)) {
  console.error(`❌ Não encontrei: ${ALVO}`);
  process.exit(1);
}

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;

// Regex flexível: captura o bloco try/catch de resumo, qualquer indentação
const regex = /try\s*\{\s*\n\s*var resResumo = await apiFetch\("\/lancamentos\/resumo\?"\s*\+\s*params\.toString\(\)\);\s*\n\s*if\s*\(resResumo\.ok\)\s*\{\s*\n\s*var resumo = await resResumo\.json\(\);\s*\n\s*renderResumoLancamentos\([^)]*\);\s*\n\s*\}\s*\n\s*\}\s*catch\s*\(e\)\s*\{\s*\/\*\s*resumo opcional\s*\*\/\s*\}/g;

const ocorrencias = (html.match(regex) || []).length;
console.log(`  📊 Ocorrências encontradas: ${ocorrencias}`);

if (ocorrencias <= 1) {
  console.log('  ⏭️  Nada a remover (0 ou 1 ocorrência).');
  process.exit(0);
}

// Mantém apenas a primeira, remove as demais
let primeira = true;
html = html.replace(regex, (match) => {
  if (primeira) { primeira = false; return match; }
  console.log('  🗑️  Removendo bloco duplicado');
  return '';
});

if (html !== original) {
  fs.mkdirSync(BACKUP, { recursive: true });
  const dst = path.resolve(BACKUP, 'fase3a_02_public__index.html');
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(ALVO, dst);
    console.log(`  📦 Backup: ${dst}`);
  }
  fs.writeFileSync(ALVO, html, 'utf8');
  console.log(`\n✅ Arquivo salvo: public/index.html`);
  console.log(`   Blocos removidos: ${ocorrencias - 1}`);
} else {
  console.log('\n⏭️  Nenhuma mudança necessária.');
}

console.log('');