const db = require("../database");

// ============================================================
// [FIX_HISTORICO] Funcao auxiliar para registrar movimentacoes
// ============================================================
async function registrarHistorico(db, dados) {
    try {
        await db.query(
            `INSERT INTO acoplamentos_historico 
             (acoplamento_id, usuario_id, usuario_nome, acao, 
              veiculo_id, veiculo_placa, carreta_id, carreta_codigo, 
              motorista_id, motorista_nome, mes_referencia, detalhes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                dados.acoplamento_id || null, dados.usuario_id || null, dados.usuario_nome || 'Sistema', dados.acao,
                dados.veiculo_id || null, dados.veiculo_placa || null, dados.carreta_id || null, dados.carreta_codigo || null,
                dados.motorista_id || null, dados.motorista_nome || null, dados.mes_referencia || null, dados.detalhes || null
            ]
        );
        console.log('[HISTORICO] Registrado:', dados.acao, '-', dados.detalhes);
    } catch (err) {
        console.error('[HISTORICO] Erro ao registrar:', err.message);
    }
}

// ============================================================
// [FIX_HISTORICO] Buscar informacoes de um item (placa/codigo/nome)
// ============================================================
async function buscarInfoItem(db, tipo, id) {
    if (!id) return null;
    try {
        if (tipo === 'veiculo') {
            const r = await db.query('SELECT placa FROM veiculos WHERE id = $1', [id]);
            return r.rows.length > 0 ? r.rows[0].placa : null;
        }
        if (tipo === 'carreta') {
            const r = await db.query('SELECT codigo FROM carretas WHERE id = $1', [id]);
            return r.rows.length > 0 ? r.rows[0].codigo : null;
        }
        if (tipo === 'motorista') {
            const r = await db.query('SELECT nome FROM motoristas WHERE id = $1', [id]);
            return r.rows.length > 0 ? r.rows[0].nome : null;
        }
    } catch (err) {
        console.error('[HISTORICO] Erro ao buscar info:', err.message);
    }
    return null;
}

module.exports = async function (fastify, options) {
    // ============================================================
    // ROTA DE HISTORICO (antes da rota :mes para nao conflitar)
    // ============================================================
    fastify.get(
        "/api/acoplamentos/historico",
        {
            preHandler: [fastify.autenticar]
        },
        async (request, reply) => {
            try {
                const { rows } = await db.query(
                    `SELECT id, acoplamento_id, usuario_nome, acao, 
                            veiculo_placa, carreta_codigo, motorista_nome, 
                            mes_referencia, data_hora, detalhes
                     FROM acoplamentos_historico
                     ORDER BY data_hora ASC, id ASC
                     LIMIT 500`
                );
                return rows;
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({ erro: err.message });
            }
        }
    );

    // ============================================================
    // Listar acoplamentos do mes
    // ============================================================
    fastify.get(
        "/api/acoplamentos/:mes",
        {
            preHandler: [fastify.autenticar]
        },
        async (request, reply) => {
            const { mes } = request.params;
            const { rows } = await db.query(
                `SELECT id, veiculo_id, carreta_id, motorista_id, status, data_inicio
                  FROM acoplamentos
                  WHERE data_inicio = $1 AND status = 'ATIVO' AND deleted_at IS NULL
                  ORDER BY created_at ASC`,
                [mes]
            );
            return rows;
        }
    );

    // ============================================================
    // ============================================================
    // Criar acoplamento (registra ACOPLADO somente se completo)
    // ============================================================
    fastify.post(
        "/api/acoplamentos",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["mes_referencia"],
                    additionalProperties: true,
                    properties: {
                        mes_referencia: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
                        veiculo_id: { type: ["string", "number", "null"] },
                        carreta_id: { type: ["string", "number", "null"] },
                        motorista_id: { type: ["string", "number", "null"] }
                    }
                }
            },
            preHandler: [fastify.autenticar]
        },
        async (request, reply) => {
            const { mes_referencia, veiculo_id, carreta_id, motorista_id } = request.body;

            try {
                // Validacoes de duplicata
                if (veiculo_id) {
                    const check = await db.query(
                        `SELECT id FROM acoplamentos WHERE data_inicio = $1 AND veiculo_id = $2 AND status = 'ATIVO' AND deleted_at IS NULL`,
                        [mes_referencia, veiculo_id]
                    );
                    if (check.rows.length > 0) {
                        return reply.code(400).send({ erro: "Este cavalo ja esta em uso em outro acoplamento ativo neste mes!" });
                    }
                }
                if (carreta_id) {
                    const check = await db.query(
                        `SELECT id FROM acoplamentos WHERE data_inicio = $1 AND carreta_id = $2 AND status = 'ATIVO' AND deleted_at IS NULL`,
                        [mes_referencia, carreta_id]
                    );
                    if (check.rows.length > 0) {
                        return reply.code(400).send({ erro: "Esta carreta ja esta acoplada a outro conjunto ativo neste mes!" });
                    }
                }
                if (motorista_id) {
                    const check = await db.query(
                        `SELECT id FROM acoplamentos WHERE data_inicio = $1 AND motorista_id = $2 AND status = 'ATIVO' AND deleted_at IS NULL`,
                        [mes_referencia, motorista_id]
                    );
                    if (check.rows.length > 0) {
                        return reply.code(400).send({ erro: "Este motorista ja esta escalado para outro conjunto ativo neste mes!" });
                    }
                }

                const result = await db.query(
                    `INSERT INTO acoplamentos
                     (data_inicio, veiculo_id, carreta_id, motorista_id, status)
                     VALUES ($1, $2, $3, $4, 'ATIVO')
                     RETURNING *`,
                    [mes_referencia, veiculo_id || null, carreta_id || null, motorista_id || null]
                );

                // [FIX_CONJUNTO_COMPLETO] Registrar ACOPLADO SOMENTE se conjunto estiver completo
                const conjuntoCompleto = veiculo_id && carreta_id && motorista_id;

                if (conjuntoCompleto) {
                    const usuario = request.user || {};
                    const vPlaca = await buscarInfoItem(db, 'veiculo', veiculo_id);
                    const cCodigo = await buscarInfoItem(db, 'carreta', carreta_id);
                    const mNome = await buscarInfoItem(db, 'motorista', motorista_id);

                    let detalhes = 'Acoplamento criado:';
                    if (vPlaca) detalhes += ' 🚛 ' + vPlaca;
                    if (cCodigo) detalhes += ' 🚚 ' + cCodigo;
                    if (mNome) detalhes += ' 👤 ' + mNome;

                    await registrarHistorico(db, {
                        acoplamento_id: result.rows[0].id,
                        usuario_id: usuario.id || null,
                        usuario_nome: usuario.nome || 'Sistema',
                        acao: 'ACOPLADO',
                        veiculo_id: veiculo_id,
                        veiculo_placa: vPlaca,
                        carreta_id: carreta_id,
                        carreta_codigo: cCodigo,
                        motorista_id: motorista_id,
                        motorista_nome: mNome,
                        mes_referencia: mes_referencia,
                        detalhes: detalhes
                    });
                }

                return reply.code(201).send(result.rows[0]);
            } catch (err) {
                fastify.log.error(err);
                return reply.code(500).send({ erro: err.message });
            }
        }
    );

    // ============================================================
    // Atualizar acoplamento (registra DESACOPLADO + ACOPLADO se completo)
    // ============================================================
    fastify.put(
        "/api/acoplamentos/:id",
        {
            preHandler: [fastify.autenticar]
        },
        async (request, reply) => {
            const { id } = request.params;
            const { veiculo_id, carreta_id, motorista_id } = request.body;

            try {
                const antes = await db.query('SELECT * FROM acoplamentos WHERE id = $1', [id]);
                if (antes.rows.length === 0) {
                    return reply.status(404).send({ erro: 'Acoplamento nao encontrado.' });
                }
                const antigo = antes.rows[0];
                const usuario = request.user || {};

                // Verificar se houve mudanca
                const mudou = (antigo.veiculo_id !== (veiculo_id || null)) ||
                              (antigo.carreta_id !== (carreta_id || null)) ||
                              (antigo.motorista_id !== (motorista_id || null));

                if (mudou) {
                    // 1. Registrar DESACOPLADO (apenas o que saiu)
                    var itensRemovidos = [];
                    if (antigo.veiculo_id && antigo.veiculo_id !== (veiculo_id || null)) {
                        const vOld = await buscarInfoItem(db, 'veiculo', antigo.veiculo_id);
                        if (vOld) itensRemovidos.push('🚛 ' + vOld);
                    }
                    if (antigo.carreta_id && antigo.carreta_id !== (carreta_id || null)) {
                        const cOld = await buscarInfoItem(db, 'carreta', antigo.carreta_id);
                        if (cOld) itensRemovidos.push('🚚 ' + cOld);
                    }
                    if (antigo.motorista_id && antigo.motorista_id !== (motorista_id || null)) {
                        const mOld = await buscarInfoItem(db, 'motorista', antigo.motorista_id);
                        if (mOld) itensRemovidos.push('👤 ' + mOld);
                    }

                    if (itensRemovidos.length > 0) {
                        await registrarHistorico(db, {
                            acoplamento_id: id,
                            usuario_id: usuario.id || null,
                            usuario_nome: usuario.nome || 'Sistema',
                            acao: 'DESACOPLADO',
                            veiculo_id: antigo.veiculo_id,
                            veiculo_placa: antigo.veiculo_id ? await buscarInfoItem(db, 'veiculo', antigo.veiculo_id) : null,
                            carreta_id: antigo.carreta_id,
                            carreta_codigo: antigo.carreta_id ? await buscarInfoItem(db, 'carreta', antigo.carreta_id) : null,
                            motorista_id: antigo.motorista_id,
                            motorista_nome: antigo.motorista_id ? await buscarInfoItem(db, 'motorista', antigo.motorista_id) : null,
                            mes_referencia: antigo.data_inicio,
                            detalhes: 'Desacoplado: ' + itensRemovidos.join(' ')
                        });
                    }

                    // 2. Registrar ACOPLADO do NOVO conjunto (SOMENTE se completo)
                    const conjuntoCompleto = veiculo_id && carreta_id && motorista_id;

                    if (conjuntoCompleto) {
                        const vNew = await buscarInfoItem(db, 'veiculo', veiculo_id);
                        const cNew = await buscarInfoItem(db, 'carreta', carreta_id);
                        const mNew = await buscarInfoItem(db, 'motorista', motorista_id);

                        let detalhesNew = 'Novo conjunto:';
                        if (vNew) detalhesNew += ' 🚛 ' + vNew;
                        if (cNew) detalhesNew += ' 🚚 ' + cNew;
                        if (mNew) detalhesNew += ' 👤 ' + mNew;

                        await registrarHistorico(db, {
                            acoplamento_id: id,
                            usuario_id: usuario.id || null,
                            usuario_nome: usuario.nome || 'Sistema',
                            acao: 'ACOPLADO',
                            veiculo_id: veiculo_id,
                            veiculo_placa: vNew,
                            carreta_id: carreta_id,
                            carreta_codigo: cNew,
                            motorista_id: motorista_id,
                            motorista_nome: mNew,
                            mes_referencia: antigo.data_inicio,
                            detalhes: detalhesNew
                        });
                    }
                }

                // Atualizar o acoplamento
                await db.query(
                    `UPDATE acoplamentos SET veiculo_id = $1, carreta_id = $2, motorista_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
                    [veiculo_id || null, carreta_id || null, motorista_id || null, id]
                );

                return { sucesso: true };
            } catch (error) {
                if (error.code === "23505") {
                    return reply.status(409).send({ erro: "O veiculo, carreta ou motorista selecionado ja esta em uso em outro acoplamento ativo." });
                }
                fastify.log.error(error);
                return reply.status(500).send({ erro: "Erro interno" });
            }
        }
    );

    // ============================================================
    // Excluir acoplamento (soft delete + historico)
    // ============================================================
    fastify.delete(
        "/api/acoplamentos/:id",
        {
            preHandler: [fastify.autenticar]
        },
        async (request, reply) => {
            const { id } = request.params;

            try {
                const acop = await db.query('SELECT * FROM acoplamentos WHERE id = $1', [id]);
                if (acop.rows.length === 0) {
                    return reply.status(404).send({ erro: 'Acoplamento nao encontrado.' });
                }
                const a = acop.rows[0];

                const usuario = request.user || {};
                const vPlaca = await buscarInfoItem(db, 'veiculo', a.veiculo_id);
                const cCodigo = await buscarInfoItem(db, 'carreta', a.carreta_id);
                const mNome = await buscarInfoItem(db, 'motorista', a.motorista_id);

                let detalhes = 'Acoplamento excluido:';
                if (vPlaca) detalhes += ' 🚛 ' + vPlaca;
                if (cCodigo) detalhes += ' 🚚 ' + cCodigo;
                if (mNome) detalhes += ' 👤 ' + mNome;

                await registrarHistorico(db, {
                    acoplamento_id: id,
                    usuario_id: usuario.id || null,
                    usuario_nome: usuario.nome || 'Sistema',
                    acao: 'EXCLUIDO',
                    veiculo_id: a.veiculo_id,
                    veiculo_placa: vPlaca,
                    carreta_id: a.carreta_id,
                    carreta_codigo: cCodigo,
                    motorista_id: a.motorista_id,
                    motorista_nome: mNome,
                    mes_referencia: a.data_inicio,
                    detalhes: detalhes
                });

                await db.query(
                    `UPDATE acoplamentos SET status = 'INATIVO', deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
                    [id]
                );

                return { sucesso: true };
            } catch (err) {
                console.error('[FIX_HISTORICO] Erro ao excluir:', err);
                return reply.status(500).send({ erro: err.message });
            }
        }
    );
};
