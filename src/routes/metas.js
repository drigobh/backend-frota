// FASE_6_METAS_ENVELOPADO
const db = require("../database");

// FASE_3B_VALIDACAO_FINANCEIRO

module.exports = async function (fastify, options) {
  // LISTAR METAS
  fastify.get("/api/metas", { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes, veiculo_id } = req.query;
    try {
      let query = `
        SELECT 
          m.id, m.veiculo_id, m.mes_referencia, m.tipo_meta,
          m.valor_meta, m.observacao, m.created_at,
          v.placa, v.modelo
        FROM metas m
        LEFT JOIN veiculos v ON v.id = m.veiculo_id
        WHERE 1=1
      `;
      const params = [];
      let idx = 1;
      if (mes) {
        query += ` AND m.mes_referencia = $${idx}::date`;
        params.push(mes);
        idx++;
      }
      if (veiculo_id) {
        query += ` AND m.veiculo_id = $${idx}`;
        params.push(veiculo_id);
        idx++;
      }
      query += " ORDER BY m.mes_referencia DESC, v.placa, m.tipo_meta";

      const res = await db.query(query, params);
      return reply.send(
        res.rows.map(function (m) {
          return Object.assign({}, m, {
            mes_referencia:
              m.mes_referencia instanceof Date ? m.mes_referencia.toISOString().split("T")[0] : m.mes_referencia
          });
        })
      );
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ACOMPANHAMENTO
  fastify.get("/api/metas/acompanhamento", { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes } = req.query;
    if (!mes) return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio.' });

    try {
      const metasRes = await db.query(
        `
        SELECT m.id, m.veiculo_id, m.tipo_meta, m.valor_meta, v.placa, v.modelo
        FROM metas m
        LEFT JOIN veiculos v ON v.id = m.veiculo_id
        WHERE m.mes_referencia = $1::date
      `,
        [mes]
      );

      const veiculosRes = await db.query(
        `
        SELECT DISTINCT veiculo_id FROM metas WHERE mes_referencia = $1::date
      `,
        [mes]
      );
      const veiculoIds = veiculosRes.rows.map(function (r) {
        return r.veiculo_id;
      });

      const reaisPorVeiculo = {};
      if (veiculoIds.length > 0) {
        // [FIX_PERF_N1] Queries agregadas — elimina N+1 (3 queries em vez de 3*N)
        const [lancAgg, abAgg, kmAgg] = await Promise.all([
          db.query(
            `
            SELECT veiculo_id, tipo, COALESCE(SUM(valor), 0) AS total
            FROM lancamentos_financeiros
            WHERE veiculo_id = ANY($1::uuid[])
              AND DATE_TRUNC('month', data_lancamento) = $2::date
              AND deleted_at IS NULL
            GROUP BY veiculo_id, tipo
          `,
            [veiculoIds, mes]
          ),
          db.query(
            `
            SELECT veiculo_id, COALESCE(SUM(valor_total), 0) AS total
            FROM abastecimentos
            WHERE veiculo_id = ANY($1::uuid[])
              AND DATE_TRUNC('month', data_abastecimento) = $2::date
              AND deleted_at IS NULL
            GROUP BY veiculo_id
          `,
            [veiculoIds, mes]
          ),
          db.query(
            `
            SELECT veiculo_id, COALESCE(SUM(GREATEST(0, km_final - km_inicial)), 0) AS km
            FROM controle_km
            WHERE veiculo_id = ANY($1::uuid[]) AND mes_referencia = $2::date
            GROUP BY veiculo_id
          `,
            [veiculoIds, mes]
          )
        ]);

        // Mapear resultados agregados
        const lancMap = {};
        lancAgg.rows.forEach(function (r) {
          if (!lancMap[r.veiculo_id]) lancMap[r.veiculo_id] = { receita: 0, despesa: 0 };
          if (r.tipo === "Receita") lancMap[r.veiculo_id].receita = parseFloat(r.total) || 0;
          if (r.tipo === "Despesa") lancMap[r.veiculo_id].despesa = parseFloat(r.total) || 0;
        });

        const abMap = {};
        abAgg.rows.forEach(function (r) {
          abMap[r.veiculo_id] = parseFloat(r.total) || 0;
        });

        const kmMap = {};
        kmAgg.rows.forEach(function (r) {
          kmMap[r.veiculo_id] = parseInt(r.km) || 0;
        });

        // Consolidar por veiculo
        veiculoIds.forEach(function (vid) {
          const lanc = lancMap[vid] || { receita: 0, despesa: 0 };
          const comb = abMap[vid] || 0;
          const kmRodado = kmMap[vid] || 0;
          const despesaTotal = lanc.despesa + comb;
          reaisPorVeiculo[vid] = {
            receita: lanc.receita,
            resultado: lanc.receita - despesaTotal,
            km: kmRodado
          };
        });
      }

      const acompanhamento = metasRes.rows.map(function (m) {
        const reais = reaisPorVeiculo[m.veiculo_id] || { receita: 0, resultado: 0, km: 0 };
        let valorReal = 0;
        if (m.tipo_meta === "receita") valorReal = reais.receita;
        if (m.tipo_meta === "resultado") valorReal = reais.resultado;
        if (m.tipo_meta === "km") valorReal = reais.km;
        const metaNum = parseFloat(m.valor_meta) || 0;
        const atingimento = metaNum > 0 ? (valorReal / metaNum) * 100 : 0;
        return {
          id: m.id,
          veiculo_id: m.veiculo_id,
          placa: m.placa,
          modelo: m.modelo,
          tipo_meta: m.tipo_meta,
          valor_meta: metaNum,
          valor_real: valorReal,
          atingimento: atingimento,
          status: atingimento >= 100 ? "ATINGIDA" : atingimento >= 70 ? "PROXIMA" : "ABAIXO"
        };
      });

      const resumo = {
        total_metas: acompanhamento.length,
        atingidas: acompanhamento.filter(function (a) {
          return a.status === "ATINGIDA";
        }).length,
        proximas: acompanhamento.filter(function (a) {
          return a.status === "PROXIMA";
        }).length,
        abaixo: acompanhamento.filter(function (a) {
          return a.status === "ABAIXO";
        }).length
      };

      return reply.send({ mes: mes, resumo: resumo, metas: acompanhamento });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // CRIAR
  fastify.post(
    "/api/metas",
    {
      schema: {
        body: {
          type: "object",
          required: ["veiculo_id", "mes_referencia", "tipo_meta", "valor_meta"],
          additionalProperties: true,
          properties: {
            veiculo_id: {
              type: "string"
            },
            mes_referencia: {
              type: "string",
              pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
            },
            tipo_meta: {
              type: "string",
              enum: ["receita", "resultado", "km"]
            },
            valor_meta: {
              type: "number",
              minimum: 0.01
            },
            observacao: {
              type: "string",
              maxLength: 500
            }
          }
        }
      },
      preHandler: [fastify.autenticar]
    },
    fastify.comAuditoria(async (req, reply) => {
      const { veiculo_id, mes_referencia, tipo_meta, valor_meta, observacao } = req.body || {};
      if (!veiculo_id || !mes_referencia || !tipo_meta || !valor_meta) {
        return reply
          .code(400)
          .send({ erro: "Campos obrigatorios: veiculo_id, mes_referencia, tipo_meta, valor_meta." });
      }
      if (["receita", "resultado", "km"].indexOf(tipo_meta) === -1) {
        return reply.code(400).send({ erro: "tipo_meta deve ser: receita, resultado ou km." });
      }
      if (parseFloat(valor_meta) <= 0) {
        return reply.code(400).send({ erro: "valor_meta deve ser maior que zero." });
      }
      try {
        const res = await db.query(
          `
        INSERT INTO metas (veiculo_id, mes_referencia, tipo_meta, valor_meta, observacao, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
          [veiculo_id, mes_referencia, tipo_meta, parseFloat(valor_meta), observacao || null, req.user.id]
        );
        return reply.code(201).send(res.rows[0]);
      } catch (err) {
        if (err.code === "23505") {
          return reply.code(409).send({ erro: "Ja existe uma meta deste tipo para este veiculo neste mes." });
        }
        return reply.code(500).send({ erro: err.message });
      }
    })
  );

  // ATUALIZAR
  fastify.put(
    "/api/metas/:id",
    {
      schema: {
        body: {
          type: "object",
          required: ["valor_meta"],
          additionalProperties: true,
          properties: {
            valor_meta: {
              type: "number",
              minimum: 0.01
            },
            observacao: {
              type: "string",
              maxLength: 500
            }
          }
        }
      },
      preHandler: [fastify.autenticar]
    },
    fastify.comAuditoria(async (req, reply) => {
      const { id } = req.params;
      const { valor_meta, observacao } = req.body || {};
      if (parseFloat(valor_meta) <= 0) {
        return reply.code(400).send({ erro: "valor_meta deve ser maior que zero." });
      }
      try {
        const res = await db.query(
          `
        UPDATE metas SET valor_meta = $1, observacao = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 RETURNING *
      `,
          [parseFloat(valor_meta), observacao || null, id]
        );
        if (res.rows.length === 0) return reply.code(404).send({ erro: "Meta nao encontrada." });
        return reply.send(res.rows[0]);
      } catch (err) {
        return reply.code(500).send({ erro: err.message });
      }
    })
  );

  // EXCLUIR
  fastify.delete(
    "/api/metas/:id",
    { preHandler: [fastify.autenticar] },
    fastify.comAuditoria(async (req, reply) => {
      try {
        await db.query("DELETE FROM metas WHERE id = $1", [req.params.id]);
        return reply.send({ sucesso: true });
      } catch (err) {
        return reply.code(500).send({ erro: err.message });
      }
    })
  );
};
