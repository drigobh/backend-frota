const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');
const ALVO   = path.resolve(ROOT, 'src/routes/cadastro.js');

const MARCADOR = '// FASE_3B_VALIDACAO_CADASTROS';

console.log('\n===============================================');
console.log('FASE 3B - Validacao de schema: CADASTROS');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let conteudo = fs.readFileSync(ALVO, 'utf8');
const original = conteudo;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'cadastro_pre_validacao.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

if (conteudo.indexOf(MARCADOR) !== -1) {
  console.log('SKIP: validacao ja aplicada');
  process.exit(0);
}

const SCHEMA_VEICULO = {
  body: {
    type: 'object',
    required: ['placa'],
    additionalProperties: true,
    properties: {
      placa: { type: 'string', minLength: 7, maxLength: 8 },
      modelo: { type: 'string', maxLength: 100 },
      ano: { type: 'string', maxLength: 10 },
      obs: { type: 'string', maxLength: 1000 }
    }
  }
};

const SCHEMA_CARRETA = {
  body: {
    type: 'object',
    required: ['codigo'],
    additionalProperties: true,
    properties: {
      codigo: { type: 'string', minLength: 3, maxLength: 50 },
      tipo: { type: 'string', maxLength: 100 },
      obs: { type: 'string', maxLength: 1000 }
    }
  }
};

const SCHEMA_MOTORISTA = {
  body: {
    type: 'object',
    required: ['nome'],
    additionalProperties: true,
    properties: {
      nome: { type: 'string', minLength: 2, maxLength: 150 },
      cnh: { type: 'string', maxLength: 20 },
      telefone: { type: 'string', maxLength: 20 },
      obs: { type: 'string', maxLength: 1000 }
    }
  }
};

function aplicarSchema(texto, metodo, rota, schema) {
  const marcadorRota = "fastify." + metodo + "('" + rota + "'";
  const idx = texto.indexOf(marcadorRota);
  if (idx === -1) return { texto, aplicado: false };

  const inicioOpcoes = texto.indexOf('{', idx);
  if (inicioOpcoes === -1) return { texto, aplicado: false };

  const schemaStr = '\n    schema: ' + JSON.stringify(schema, null, 4).replace(/\n/g, '\n    ') + ',';

  const novoTexto =
    texto.slice(0, inicioOpcoes + 1) +
    schemaStr +
    texto.slice(inicioOpcoes + 1);

  return { texto: novoTexto, aplicado: true };
}

let aplicados = 0;
const rotas = [
  ['post', '/api/veiculos', SCHEMA_VEICULO],
  ['put',  '/api/veiculos/:id', SCHEMA_VEICULO],
  ['post', '/api/carretas', SCHEMA_CARRETA],
  ['put',  '/api/carretas/:id', SCHEMA_CARRETA],
  ['post', '/api/motoristas', SCHEMA_MOTORISTA],
  ['put',  '/api/motoristas/:id', SCHEMA_MOTORISTA]
];

conteudo = conteudo.replace(
  /(const db = require\('\.\.\/database'\);)/,
  "$1\n\n" + MARCADOR + "\n"
);

rotas.forEach(function(item) {
  var metodo = item[0], rota = item[1], schema = item[2];
  var r = aplicarSchema(conteudo, metodo, rota, schema);
  if (r.aplicado) {
    conteudo = r.texto;
    aplicados++;
    console.log('OK: schema aplicado em ' + metodo.toUpperCase() + ' ' + rota);
  } else {
    console.log('AVISO: nao achei ' + metodo.toUpperCase() + ' ' + rota);
  }
});

if (conteudo === original) {
  console.log('\nNada foi alterado.');
  process.exit(0);
}

fs.writeFileSync(ALVO, conteudo, 'utf8');

console.log('\n===============================================');
console.log('CONCLUIDO');
console.log('===============================================');
console.log('Schemas aplicados: ' + aplicados + '/6');
console.log('');
