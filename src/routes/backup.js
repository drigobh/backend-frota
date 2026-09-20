// FASE_10_BACKUP_NEON - backups persistentes no Neon
const fs = require('fs');
const path = require('path');
const db = require('../database');

// ============================================================
// FUNCOES AUXILIARES
// ============================================================
async function listarTabelas() {
  const r = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  return r.rows.map(x => x.table_name);
}

async function exportarTudo() {
  const tabelas = await listarTabelas();
  const dados = {};
  const contagem = {};
  for (const t of tabelas) {
    try {
      const r = await db.query('SELECT * FROM "' + t + '"');
      dados[t] = r.rows;
      contagem[t] = r.rows.length;
    } catch (e) {
      dados[t] = { erro: e.message };
      contagem[t] = 0;
    }
  }
  return { dados, contagem, tabelas: tabelas.length };
}

// ============================================================
// MODULE EXPORTS
// ============================================================

// ============================================================
// FASE_10_STATUS - Valida integridade do backup
// ============================================================
function validarBackup(tipo, buffer, nome) {
  const detalhes = { verificado_em: new Date().toISOString(), erros: [], avisos: [], ok: [] };
  let status = 'verde';

  try {
    if (tipo === 'json') {
      let payload;
      try {
        payload = JSON.parse(buffer.toString('utf8'));
        detalhes.ok.push('JSON parse valido');
      } catch (e) {
        detalhes.erros.push('JSON invalido: ' + e.message);
        return { status: 'vermelho', detalhes };
      }

      if (!payload.dados) {
        detalhes.erros.push('Campo "dados" ausente');
      } else {
        const tabelas = Object.keys(payload.dados);
        detalhes.ok.push(tabelas.length + ' tabelas encontradas');
        detalhes.tabelas = tabelas.length;
        let totalRegistros = 0;
        for (const t of tabelas) {
          if (Array.isArray(payload.dados[t])) totalRegistros += payload.dados[t].length;
        }
        detalhes.registros = totalRegistros;
        detalhes.ok.push(totalRegistros + ' registros no total');
      }

      if (!payload.gerado_em) {
        detalhes.avisos.push('Campo "gerado_em" ausente');
      }

      if (buffer.length < 100) {
        detalhes.avisos.push('Arquivo muito pequeno (' + buffer.length + ' bytes)');
      }
    } else if (tipo === 'completo') {
      const AdmZip = require('adm-zip');
      let zip;
      try {
        zip = new AdmZip(buffer);
        detalhes.ok.push('ZIP valido');
      } catch (e) {
        detalhes.erros.push('ZIP invalido: ' + e.message);
        return { status: 'vermelho', detalhes };
      }

      const entries = zip.getEntries().map(e => e.entryName);
      detalhes.arquivos = entries.length;
      detalhes.ok.push(entries.length + ' arquivos no ZIP');

      if (!entries.includes('dados.json')) {
        detalhes.erros.push('dados.json ausente');
      } else {
        detalhes.ok.push('dados.json presente');
      }

      if (!entries.includes('MANIFEST.txt')) {
        detalhes.avisos.push('MANIFEST.txt ausente');
      } else {
        detalhes.ok.push('MANIFEST.txt presente');
      }

      const rotas = entries.filter(e => e.startsWith('codigo/routes/'));
      if (rotas.length < 10) {
        detalhes.avisos.push('Apenas ' + rotas.length + ' arquivos em codigo/routes/');
      } else {
        detalhes.ok.push(rotas.length + ' arquivos em codigo/routes/');
      }
    } else if (tipo === 'pre-restore') {
      detalhes.avisos.push('Backup de pre-restore (validacao basica)');
      if (!buffer || buffer.length === 0) detalhes.erros.push('Buffer vazio');
    } else {
      detalhes.avisos.push('Tipo desconhecido: ' + tipo);
    }

    if (detalhes.erros.length > 0) status = 'vermelho';
    else if (detalhes.avisos.length > 0) status = 'amarelo';
  } catch (e) {
    detalhes.erros.push('Excecao: ' + e.message);
    status = 'vermelho';
  }

  return { status, detalhes };
}

