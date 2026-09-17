const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const HTML   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('Restaurando acentos portugueses');
console.log('===============================================\n');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

let html = fs.readFileSync(HTML, 'utf8');
const original = html;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_acentos.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

const subs = [
  ['Operacoes', 'Operações'],
  ['Operacao', 'Operação'],
  ['Sistema Integrado de Frotas & Operacao', 'Sistema Integrado de Frotas & Operação'],
  ['Gestao de Frota', 'Gestão de Frota'],
  ['Mes de Referencia', 'Mês de Referência'],
  ['Mes de Refer', 'Mês de Refer'],
  ['Mes/Ano', 'Mês/Ano'],
  ['Mes Aberto', 'Mês Aberto'],
  ['Congelar Mes', 'Congelar Mês'],
  ['Descongelar Mes', 'Descongelar Mês'],
  ['Competencia', 'Competência'],
  ['Referencia', 'Referência'],
  ['Visao Geral', 'Visão Geral'],
  ['Visao', 'Visão'],
  ['Descricao', 'Descrição'],
  ['Lancamentos', 'Lançamentos'],
  ['Lancamento', 'Lançamento'],
  ['Manutencao', 'Manutenção'],
  ['Documentacao', 'Documentação'],
  ['Acoes', 'Ações'],
  ['Acao', 'Ação'],
  ['Veiculos', 'Veículos'],
  ['Veiculo', 'Veículo'],
  ['Usuarios', 'Usuários'],
  ['Usuario', 'Usuário'],
  ['Graficos', 'Gráficos'],
  ['Grafico', 'Gráfico'],
  ['Administracao', 'Administração'],
  ['Permissoes', 'Permissões'],
  ['Historico', 'Histórico'],
  ['Relatorio', 'Relatório'],
  ['Exportar Relatorio', 'Exportar Relatório'],
  ['Resultado Liquido', 'Resultado Líquido'],
  ['Configuracao', 'Configuração'],
  ['Implementacao', 'Implementação'],
  ['Informacao', 'Informação'],
  ['Alteracao', 'Alteração'],
  ['Possivel', 'Possível'],
  ['Voce', 'Você'],
  ['Nao ', 'Não '],
  ['Ordem de exibicao', 'Ordem de exibição'],
  ['exibicao', 'exibição'],
  ['Usuario Responsavel', 'Usuário Responsável'],
  ['Responsavel', 'Responsável'],
  ['Numero da Nota', 'Número da Nota'],
  ['Numero', 'Número'],
  ['Codigo', 'Código'],
  ['Descricao dos Servicos', 'Descrição dos Serviços'],
  ['Servicos', 'Serviços'],
  ['Observacoes', 'Observações'],
  ['Observacao', 'Observação'],
  ['Disponiveis', 'Disponíveis'],
  ['Disponivel', 'Disponível'],
  ['Ativo', 'Ativo'],
  ['Exibicao', 'Exibição'],
  ['Registro de Quilometragem', 'Registro de Quilometragem'],
  ['Gestao', 'Gestão'],
  ['Periodo', 'Período'],
  ['Selecione a placa', 'Selecione a placa'],
  ['Placa do Cavalo', 'Placa do Cavalo'],
  ['Pesquisar em qualquer coluna', 'Pesquisar em qualquer coluna'],
  ['Trilha de Auditoria', 'Trilha de Auditoria'],
  ['Log de Atividades', 'Log de Atividades'],
  ['Historico de Acoes', 'Histórico de Ações'],
  ['Limpar Logs', 'Limpar Logs'],
  ['Testar Auditoria', 'Testar Auditoria'],
  ['Exportar CSV', 'Exportar CSV']
];

subs.forEach(function(pair) {
  const errado = pair[0];
  const certo = pair[1];
  if (errado === certo) return;
  const count = (html.match(new RegExp(errado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 0) {
    html = html.split(errado).join(certo);
    mudancas += count;
    console.log('  OK: ' + errado + ' -> ' + certo + ' (' + count + 'x)');
  }
});

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('\n===============================================');
  console.log('OK: ' + mudancas + ' substituicoes feitas');
  console.log('===============================================');
} else {
  console.log('\nNenhuma substituicao.');
}
console.log('');
