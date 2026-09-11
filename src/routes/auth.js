const db = require('../database');

module.exports = async function (fastify, options) {
  
  // Rota de Login
  fastify.post('/api/login', async (request, reply) => {
    const { email, senha } = request.body;

    try {
      // Busca o usuário e o seu respectivo perfil de acesso
      const query = `
        SELECT 
          u.id, 
          u.nome, 
          u.email, 
          u.senha_hash, 
          p.nome as perfil,
          p.permissoes
        FROM usuarios u
        JOIN perfis_acesso p ON u.perfil_id = p.id
        WHERE u.email = $1 AND u.ativo = true
      `;
      
      const { rows } = await db.query(query, [email]);

      if (rows.length === 0) {
        return reply.status(401).send({ erro: 'E-mail não encontrado ou usuário inativo.' });
      }

      const usuario = rows[0];

      // Validação simples de senha (em produção real usariamos bcrypt, mas mantemos compatível com o hash salvo)
      if (usuario.senha_hash !== senha) {
        return reply.status(401).send({ erro: 'Senha incorreta.' });
      }

      // Atualiza o registro do último login
      await db.query(`UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`, [usuario.id]);

      // Retorna os dados do usuário e suas permissões para o frontend controlar a tela
      return {
        sucesso: true,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          permissoes: usuario.permissoes
        }
      };

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno ao realizar login.' });
    }
  });
};