// ============================================================
module.exports = async function (fastify, options) {

  // ============================================================
  // GET /api/backup/listar - Lista backups do Neon
  // ============================================================
  fastify.get('/api/backup/listar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const r = await db.query(
        "SELECT id, nome, tipo, tamanho, usuario, status, validado_em, validacao_detalhes, criado_em FROM backups_arquivos ORDER BY criado_em DESC LIMIT 50"
      );
      const backups = r.rows.map(b => ({
        id: b.id,
        nome: b.nome,
        tipo: b.tipo,
        tamanho: Number(b.tamanho),
        usuario: b.usuario,
        // FASE_11_FIX_STATUS: campos que o frontend usa no semaforo
        status: b.status || 'amarelo',
        validado_em: b.validado_em || null,
        validacao_detalhes: b.validacao_detalhes || null,
        criado_em: b.criado_em
      }));
      return reply.send({ ok: true, backups });
    } catch (err) {
      req.log.error({ err }, "Erro ao listar backups");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // POST /api/backup/gerar - Gera backup de DADOS (JSON) e salva no Neon
  // ============================================================
  fastify.post('/api/backup/gerar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { dados, contagem, tabelas } = await exportarTudo();
      const agora = new Date().toISOString().replace(/[:.]/g, '-');
      const nome = 'backup_' + agora + '.json';
      const payload = {
        versao: 'v1977-backup',
        gerado_em: new Date().toISOString(),
        usuario: (req.user && req.user.email) || 'sistema',
        total_tabelas: tabelas,
        contagem: contagem,
        dados: dados
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const buffer = Buffer.from(jsonStr, 'utf8');
      const tamanho = buffer.length;

      // FASE_10_STATUS - valida antes de salvar
      const val = validarBackup('json', buffer, nome);
      await db.query(
        "INSERT INTO backups_arquivos (nome, tipo, tamanho, conteudo, usuario, status, validado_em, validacao_detalhes) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)",
        [nome, 'json', tamanho, buffer, (req.user && req.user.email) || 'sistema', val.status, JSON.stringify(val.detalhes)]
      );

      // Limpa antigos (mantem 7)
      await db.query("SELECT limpar_backups_antigos(7)");

      return reply.send({ ok: true, arquivo: nome, tamanho, tipo: 'json' });
    } catch (err) {
      req.log.error({ err }, "Erro ao gerar backup JSON");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // GET /api/backup/exportar - Gera JSON e devolve pra download (sem salvar)
  // ============================================================
  fastify.get('/api/backup/exportar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { dados, contagem, tabelas } = await exportarTudo();
      const payload = {
        versao: 'v1977-backup',
        gerado_em: new Date().toISOString(),
        usuario: (req.user && req.user.email) || 'sistema',
        total_tabelas: tabelas,
        contagem: contagem,
        dados: dados
      };
      const json = JSON.stringify(payload, null, 2);
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="backup-caderninho-' + new Date().toISOString().substring(0, 10) + '.json"')
        .send(json);
    } catch (err) {
      req.log.error({ err }, "Erro ao exportar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // POST /api/backup/gerar-completo - Gera ZIP e salva no Neon
  // ============================================================
  fastify.post('/api/backup/gerar-completo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const AdmZip = require('adm-zip');
      const { dados, contagem, tabelas } = await exportarTudo();

      const root = path.resolve(__dirname, '..', '..');
      const manifest = [
        'Caderninho de Motorista - Backup Completo',
        '==========================================',
        'Gerado em: ' + new Date().toISOString(),
        'Usuario: ' + ((req.user && req.user.email) || 'sistema'),
        'Tabelas no banco: ' + tabelas,
        'Total de registros: ' + Object.values(contagem).reduce((a, b) => a + b, 0),
        '',
        'Conteudo do ZIP:',
        '  - dados.json          (backup completo do banco)',
        '  - codigo/             (index.html, server.js, routes, email.js, database.js)',
        '  - migrations/         (arquivos .sql)',
        '  - package.json        (dependencias)',
        '  - MANIFEST.txt        (este arquivo)',
        '',
        'OBS: .env e node_modules NAO foram incluidos por seguranca/tamanho.'
      ].join('\n');

      const zip = new AdmZip();
      zip.addFile('dados.json', Buffer.from(JSON.stringify({
        versao: 'v1977-completo',
        gerado_em: new Date().toISOString(),
        usuario: (req.user && req.user.email) || 'sistema',
        total_tabelas: tabelas,
        contagem: contagem,
        dados: dados
      }, null, 2), 'utf8'));
      zip.addFile('MANIFEST.txt', Buffer.from(manifest, 'utf8'));

      const arquivosCodigo = [
        ['public/index.html', 'codigo/index.html'],
        ['src/server.js', 'codigo/server.js'],
        ['src/email.js', 'codigo/email.js'],
        ['src/database.js', 'codigo/database.js'],
        ['package.json', 'package.json']
      ];
      arquivosCodigo.forEach(function(par) {
        const src = path.join(root, par[0]);
        if (fs.existsSync(src)) {
          zip.addLocalFile(src, path.dirname(par[1]) === '.' ? '' : path.dirname(par[1]), path.basename(par[1]));
        }
      });

      const pastaRoutes = path.join(root, 'src', 'routes');
      if (fs.existsSync(pastaRoutes)) {
        fs.readdirSync(pastaRoutes).forEach(function(f) {
          if (f.endsWith('.js')) zip.addLocalFile(path.join(pastaRoutes, f), 'codigo/routes', f);
        });
      }

      const pastaMig = path.join(root, 'migrations');
      if (fs.existsSync(pastaMig)) {
        fs.readdirSync(pastaMig).forEach(function(f) {
          if (f.endsWith('.sql')) zip.addLocalFile(path.join(pastaMig, f), 'migrations', f);
        });
      }

      const buffer = zip.toBuffer();
      const agora = new Date().toISOString().replace(/[:.]/g, '-');
      const nome = 'completo_' + agora + '.zip';
      const tamanho = buffer.length;

      // FASE_10_STATUS - valida antes de salvar
      const val = validarBackup('completo', buffer, nome);
      await db.query(
        "INSERT INTO backups_arquivos (nome, tipo, tamanho, conteudo, usuario, status, validado_em, validacao_detalhes) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)",
        [nome, 'completo', tamanho, buffer, (req.user && req.user.email) || 'sistema', val.status, JSON.stringify(val.detalhes)]
      );

      await db.query("SELECT limpar_backups_antigos(7)");

      return reply.send({ ok: true, arquivo: nome, tamanho, tipo: 'completo' });
    } catch (err) {
      req.log.error({ err }, "Erro no backup completo");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // GET /api/backup/baixar/:id - Baixa backup do Neon por ID
  // ============================================================
  fastify.get('/api/backup/baixar/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return reply.status(400).send({ erro: 'ID invalido' });

      const r = await db.query(
        "SELECT nome, tipo, conteudo FROM backups_arquivos WHERE id = $1",
        [id]
      );
      if (r.rows.length === 0) return reply.status(404).send({ erro: 'Backup nao encontrado' });

      const b = r.rows[0];
      const isZip = b.nome.endsWith('.zip');
      reply
        .header('Content-Type', isZip ? 'application/zip' : 'application/json; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="' + b.nome + '"')
        .send(b.conteudo);
    } catch (err) {
      req.log.error({ err }, "Erro ao baixar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // DELETE /api/backup/:id - Apaga backup do Neon
  // ============================================================
  fastify.delete('/api/backup/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return reply.status(400).send({ erro: 'ID invalido' });
      await db.query("DELETE FROM backups_arquivos WHERE id = $1", [id]);
      return reply.send({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Erro ao deletar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // POST /api/backup/importar - Restaurar backup (versao simplificada)
  // ============================================================
  fastify.post('/api/backup/importar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      // FASE_10_RESTORE_48 - aceita ZIP e JSON
      const AdmZip = require('adm-zip');
      const { conteudo, conteudo_base64, senha, confirmacao, tipo } = req.body || {};

      if (confirmacao !== 'RESTAURAR') return reply.status(400).send({ erro: 'Digite RESTAURAR.' });
      if (!senha) return reply.status(400).send({ erro: 'Senha obrigatoria.' });

      // Verifica senha
      const bcrypt = require('bcrypt');
      const u = await db.query('SELECT senha_hash FROM usuarios WHERE id = $1 LIMIT 1', [req.user.id]);
      if (u.rows.length === 0) return reply.status(401).send({ erro: 'Usuario nao encontrado.' });
      const senhaOk = await bcrypt.compare(String(senha), u.rows[0].senha_hash);
      if (!senhaOk) return reply.status(401).send({ erro: 'Senha incorreta.' });

      // Decodifica o conteudo
      // FASE_11_FIX_DATAURL: se vier do frontend com readAsDataURL, chega como "data:...;base64,XXXX"
      let buffer;
      let raw = conteudo_base64 || conteudo;
      if (!raw) return reply.status(400).send({ erro: 'Conteudo ausente.' });

      if (typeof raw === 'string' && raw.startsWith('data:')) {
        var idxV = raw.indexOf(',');
        if (idxV === -1) return reply.status(400).send({ erro: 'Data URL malformada.' });
        var meta = raw.slice(5, idxV);
        var base64 = raw.slice(idxV + 1);
        var isBase64 = /;base64/i.test(meta);
        buffer = isBase64 ? Buffer.from(base64, 'base64') : Buffer.from(decodeURIComponent(base64), 'utf8');
      } else if (conteudo_base64) {
        buffer = Buffer.from(conteudo_base64, 'base64');
      } else if (Buffer.isBuffer(conteudo)) {
        buffer = conteudo;
      } else if (typeof conteudo === 'string') {
        buffer = Buffer.from(conteudo, 'utf8');
      } else {
        return reply.status(400).send({ erro: 'Tipo de conteudo nao suportado.' });
      }

      // Detecta se e ZIP (magic bytes: 50 4B 03 04)
      let isZip = false;
      if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B) isZip = true;

      let jsonStr;
      if (isZip) {
        // Extrai dados.json do ZIP
        try {
          const zip = new AdmZip(buffer);
          const entry = zip.getEntry('dados.json');
          if (!entry) return reply.status(400).send({ erro: 'ZIP nao contem dados.json.' });
          jsonStr = zip.readAsText('dados.json');
        } catch (e) {
          return reply.status(400).send({ erro: 'ZIP invalido: ' + e.message });
        }
      } else {
        jsonStr = buffer.toString('utf8');
      }

      let payload;
      try {
        payload = JSON.parse(jsonStr);
      } catch (e) {
        return reply.status(400).send({ erro: 'JSON invalido: ' + e.message });
      }
      if (!payload.dados) return reply.status(400).send({ erro: 'Backup sem campo dados.' });

      // Pre-backup
      const { dados: dadosAntes } = await exportarTudo();
      const preNome = 'pre-restore_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      const preBuf = Buffer.from(JSON.stringify({ versao: 'v1977-pre-restore', gerado_em: new Date().toISOString(), dados: dadosAntes }, null, 2), 'utf8');
      await db.query(
        "INSERT INTO backups_arquivos (nome, tipo, tamanho, conteudo, usuario, status) VALUES ($1, $2, $3, $4, $5, $6)",
        [preNome, 'pre-restore', preBuf.length, preBuf, (req.user && req.user.email) || 'sistema', 'verde']
      );

      // Restore
      const ordemFK = [
        'empresas', 'filiais', 'perfis', 'perfis_acesso', 'permissoes',
        'usuarios', 'usuarios_perfil_id_backup', 'perfil_permissoes',
        'veiculos', 'carretas', 'motoristas',
        'categorias_financeiras', 'centros_custo', 'configuracoes',
        'acoplamentos', 'km_mensal', 'controle_km',
        'lancamentos_financeiros', 'abastecimentos', 'manutencoes', 'documentos', 'financeiro',
        'metas', 'alertas', 'historico', 'auditoria',
        'fechamentos_periodo', 'meses_fechados', 'senha_reset_tokens'
      ];

      const dados = payload.dados;
      const tabelas = Object.keys(dados);
      const relatorio = { truncadas: [], inseridas: {}, erros: [] };

      for (const t of ordemFK) {
        if (!tabelas.includes(t)) continue;
        try {
          await db.query('TRUNCATE TABLE "' + t + '" RESTART IDENTITY CASCADE');
          relatorio.truncadas.push(t);
        } catch (e) { relatorio.erros.push('TRUNCATE ' + t + ': ' + e.message); }
      }

      for (const t of ordemFK) {
        if (!tabelas.includes(t)) continue;
        const linhas = dados[t];
        if (!Array.isArray(linhas) || linhas.length === 0) { relatorio.inseridas[t] = 0; continue; }
        let ok = 0;
        for (const linha of linhas) {
          try {
            const cols = Object.keys(linha);
            if (cols.length === 0) continue;
            const ph = cols.map((_, i) => '$' + (i + 1)).join(', ');
            const values = cols.map(c => linha[c]);
            const colNames = cols.map(c => '"' + c + '"').join(', ');
            await db.query('INSERT INTO "' + t + '" (' + colNames + ') VALUES (' + ph + ')', values);
            ok++;
          } catch (e) { relatorio.erros.push('INSERT ' + t + ': ' + e.message); }
        }
        relatorio.inseridas[t] = ok;
      }

      return reply.send({ ok: true, mensagem: 'Restore concluido.', pre_backup: preNome, relatorio });
    } catch (err) {
      req.log.error({ err }, "Erro no restore");
      return reply.status(500).send({ erro: err.message });
    }
  });
  // FASE_10_LIMPO_49C - bloco orfao removido

  // ============================================================
  // FASE_10_STATUS - POST /api/backup/testar/:id
  // ============================================================
  fastify.post('/api/backup/testar/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return reply.status(400).send({ erro: 'ID invalido' });

      const r = await db.query("SELECT nome, tipo, conteudo FROM backups_arquivos WHERE id = $1", [id]);
      if (r.rows.length === 0) return reply.status(404).send({ erro: 'Backup nao encontrado' });

      const b = r.rows[0];
      const val = validarBackup(b.tipo, b.conteudo, b.nome);

      await db.query(
        "UPDATE backups_arquivos SET status = $1, validado_em = NOW(), validacao_detalhes = $2 WHERE id = $3",
        [val.status, JSON.stringify(val.detalhes), id]
      );

      return reply.send({ ok: true, status: val.status, detalhes: val.detalhes });
    } catch (err) {
      req.log.error({ err }, "Erro ao testar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

};
