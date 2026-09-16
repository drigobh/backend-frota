/**
 * FASE 3B — SEGURANÇA — SCRIPT 03c
 * Validação de schema em rotas OPERACIONAIS
 * ============================================================================
 * Rotas validadas:
 *   - POST /api/km                (placa, mes_referencia, inicial, final, litros, precoLitro)
 *   - POST /api/abastecimentos    (placa, data_abastecimento, litros, valor_total, km_atual)
 *   - POST /api/acoplamentos      (mes_referencia, veiculo_id, carreta_id, motorista_id)
 *   - POST /api/manutencoes       (placa, tipo, descricao, valor)
 *   - POST /api/documentos        (entidade_tipo, entidade_nome, tipo_documento, data_vencimento)
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');
const MARCADOR = '// FASE_3B_VALIDACAO_OPERACAO';

console.log('\n===============================================');
console.log('FASE 3B - Validacao: OPERACAO');
console.log('===============================================\n');

const SCHEMA_KM = {
  body: {
    type: 'object',
    required: ['placa', 'mes_referencia'],
    additionalProperties: true,
    properties: {
      placa: { type: 'string', minLength: 3, maxLength: 20 },
      mes_referencia: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
      inicial: { type: 'number', minimum: 0 },
      final: { type: 'number', minimum: 0 },
      litros: { type: 'number', minimum: 0 },
      precoLitro: { type: 'number', minimum: 0 }
    }
  }
};

const SCHEMA_ABASTECIMENTO = {
  body: {
    type: 'object',
    required: ['placa', 'litros', 'valor_total'],
    additionalProperties: true,
    properties: {
      placa: { type: 'string', minLength: 3, maxLength: 20 },
      data_abastecimento: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
      posto: { type: 'string', maxLength: 150 },
      cidade: { type: 'string', maxLength: 100 },
      km_atual: { type: 'number', minimum: 0 },
      litros: { type: 'number', minimum: 0.01 },
      valor_litro: { type: 'number', minimum: 0 },
      valor_total: { type: 'number', minimum: 0.01 },
      nota_fiscal: { type: 'string', maxLength: 100 }
    }
  }
};

const SCHEMA_ACOPLAMENTO = {
  body: {
    type: 'object',
    required: ['mes_referencia'],
    additionalProperties: true,
    properties: {
      mes_referencia: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
      veiculo_id: { type: ['string', 'number', 'null'] },
      carreta_id: { type: ['string', 'number', 'null'] },
      motorista_id: { type: ['string', 'number', 'null'] }
    }
  }
};

const SCHEMA_MANUTENCAO = {
  body: {
    type: 'object',
    required: ['placa', 'descricao'],
    additionalProperties: true,
    properties: {
      placa: { type: 'string', minLength: 3, maxLength: 20 },
      tipo: { type: 'string', maxLength: 50 },
      descricao: { type: 'string', minLength: 1, maxLength: 1000 },
      fornecedor: { type: 'string', maxLength: 150 },
      valor: { type: 'number', minimum: 0 },
      km: { type: 'number', minimum: 0 },
      proxima_manutencao_km: { type: 'number', minimum: 0 }
    }
  }
};

const SCHEMA_DOCUMENTO = {
  body: {
    type: 'object',
    required: ['entidade_tipo', 'entidade_nome', 'tipo_documento'],
    additionalProperties: true,
    properties: {
      entidade_tipo: { type: 'string', enum: ['Veiculo', 'Motorista', 'Empresa'] },
      entidade_nome: { type: 'string', minLength: 1, maxLength: 100 },
      tipo_documento: { type: 'string', minLength: 1, maxLength: 100 },
      data_emissao: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
      data_vencimento: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' }
    }
  }
};

const ALVOS = [
  { arquivo: 'src/routes/km.js',            rota: '/api/km',            metodo: 'post', schema: SCHEMA_KM },
  { arquivo: 'src/routes/abastecimentos.js', rota: '/api/abastecimentos', metodo: 'post', schema: SCHEMA_ABASTECIMENTO },
  { arquivo: 'src/routes/acoplamentos.js',  rota: '/api/acoplamentos',  metodo: 'post', schema: SCHEMA_ACOPLAMENTO },
  { arquivo: 'src/routes/frota_avancada.js', rota: '/api/manutencoes',  metodo: 'post', schema: SCHEMA_MANUTENCAO },
  { arquivo: 'src/routes/frota_avancada.js', rota: '/api/documentos',   metodo: 'post', schema: SCHEMA_DOCUMENTO }
];

let totalAplicados = 0;

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

// Agrupar por arquivo (frota_avancada.js tem 2 rotas)
const porArquivo = {};
ALVOS.forEach(function(a) {
  if (!porArquivo[a.arquivo]) porArquivo[a.arquivo] = [];
  porArquivo[a.arquivo].push(a);
});

Object.keys(porArquivo).forEach(function(arq) {
  const ALVO = path.resolve(ROOT, arq);
  if (!fs.existsSync(ALVO)) { console.log('SKIP: ' + arq + ' nao existe'); return; }

  let conteudo = fs.readFileSync(ALVO, 'utf8');
  const original = conteudo;

  fs.mkdirSync(BACKUP, { recursive: true });
  const bp = path.resolve(BACKUP, path.basename(arq) + '.pre_validacao');
  if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); }

  if (conteudo.indexOf(MARCADOR) !== -1) {
    console.log('SKIP: ' + arq + ' (ja aplicado)');
    return;
  }

  conteudo = conteudo.replace(
    /(const db = require\('\.\.\/database'\);)/,
    "$1\n\n" + MARCADOR + "\n"
  );

  let aplicados = 0;
  porArquivo[arq].forEach(function(item) {
    const r = aplicarSchema(conteudo, item.metodo, item.rota, item.schema);
    if (r.aplicado) {
      conteudo = r.texto;
      aplicados++;
      console.log('OK ' + arq + ': ' + item.metodo.toUpperCase() + ' ' + item.rota);
    } else {
      console.log('AVISO ' + arq + ': nao achei ' + item.rota);
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
