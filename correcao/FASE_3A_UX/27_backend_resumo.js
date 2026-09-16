const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_27_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 27 - Backend: resumo usa filtros completos');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// Encontra a rota /api/lancamentos/resumo e ajusta para usar os mesmos filtros
const ANTES = `fastify.get('/api/lancamentos/resumo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes } = req.query;

    try {
      if (!mes) {
        return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio.' });
      }`;

const DEPOIS = `fastify.get('/api/lancamentos/resumo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    let { mes, mesNumero, ano, tipo, categoria, veiculo, dias, periodo } = req.query;

    function limpar(v) { return (v === '---------' || v === '' || v === undefined) ? undefined : v; }
    mes = limpar(mes); mesNumero = limpar(mesNumero); ano = limpar(ano);
    tipo = limpar(tipo); categoria = limpar(categoria); veiculo = limpar(veiculo);
    dias = limpar(dias); periodo = limpar(periodo);

    try {`;

if (js.indexOf(ANTES) !== -1) {
  js = js.replace(ANTES, DEPOIS);
  console.log('  [OK] Rota de resumo aceita todos os filtros');
} else {
  console.log('  [AVISO] Bloco de resumo nao casou exatamente');
  console.log('  Verificar manualmente a rota /api/lancamentos/resumo');
}

// Encontra a query do resumo e ajusta para nao exigir `mes`
const ANTES2 = `      const result = await db.query(\`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0) AS receitas,
          COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0) AS despesas,
          COUNT(*) AS total_lancamentos
        FROM lancamentos_financeiros
        WHERE DATE_TRUNC('month', data_lancamento) = $1::date
          AND deleted_at IS NULL
      \`, [mes]);`;

const DEPOIS2 = `      // Monta query dinamicamente com os mesmos filtros da lista
      let query = \`
        SELECT 
          COALESCE(SUM(CASE WHEN l.tipo = 'Receita' THEN l.valor ELSE 0 END), 0) AS receitas,
          COALESCE(SUM(CASE WHEN l.tipo = 'Despesa' THEN l.valor ELSE 0 END), 0) AS despesas,
          COUNT(*) AS total_lancamentos
        FROM lancamentos_financeiros l
        LEFT JOIN veiculos v ON v.id = l.veiculo_id
        LEFT JOIN categorias_financeiras c ON c.id = l.categoria_id
        WHERE l.deleted_at IS NULL
      \`;
      const params = [];
      let idx = 1;

      if (periodo === 'tudo') {
        // sem filtro
      } else if (dias) {
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days') AND l.data_lancamento <= CURRENT_DATE\`;
        }
      } else if (mes) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes); idx++;
      } else {
        if (ano) { query += \` AND EXTRACT(YEAR FROM l.data_lancamento) = $\${idx}::int\`; params.push(parseInt(ano)); idx++; }
        if (mesNumero) { query += \` AND EXTRACT(MONTH FROM l.data_lancamento) = $\${idx}::int\`; params.push(parseInt(mesNumero)); idx++; }
      }
      if (tipo) { query += \` AND l.tipo = $\${idx}\`; params.push(tipo); idx++; }
      if (categoria) { query += \` AND c.nome = $\${idx}\`; params.push(categoria); idx++; }
      if (veiculo) { query += \` AND v.placa = $\${idx}\`; params.push(veiculo); idx++; }

      const result = await db.query(query, params);`;

if (js.indexOf(ANTES2) !== -1) {
  js = js.replace(ANTES2, DEPOIS2);
  console.log('  [OK] Query do resumo agora usa filtros dinamicos');
} else {
  console.log('  [AVISO] Query do resumo nao casou');
}

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + js.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, js, 'utf8');
console.log('  [OK] Backend atualizado!');
