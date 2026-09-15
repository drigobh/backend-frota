/**
 * ============================================================================
 * CORRECAO FASE 2 - 10a - Backend do Ranking (Indicadores)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/ranking.js';

const CONTEUDO = `const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // RANKING DE VEICULOS - Retorna todos os veiculos com seus KPIs
  // ==========================================================================
  fastify.get('/api/ranking', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes } = req.query;

    if (!mes) {
      return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio (YYYY-MM-DD).' });
    }

    try {
      // 1) Busca todos os veiculos ativos
      const veicRes = await db.query(
        "SELECT id, placa, modelo FROM veiculos WHERE status = 'ATIVO' ORDER BY placa"
      );
      const veiculos = veicRes.rows;

      // 2) Busca lancamentos do mes
      const lancRes = await db.query(\`
        SELECT 
          l.veiculo_id,
          l.tipo,
          l.valor
        FROM lancamentos_financeiros l
        WHERE DATE_TRUNC('month', l.data_lancamento) = $1::date
          AND l.deleted_at IS NULL
      \`, [mes]);

      // 3) Busca abastecimentos do mes (combustivel)
      const abastRes = await db.query(\`
        SELECT 
          veiculo_id,
          COALESCE(SUM(valor_total), 0) AS valor,
          COALESCE(SUM(litros), 0) AS litros
        FROM abastecimentos
        WHERE DATE_TRUNC('month', data_abastecimento) = $1::date
          AND deleted_at IS NULL
        GROUP BY veiculo_id
      \`, [mes]);

      // 4) Busca KM rodado do mes
      const kmRes = await db.query(\`
        SELECT 
          veiculo_id,
          COALESCE(SUM(GREATEST(0, km_final - km_inicial)), 0) AS km_rodado
        FROM controle_km
        WHERE mes_referencia = $1::date
        GROUP BY veiculo_id
      \`, [mes]);

      // Indexadores por veiculo
      const combustivelPorVeic = {};
      abastRes.rows.forEach(function(r) {
        combustivelPorVeic[r.veiculo_id] = {
          valor: parseFloat(r.valor) || 0,
          litros: parseFloat(r.litros) || 0,
        };
      });

      const kmPorVeic = {};
      kmRes.rows.forEach(function(r) {
        kmPorVeic[r.veiculo_id] = parseInt(r.km_rodado) || 0;
      });

      // 5) Consolida por veiculo
      const ranking = veiculos.map(function(v) {
        let receita = 0;
        let despesaManual = 0;

        lancRes.rows.forEach(function(l) {
          if (l.veiculo_id === v.id) {
            const valor = parseFloat(l.valor) || 0;
            if (l.tipo === 'Receita') receita += valor;
            if (l.tipo === 'Despesa') despesaManual += valor;
          }
        });

        const comb = combustivelPorVeic[v.id] || { valor: 0, litros: 0 };
        const km = kmPorVeic[v.id] || 0;

        const despesaTotal = despesaManual + comb.valor;
        const resultado = receita - despesaTotal;
        const margem = receita > 0 ? (resultado / receita) * 100 : 0;
        const kml = comb.litros > 0 && km > 0 ? (km / comb.litros) : 0;
        const receitaPorKm = km > 0 ? (receita / km) : 0;
        const custoPorKm = km > 0 ? (despesaTotal / km) : 0;

        return {
          veiculo_id: v.id,
          placa: v.placa,
          modelo: v.modelo || '',
          receita: receita,
          despesa: despesaTotal,
          combustivel: comb.valor,
          litros: comb.litros,
          resultado: resultado,
          margem: margem,
          km_rodado: km,
          kml: kml,
          receita_por_km: receitaPorKm,
          custo_por_km: custoPorKm,
        };
      });

      // Ordena por resultado DESC (ranking principal)
      ranking.sort(function(a, b) { return b.resultado - a.resultado; });

      // Adiciona posicao
      ranking.forEach(function(r, i) { r.posicao = i + 1; });

      return reply.send({
        mes: mes,
        total_veiculos: ranking.length,
        ranking: ranking,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_10a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 10a - Backend Ranking');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');
console.log('   Arquivo: ' + ARQUIVO);
console.log('   Rota: GET /api/ranking?mes=YYYY-MM-DD');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Arquivo seria criado (' + CONTEUDO.length + ' chars).');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const absPath = path.resolve(ROOT, ARQUIVO);
if (fs.existsSync(absPath)) {
  const backupPath = garantirBackup(ARQUIVO);
  console.log('   [BACKUP] ' + backupPath);
}
fs.mkdirSync(path.dirname(absPath), { recursive: true });
fs.writeFileSync(absPath, CONTEUDO, 'utf8');
console.log('   [OK] Arquivo criado: ' + ARQUIVO);
console.log('');
console.log('PROXIMO PASSO OBRIGATORIO:');
console.log('  1. Abra src/server.js');
console.log('  2. Apos: fastify.register(require(\'./routes/dre_veiculo\'));');
console.log('  3. Adicione: fastify.register(require(\'./routes/ranking\'));');
console.log('  4. Salve, commit + push');
