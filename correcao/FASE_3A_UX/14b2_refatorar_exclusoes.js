const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14b2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14b2 - Refatorar exclusoes para modal bonito');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;

let mudancas = 0;

// Substituicao 1: excluirLancamento (usado na tela DRE e Lancamentos)
const s1a = "async function excluirLancamento(id) {\n      if (!confirm('Excluir este lancamento?')) return;";
const s1b = "async function excluirLancamento(id) {\n      if (!(await confirmarAcao('Excluir este lancamento? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Lancamento', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s1a) !== -1) { html = html.replace(s1a, s1b); mudancas++; console.log('  [OK] excluirLancamento refatorada'); }

// Substituicao 2: excluirLancamentoDre
const s2a = "async function excluirLancamentoDre(id) {\n      if (!confirm('Excluir este lancamento?')) return;";
const s2b = "async function excluirLancamentoDre(id) {\n      if (!(await confirmarAcao('Excluir este lancamento? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Lancamento', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s2a) !== -1) { html = html.replace(s2a, s2b); mudancas++; console.log('  [OK] excluirLancamentoDre refatorada'); }

// Substituicao 3: excluirCategoria
const s3a = "async function excluirCategoria(id, nome) {\n      if (!confirm('Excluir a categoria \"' + nome + '\"?')) return;";
const s3b = "async function excluirCategoria(id, nome) {\n      if (!(await confirmarAcao('Excluir a categoria \"' + nome + '\"? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Categoria', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s3a) !== -1) { html = html.replace(s3a, s3b); mudancas++; console.log('  [OK] excluirCategoria refatorada'); }

// Substituicao 4: excluirCentroCusto
const s4a = "async function excluirCentroCusto(id, nome) {\n      if (!confirm('Excluir o centro de custo \"' + nome + '\"?')) return;";
const s4b = "async function excluirCentroCusto(id, nome) {\n      if (!(await confirmarAcao('Excluir o centro de custo \"' + nome + '\"? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Centro de Custo', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s4a) !== -1) { html = html.replace(s4a, s4b); mudancas++; console.log('  [OK] excluirCentroCusto refatorada'); }

// Substituicao 5: excluirMeta
const s5a = "async function excluirMeta(id) {\n      if (!confirm('Excluir esta meta?')) return;";
const s5b = "async function excluirMeta(id) {\n      if (!(await confirmarAcao('Excluir esta meta? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Meta', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s5a) !== -1) { html = html.replace(s5a, s5b); mudancas++; console.log('  [OK] excluirMeta refatorada'); }

// Substituicao 6: excluirPerfil
const s6a = "async function excluirPerfil(id, nome) {\n      if (!confirm('Excluir o perfil \"' + nome + '\"?')) return;";
const s6b = "async function excluirPerfil(id, nome) {\n      if (!(await confirmarAcao('Excluir o perfil \"' + nome + '\"? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Perfil', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s6a) !== -1) { html = html.replace(s6a, s6b); mudancas++; console.log('  [OK] excluirPerfil refatorada'); }

// Substituicao 7: excluirUsuario
const s7a = "async function desativarUsuario(id, nome) {\n      if (!confirm(`Desativar o usuario \"${nome}\"?`)) return;";
const s7b = "async function desativarUsuario(id, nome) {\n      if (!(await confirmarAcao('Desativar o usuario \"' + nome + '\"? Ele nao podera mais fazer login.', { titulo: 'Desativar Usuario', tipo: 'warning', textoConfirmar: 'Desativar' }))) return;";
if (html.indexOf(s7a) !== -1) { html = html.replace(s7a, s7b); mudancas++; console.log('  [OK] desativarUsuario refatorada'); }

// Substituicao 8: deleteItem (cadastros)
const s8a = "async function deleteItem(tipo, id) {\n      if (!confirm('Deseja excluir este registro?')) return;";
const s8b = "async function deleteItem(tipo, id) {\n      if (!(await confirmarAcao('Deseja excluir este registro? Esta acao nao pode ser desfeita.', { titulo: 'Excluir Registro', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s8a) !== -1) { html = html.replace(s8a, s8b); mudancas++; console.log('  [OK] deleteItem refatorada'); }

// Substituicao 9: deleteAcop
const s9a = "async function deleteAcop(id) {\n      if (!confirm('Remover acoplamento?')) return;";
const s9b = "async function deleteAcop(id) {\n      if (!(await confirmarAcao('Remover este acoplamento?', { titulo: 'Remover Acoplamento', tipo: 'danger', textoConfirmar: 'Remover' }))) return;";
if (html.indexOf(s9a) !== -1) { html = html.replace(s9a, s9b); mudancas++; console.log('  [OK] deleteAcop refatorada'); }

// Substituicao 10: deleteAbastecimento
const s10a = "async function deleteAbastecimento(id) {\n      if (!confirm('Deseja excluir este registro de abastecimento?')) return;";
const s10b = "async function deleteAbastecimento(id) {\n      if (!(await confirmarAcao('Deseja excluir este registro de abastecimento?', { titulo: 'Excluir Abastecimento', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s10a) !== -1) { html = html.replace(s10a, s10b); mudancas++; console.log('  [OK] deleteAbastecimento refatorada'); }

// Substituicao 11: deleteManutencao
const s11a = "async function deleteManutencao(id) {\n      if (!confirm('Deseja excluir este registro de manutencao?')) return;";
const s11b = "async function deleteManutencao(id) {\n      if (!(await confirmarAcao('Deseja excluir este registro de manutencao?', { titulo: 'Excluir Manutencao', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s11a) !== -1) { html = html.replace(s11a, s11b); mudancas++; console.log('  [OK] deleteManutencao refatorada'); }

// Substituicao 12: deleteDocumento
const s12a = "async function deleteDocumento(id) {\n      if (!confirm('Deseja excluir este documento?')) return;";
const s12b = "async function deleteDocumento(id) {\n      if (!(await confirmarAcao('Deseja excluir este documento?', { titulo: 'Excluir Documento', tipo: 'danger', textoConfirmar: 'Excluir' }))) return;";
if (html.indexOf(s12a) !== -1) { html = html.replace(s12a, s12b); mudancas++; console.log('  [OK] deleteDocumento refatorada'); }

// Substituicao 13: excluirUsuario (na tela de usuarios)
const s13a = "async function excluirUsuario(id, nome) {\n      if (!confirm(`Desativar o usuario \"${nome}\"?`)) return;";
const s13b = "async function excluirUsuario(id, nome) {\n      if (!(await confirmarAcao('Desativar o usuario \"' + nome + '\"?', { titulo: 'Desativar Usuario', tipo: 'warning', textoConfirmar: 'Desativar' }))) return;";
if (html.indexOf(s13a) !== -1) { html = html.replace(s13a, s13b); mudancas++; console.log('  [OK] excluirUsuario refatorada'); }

console.log('');
console.log('  Total de refatoracoes: ' + mudancas);
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (mudancas === 0) {
  console.log('  [AVISO] Nenhuma funcao foi refatorada. Talvez os nomes ou formatos sejam diferentes.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Exclusoes refatoradas para usar o modal bonito!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. Teste localmente (index.html no navegador)');
console.log('  2. git add . && git commit -m "feat(ux): refatorar exclusoes para usar modal de confirmacao"');
console.log('  3. git push origin main');
