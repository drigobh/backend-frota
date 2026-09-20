// FASE_9_BACKUP
const fs = require('fs');
const path = require('path');
const db = require('../database');

const BACKUP_FOLDER = path.resolve(__dirname, '..', '..', 'backups');

function garantirPasta() {
  if (!fs.existsSync(BACKUP_FOLDER)) {
    fs.mkdirSync(BACKUP_FOLDER, { recursive: true });
  }
}

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

module.exports = async function (fastify, options) {

  // GET /api/backup/listar
  fastify.get('/api/backup/listar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      garantirPasta();
      const arquivos = fs.readdirSync(BACKUP_FOLDER)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const full = path.join(BACKUP_FOLDER, f);
          const st = fs.statSync(full);
          return { nome: f, tamanho: st.size, criado_em: st.mtime };
        })
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
      return reply.send({ ok: true, backups: arquivos });
    } catch (err) {
      req.log.error({ err }, "Erro ao listar backups");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // GET /api/backup/exportar -> gera JSON e devolve para download
  fastify.get('/api/backup/exportar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      
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

  // POST /api/backup/gerar -> salva no servidor em backups/
  fastify.post('/api/backup/gerar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      garantirPasta();
      
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
      const full = path.join(BACKUP_FOLDER, nome);
      fs.writeFileSync(full, JSON.stringify(payload, null, 2), 'utf8');

      // Limpa backups antigos (mantem os 7 mais recentes)
      const todos = fs.readdirSync(BACKUP_FOLDER)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => ({ nome: f, mtime: fs.statSync(path.join(BACKUP_FOLDER, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);
      const remover = todos.slice(7);
      remover.forEach(x => { try { fs.unlinkSync(path.join(BACKUP_FOLDER, x.nome)); } catch (e) {} });

      const tamanho = fs.statSync(full).size;
      return reply.send({ ok: true, arquivo: nome, tamanho: tamanho, removidos: remover.length });
    } catch (err) {
      req.log.error({ err }, "Erro ao gerar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // GET /api/backup/download/:nome -> baixa um backup salvo
  fastify.get('/api/backup/download/:nome', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const nome = String(req.params.nome || '').replace(/[^a-zA-Z0-9._-]/g, '');
      const full = path.join(BACKUP_FOLDER, nome);
      if (!fs.existsSync(full)) return reply.status(404).send({ erro: 'Backup nao encontrado.' });
      const conteudo = fs.readFileSync(full, 'utf8');
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="' + nome + '"')
        .send(conteudo);
    } catch (err) {
      req.log.error({ err }, "Erro ao baixar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // DELETE /api/backup/:nome -> apaga um backup
  fastify.delete('/api/backup/:nome', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const nome = String(req.params.nome || '').replace(/[^a-zA-Z0-9._-]/g, '');
      const full = path.join(BACKUP_FOLDER, nome);
      if (!fs.existsSync(full)) return reply.status(404).send({ erro: 'Backup nao encontrado.' });
      fs.unlinkSync(full);
      return reply.send({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Erro ao deletar backup");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // FASE_9_RESTORE - Importar backup (restaurar dados)
  // ============================================================
  fastify.post('/api/backup/importar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      // 1) Valida usuario admin
      const usuario = req.user || {};
      if (!usuario.email) {
        return reply.status(401).send({ erro: 'Usuario nao autenticado.' });
      }

      // 2) Recebe payload
      const { arquivo, conteudo, senha, confirmacao } = req.body || {};
      if (!conteudo) return reply.status(400).send({ erro: 'Conteudo do backup ausente.' });
      if (confirmacao !== 'RESTAURAR') {
        return reply.status(400).send({ erro: 'Digite RESTAURAR para confirmar.' });
      }
      if (!senha) return reply.status(400).send({ erro: 'Senha obrigatoria.' });

      // 3) Valida senha do usuario logado
      const bcrypt = require('bcrypt');
      const u = await db.query('SELECT senha_hash FROM usuarios WHERE id = $1 LIMIT 1', [usuario.id]);
      if (u.rows.length === 0) return reply.status(401).send({ erro: 'Usuario nao encontrado.' });
      const senhaOk = await bcrypt.compare(String(senha), u.rows[0].senha_hash);
      if (!senhaOk) return reply.status(401).send({ erro: 'Senha incorreta.' });

      // 4) Parse do JSON
      let payload;
      try {
        payload = typeof conteudo === 'string' ? JSON.parse(conteudo) : conteudo;
      } catch (e) {
        return reply.status(400).send({ erro: 'JSON invalido: ' + e.message });
      }
      if (!payload.dados || typeof payload.dados !== 'object') {
        return reply.status(400).send({ erro: 'Backup sem campo dados.' });
      }

      // 5) Backup automatico ANTES de importar (seguranca)
      garantirPasta();
      const tabelasAtuais = await listarTabelas();
      const dadosAntes = {};
      for (const t of tabelasAtuais) {
        try {
          const r = await db.query('SELECT * FROM "' + t + '"');
          dadosAntes[t] = r.rows;
        } catch (e) {}
      }
      const agoraStr = new Date().toISOString().replace(/[:.]/g, '-');
      const preBackupNome = 'pre-restore_' + agoraStr + '.json';
      fs.writeFileSync(path.join(BACKUP_FOLDER, preBackupNome), JSON.stringify({
        versao: 'v1977-pre-restore',
        gerado_em: new Date().toISOString(),
        motivo: 'Backup automatico antes do restore',
        dados: dadosAntes
      }, null, 2), 'utf8');
      console.log('[RESTORE] Pre-backup salvo: ' + preBackupNome);

      // 6) Ordem de restauracao (FK-safe)
      const ordemFK = [
        'empresas', 'filiais', 'perfis', 'perfis_acesso', 'permissoes',
        'usuarios', 'usuarios_perfil_id_backup', 'perfil_permissoes',
        'veiculos', 'carretas', 'motoristas',
        'categorias_financeiras', 'centros_custo',
        'configuracoes',
        'acoplamentos', 'km_mensal', 'controle_km',
        'lancamentos_financeiros', 'abastecimentos', 'manutencoes', 'documentos', 'financeiro',
        'metas', 'alertas', 'historico', 'auditoria',
        'fechamentos_periodo', 'meses_fechados',
        'senha_reset_tokens'
      ];

      const dados = payload.dados;
      const tabelas = Object.keys(dados);
      const relatorio = { truncadas: [], inseridas: {}, erros: [] };

      // 7) Trunca TODAS as tabelas do backup
      for (const t of ordemFK) {
        if (!tabelas.includes(t)) continue;
        try {
          await db.query('TRUNCATE TABLE "' + t + '" RESTART IDENTITY CASCADE');
          relatorio.truncadas.push(t);
        } catch (e) {
          relatorio.erros.push('TRUNCATE ' + t + ': ' + e.message);
        }
      }

      // 8) Insere dados na ordem FK-safe
      for (const t of ordemFK) {
        if (!tabelas.includes(t)) continue;
        const linhas = dados[t];
        if (!Array.isArray(linhas) || linhas.length === 0) {
          relatorio.inseridas[t] = 0;
          continue;
        }
        let ok = 0;
        for (const linha of linhas) {
          try {
            const cols = Object.keys(linha);
            if (cols.length === 0) continue;
            const placeholders = cols.map((_, i) => '$' + (i + 1)).join(', ');
            const values = cols.map(c => linha[c]);
            const colNames = cols.map(c => '"' + c + '"').join(', ');
            await db.query(
              'INSERT INTO "' + t + '" (' + colNames + ') VALUES (' + placeholders + ')',
              values
            );
            ok++;
          } catch (e) {
            relatorio.erros.push('INSERT ' + t + ': ' + e.message);
          }
        }
        relatorio.inseridas[t] = ok;
      }

      // 9) Reset de sequencias SERIAL
      try {
        const seq = await db.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'S' AND n.nspname = 'public'");
        for (const row of seq.rows) {
          try {
            await db.query("SELECT setval('" + row.relname + "', COALESCE((SELECT MAX(id) FROM " + row.relname.replace(/_id_seq$/, '') + "), 1), false)");
          } catch (e) {}
        }
      } catch (e) {}

      console.log('[RESTORE] Concluido. Tabelas: ' + relatorio.truncadas.length + ', Erros: ' + relatorio.erros.length);
      return reply.send({
        ok: true,
        mensagem: 'Restore concluido.',
        pre_backup: preBackupNome,
        relatorio: relatorio
      });
    } catch (err) {
      req.log.error({ err }, "Erro no restore");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // FASE_9_RESTORE - Listar pre-backups
  // ============================================================
  fastify.get('/api/backup/pre-restores', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      garantirPasta();
      const arquivos = fs.readdirSync(BACKUP_FOLDER)
        .filter(f => f.startsWith('pre-restore_'))
        .map(f => {
          const st = fs.statSync(path.join(BACKUP_FOLDER, f));
          return { nome: f, tamanho: st.size, criado_em: st.mtime };
        })
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
      return reply.send({ ok: true, backups: arquivos });
    } catch (err) {
      return reply.status(500).send({ erro: err.message });
    }
  });


  // ============================================================
  // FASE_9_BACKUP_COMPLETO - Backup de dados + codigo (ZIP)
  // ============================================================
  fastify.post('/api/backup/gerar-completo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      // FASE_9_FIX_TABELAS - exportar o banco ANTES de criar o ZIP
      

      // FASE_9_FIX_TABELAS
      const { dados, contagem, tabelas } = await exportarTudo();

      // FASE_9_FIX_FULLZIP - declara as variaveis do arquivo ZIP
      const agora = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeZip = 'completo_' + agora + '.zip';
      const fullZip = path.join(BACKUP_FOLDER, nomeZip);

      // FASE_9_FIX_MANIFEST - gera manifest antes de usar
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

      // FASE_9_ADMZIP - usa adm-zip (mais simples e compativel)
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();

      // 1) dados.json
      zip.addFile('dados.json', Buffer.from(JSON.stringify({
        versao: 'v1977-completo',
        gerado_em: new Date().toISOString(),
        usuario: (req.user && req.user.email) || 'sistema',
        total_tabelas: tabelas,
        contagem: contagem,
        dados: dados
      }, null, 2), 'utf8'));

      // 2) MANIFEST.txt
      zip.addFile('MANIFEST.txt', Buffer.from(manifest, 'utf8'));

      // 3) codigo/
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

      // 4) codigo/routes/
      const pastaRoutes = path.join(root, 'src', 'routes');
      if (fs.existsSync(pastaRoutes)) {
        fs.readdirSync(pastaRoutes).forEach(function(f) {
          if (f.endsWith('.js')) {
            zip.addLocalFile(path.join(pastaRoutes, f), 'codigo/routes', f);
          }
        });
      }

      // 5) migrations/
      const pastaMig = path.join(root, 'migrations');
      if (fs.existsSync(pastaMig)) {
        fs.readdirSync(pastaMig).forEach(function(f) {
          if (f.endsWith('.sql')) {
            zip.addLocalFile(path.join(pastaMig, f), 'migrations', f);
          }
        });
      }

      // 6) Grava o ZIP
      zip.writeZip(fullZip);

      // FASE_9_FIX_DUPLICATAS_30B: bloco do archiver removido

      const todos = fs.readdirSync(BACKUP_FOLDER)
        .filter(f => (f.startsWith('backup_') || f.startsWith('completo_')) && (f.endsWith('.json') || f.endsWith('.zip')))
        .map(f => ({ nome: f, mtime: fs.statSync(path.join(BACKUP_FOLDER, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);
      todos.slice(14).forEach(x => { try { fs.unlinkSync(path.join(BACKUP_FOLDER, x.nome)); } catch (e) {} });

      const tamanho = fs.statSync(fullZip).size;
      return reply.send({
        ok: true,
        arquivo: nomeZip,
        tamanho: tamanho,
        tabelas: tabelas,
        mensagem: 'Backup completo gerado.'
      });
    } catch (err) {
      req.log.error({ err }, "Erro no backup completo");
      return reply.status(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // FASE_9_BACKUP_COMPLETO - Baixar arquivo (zip ou json)
  // ============================================================
  fastify.get('/api/backup/baixar/:nome', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const nome = String(req.params.nome || '').replace(/[^a-zA-Z0-9._-]/g, '');
      const full = path.join(BACKUP_FOLDER, nome);
      if (!fs.existsSync(full)) return reply.status(404).send({ erro: 'Arquivo nao encontrado.' });
      const isZip = nome.endsWith('.zip');
      reply
        .header('Content-Type', isZip ? 'application/zip' : 'application/json; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="' + nome + '"')
        .send(fs.readFileSync(full));
    } catch (err) {
      return reply.status(500).send({ erro: err.message });
    }
  });

};
