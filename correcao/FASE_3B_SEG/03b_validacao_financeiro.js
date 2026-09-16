/**
 * ============================================================================
 * FASE 3B — SEGURANÇA — SCRIPT 03b
 * Validação de schema em rotas FINANCEIRAS
 * ============================================================================
 * Rotas validadas:
 *   - POST /api/lancamentos
 *   - PUT  /api/lancamentos/:id
 *   - POST /api/categorias
 *   - PUT  /api/categorias/:id
 *   - POST /api/centros-custo
 *   - PUT  /api/centros-custo/:id
 *   - POST /api/metas
 *   - PUT  /api/metas/:id
 *
 * Nivel de rigor: EQUILIBRADO
 *   - Exige campos obrigatorios
 *   - Valida tipos, formatos e enums
 *   - tipo: SOMENTE 'Receita' ou 'Despesa' (case-sensitive)
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');

const MARCADOR = '// FASE_3B_VALIDACAO_FINANCEIRO';

console.log('\n===============================================');
console.log('FASE 3B - Validacao: FINANCEIRO');
console.log('===============================================\n');

const ALVOS = [
  { arquivo: 'src/routes/lancamentos.js', schemas: [
    { metodo: 'post', rota: '/api/lancamentos', schema: {
      body: {
        type: 'object',
        required: ['data', 'tipo', 'categoria', 'descricao', 'valor'],
        additionalProperties: true,
        properties: {
          data: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          tipo: { type: 'string', enum: ['Receita', 'Despesa'] },
          categoria: { type: 'string', minLength: 1, maxLength: 100 },
          descricao: { type: 'string', minLength: 1, maxLength: 255 },
          valor: { type: 'number', minimum: 0.01 },
          placa: { type: 'string', maxLength: 20 },
          centro_custo_id: { type: ['string', 'null'] }
        }
      }
    }},
    { metodo: 'put', rota: '/api/lancamentos/:id', schema: {
      body: {
        type: 'object',
        required: ['data', 'tipo', 'categoria', 'descricao', 'valor'],
        additionalProperties: true,
        properties: {
          data: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          tipo: { type: 'string', enum: ['Receita', 'Despesa'] },
          categoria: { type: 'string', minLength: 1, maxLength: 100 },
          descricao: { type: 'string', minLength: 1, maxLength: 255 },
          valor: { type: 'number', minimum: 0.01 },
          placa: { type: 'string', maxLength: 20 },
          centro_custo_id: { type: ['string', 'null'] }
        }
      }
    }}
  ]},
  { arquivo: 'src/routes/categorias.js', schemas: [
    { metodo: 'post', rota: '/api/categorias', schema: {
      body: {
        type: 'object',
        required: ['nome', 'tipo'],
        additionalProperties: true,
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: 100 },
          tipo: { type: 'string', enum: ['Receita', 'Despesa'] },
          ordem: { type: 'integer', minimum: 0 },
          ativo: { type: 'boolean' }
        }
      }
    }},
    { metodo: 'put', rota: '/api/categorias/:id', schema: {
      body: {
        type: 'object',
        additionalProperties: true,
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: 100 },
          tipo: { type: 'string', enum: ['Receita', 'Despesa'] },
          ordem: { type: 'integer', minimum: 0 },
          ativo: { type: 'boolean' }
        }
      }
    }}
  ]},
  { arquivo: 'src/routes/centros_custo.js', schemas: [
    { metodo: 'post', rota: '/api/centros-custo', schema: {
      body: {
        type: 'object',
        required: ['nome'],
        additionalProperties: true,
        properties: {
          codigo: { type: 'string', maxLength: 20 },
          nome: { type: 'string', minLength: 2, maxLength: 100 },
          descricao: { type: 'string', maxLength: 500 },
          ordem: { type: 'integer', minimum: 0 },
          ativo: { type: 'boolean' }
        }
      }
    }},
    { metodo: 'put', rota: '/api/centros-custo/:id', schema: {
      body: {
        type: 'object',
        additionalProperties: true,
        properties: {
          codigo: { type: 'string', maxLength: 20 },
          nome: { type: 'string', minLength: 2, maxLength: 100 },
          descricao: { type: 'string', maxLength: 500 },
          ordem: { type: 'integer', minimum: 0 },
          ativo: { type: 'boolean' }
        }
      }
    }}
  ]},
  { arquivo: 'src/routes/metas.js', schemas: [
    { metodo: 'post', rota: '/api/metas', schema: {
      body: {
        type: 'object',
        required: ['veiculo_id', 'mes_referencia', 'tipo_meta', 'valor_meta'],
        additionalProperties: true,
        properties: {
          veiculo_id: { type: 'string' },
          mes_referencia: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          tipo_meta: { type: 'string', enum: ['receita', 'resultado', 'km'] },
          valor_meta: { type: 'number', minimum: 0.01 },
          observacao: { type: 'string', maxLength: 500 }
        }
      }
    }},
    { metodo: 'put', rota: '/api/metas/:id', schema: {
      body: {
        type: 'object',
        required: ['valor_meta'],
        additionalProperties: true,
        properties: {
          valor_meta: { type: 'number', minimum: 0.01 },
          observacao: { type: 'string', maxLength: 500 }
        }
      }
    }}
  ]}
];

function aplicarSchema(texto, metodo, rota, schema) {
  const marcadorRota = "fastify." + metodo + "('" + rota + "'";
  const idx = texto.indexOf(marcadorRota);
  if (idx === -1) return { texto, aplicado: false };

  const inicioOpcoes = texto.indexOf('{', idx);
  if (inicioOpcoes === -1) return { texto, aplicado: false };

  const schemaStr = '\n    schema: ' + JSON.stringify(schema, null, 4).replace(/\n/g, '\n    ') + ',';

  return {
    texto: texto.slice(0, inicioOpcoes + 1) + schemaStr + texto.slice(inicioOpcoes + 1),
    aplicado: true
  };
}

let totalAplicados = 0;

ALVOS.forEach(function(alvo) {
  const ALVO = path.resolve(ROOT, alvo.arquivo);
  if (!fs.existsSync(ALVO)) { console.log('SKIP: ' + alvo.arquivo + ' nao existe'); return; }

  let conteudo = fs.readFileSync(ALVO, 'utf8');
  const original = conteudo;

  fs.mkdirSync(BACKUP, { recursive: true });
  const bp = path.resolve(BACKUP, path.basename(alvo.arquivo) + '.pre_validacao');
  if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); }

  if (conteudo.indexOf(MARCADOR) !== -1) {
    console.log('SKIP: ' + alvo.arquivo + ' (ja aplicado)');
    return;
  }

  // Injeta marcador no topo
  conteudo = conteudo.replace(
    /(const db = require\('\.\.\/database'\);)/,
    "$1\n\n" + MARCADOR + "\n"
  );

  let aplicados = 0;
  alvo.schemas.forEach(function(item) {
    const r = aplicarSchema(conteudo, item.metodo, item.rota, item.schema);
    if (r.aplicado) {
      conteudo = r.texto;
      aplicados++;
      console.log('OK ' + alvo.arquivo + ': ' + item.metodo.toUpperCase() + ' ' + item.rota);
    } else {
      console.log('AVISO ' + alvo.arquivo + ': nao achei ' + item.metodo.toUpperCase() + ' ' + item.rota);
    }
  });

  if (conteudo !== original) {
    fs.writeFileSync(ALVO, conteudo, 'utf8');
    totalAplicados += aplicados;
  }
});

console.log('\n===============================================');
console.log('CONCLUIDO — Schemas aplicados: ' + totalAplicados);
console.log('===============================================');
console.log('');
