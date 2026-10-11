const { Pool } = require("pg");

let migrationRan = false;

async function autoMigrate(pool) {
  if (migrationRan) return;
  try {
    await pool.query(`
      -- ============================================================
      -- 1. Perfis
      -- ============================================================
          CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        eh_sistema BOOLEAN DEFAULT false,
        totp_obrigatorio BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- FIX_43: garante colunas em perfis pre-existentes
      ALTER TABLE perfis ADD COLUMN IF NOT EXISTS eh_sistema BOOLEAN DEFAULT false;
      ALTER TABLE perfis ADD COLUMN IF NOT EXISTS totp_obrigatorio BOOLEAN DEFAULT false;

      INSERT INTO perfis (nome, descricao) VALUES
      ('Administrador', 'Acesso total ao sistema'),
      ('Operador', 'Lançamentos operacionais'),
      ('Financeiro', 'Gestão financeira e DRE')
      ON CONFLICT (nome) DO NOTHING;

      -- ============================================================
      -- 2. Usuarios (com TODAS as colunas do banco real)
      -- ============================================================
        CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255),

        perfil_id INT,
        perfil VARCHAR(50) DEFAULT 'Administrador',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        deleted_by UUID,
        cpf VARCHAR(20),
        matricula VARCHAR(50),
        totp_secret VARCHAR(255),
        totp_ativo BOOLEAN DEFAULT false,
        totp_ativo_em TIMESTAMP WITH TIME ZONE,
        totp_obrigatorio BOOLEAN DEFAULT false,
        permite_desativar_2fa BOOLEAN DEFAULT false,
        recovery_codes JSONB DEFAULT '[]'::jsonb,
        recovery_codes_at TIMESTAMP WITH TIME ZONE
      );

      -- Garante colunas em tabelas usuarios pre-existentes
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_by UUID;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS matricula VARCHAR(50);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_ativo BOOLEAN DEFAULT false;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_ativo_em TIMESTAMP WITH TIME ZONE;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_obrigatorio BOOLEAN DEFAULT false;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permite_desativar_2fa BOOLEAN DEFAULT false;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS recovery_codes JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS recovery_codes_at TIMESTAMP WITH TIME ZONE;

      -- ============================================================
      -- 3. Cavalos / Veiculos
      -- ============================================================
            CREATE TABLE IF NOT EXISTS veiculos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filial_id UUID,
        placa VARCHAR(20) NOT NULL UNIQUE,
        modelo VARCHAR(100),
        ano VARCHAR(20),
        obs TEXT,
        status VARCHAR(20) DEFAULT 'ATIVO',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        deleted_by UUID
      );

      -- FIX_43: garante colunas em veiculos pre-existentes
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS filial_id UUID;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ATIVO';
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS deleted_by UUID;

      -- ============================================================
      -- 4. Carretas
      -- ============================================================
      CREATE TABLE IF NOT EXISTS carretas (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        tipo VARCHAR(100),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 5. Motoristas
      -- ============================================================
      CREATE TABLE IF NOT EXISTS motoristas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cnh VARCHAR(50),
        telefone VARCHAR(50),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 6. Acoplamentos Mensais
      -- ============================================================
      CREATE TABLE IF NOT EXISTS acoplamentos (
        id SERIAL PRIMARY KEY,
        mes_referencia DATE NOT NULL,
        veiculo_id INT,
        carreta_id INT,
        motorista_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 7. Quilometragem Mensal
      -- ============================================================
      CREATE TABLE IF NOT EXISTS km_mensal (
        id SERIAL PRIMARY KEY,
        mes_referencia DATE NOT NULL,
        placa VARCHAR(20) NOT NULL,
        inicial NUMERIC DEFAULT 0,
        final NUMERIC DEFAULT 0,
        litros NUMERIC DEFAULT 0,
        preco_litro NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 8. Abastecimentos Detalhados
      -- ============================================================
      CREATE TABLE IF NOT EXISTS abastecimentos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        data_abastecimento DATE,
        posto VARCHAR(150),
        cidade VARCHAR(100),
        km_atual NUMERIC DEFAULT 0,
        litros NUMERIC DEFAULT 0,
        valor_litro NUMERIC DEFAULT 0,
        valor_total NUMERIC DEFAULT 0,
        nota_fiscal VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 9. Financeiro / Lancamentos DRE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS financeiro (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20),
        data DATE,
        tipo VARCHAR(20),
        descricao TEXT,
        categoria VARCHAR(100),
        valor NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 10. Manutencoes
      -- ============================================================
      CREATE TABLE IF NOT EXISTS manutencoes (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        tipo VARCHAR(50),
        descricao TEXT,
        fornecedor VARCHAR(150),
        valor NUMERIC DEFAULT 0,
        km NUMERIC DEFAULT 0,
        proxima_manutencao_km NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );


      -- ============================================================
      -- FIX_41_RBAC_TABLES: permissoes e perfil_permissoes
      -- ============================================================
      CREATE TABLE IF NOT EXISTS permissoes (
        id SERIAL PRIMARY KEY,
        chave VARCHAR(100) NOT NULL UNIQUE,
        modulo VARCHAR(50) NOT NULL,
        descricao VARCHAR(200),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Catalogo de permissoes do sistema
      INSERT INTO permissoes (chave, modulo, descricao) VALUES
        ('dashboard.visualizar', 'Dashboard', 'Ver dashboard'),
        ('veiculos.visualizar', 'Cadastros', 'Ver veiculos'),
        ('veiculos.criar', 'Cadastros', 'Criar veiculos'),
        ('veiculos.editar', 'Cadastros', 'Editar veiculos'),
        ('veiculos.excluir', 'Cadastros', 'Excluir veiculos'),
        ('carretas.visualizar', 'Cadastros', 'Ver carretas'),
        ('carretas.criar', 'Cadastros', 'Criar carretas'),
        ('carretas.editar', 'Cadastros', 'Editar carretas'),
        ('carretas.excluir', 'Cadastros', 'Excluir carretas'),
        ('motoristas.visualizar', 'Cadastros', 'Ver motoristas'),
        ('motoristas.criar', 'Cadastros', 'Criar motoristas'),
        ('motoristas.editar', 'Cadastros', 'Editar motoristas'),
        ('motoristas.excluir', 'Cadastros', 'Excluir motoristas'),
        ('categorias.visualizar', 'Cadastros', 'Ver categorias'),
        ('categorias.criar', 'Cadastros', 'Criar categorias'),
        ('categorias.editar', 'Cadastros', 'Editar categorias'),
        ('categorias.excluir', 'Cadastros', 'Excluir categorias'),
        ('centros_custo.visualizar', 'Cadastros', 'Ver centros de custo'),
        ('centros_custo.criar', 'Cadastros', 'Criar centros de custo'),
        ('centros_custo.editar', 'Cadastros', 'Editar centros de custo'),
        ('centros_custo.excluir', 'Cadastros', 'Excluir centros de custo'),
        ('acoplamentos.visualizar', 'Operacao', 'Ver acoplamentos'),
        ('acoplamentos.criar', 'Operacao', 'Criar acoplamentos'),
        ('acoplamentos.editar', 'Operacao', 'Editar acoplamentos'),
        ('acoplamentos.excluir', 'Operacao', 'Excluir acoplamentos'),
        ('km.visualizar', 'Operacao', 'Ver KM'),
        ('km.criar', 'Operacao', 'Criar KM'),
        ('km.editar', 'Operacao', 'Editar KM'),
        ('abastecimentos.visualizar', 'Operacao', 'Ver abastecimentos'),
        ('abastecimentos.criar', 'Operacao', 'Criar abastecimentos'),
        ('abastecimentos.editar', 'Operacao', 'Editar abastecimentos'),
        ('abastecimentos.excluir', 'Operacao', 'Excluir abastecimentos'),
        ('manutencoes.visualizar', 'Operacao', 'Ver manutencoes'),
        ('manutencoes.criar', 'Operacao', 'Criar manutencoes'),
        ('manutencoes.editar', 'Operacao', 'Editar manutencoes'),
        ('manutencoes.excluir', 'Operacao', 'Excluir manutencoes'),
        ('lancamentos.visualizar', 'Financeiro', 'Ver lancamentos'),
        ('lancamentos.criar', 'Financeiro', 'Criar lancamentos'),
        ('lancamentos.editar', 'Financeiro', 'Editar lancamentos'),
        ('lancamentos.excluir', 'Financeiro', 'Excluir lancamentos'),
        ('dre.visualizar', 'Financeiro', 'Ver DRE por veiculo'),
        ('dre.consolidada.visualizar', 'Financeiro', 'Ver DRE consolidada'),
        ('metas.visualizar', 'Indicadores', 'Ver metas'),
        ('metas.criar', 'Indicadores', 'Criar metas'),
        ('metas.editar', 'Indicadores', 'Editar metas'),
        ('metas.excluir', 'Indicadores', 'Excluir metas'),
        ('ranking.visualizar', 'Indicadores', 'Ver ranking'),
        ('resumo.visualizar', 'Indicadores', 'Ver resumo executivo'),
        ('graficos.visualizar', 'Indicadores', 'Ver graficos'),
        ('historico.visualizar', 'Indicadores', 'Ver historico'),
        ('usuarios.visualizar', 'Administracao', 'Ver usuarios'),
        ('usuarios.criar', 'Administracao', 'Criar usuarios'),
        ('usuarios.editar', 'Administracao', 'Editar usuarios'),
        ('usuarios.excluir', 'Administracao', 'Excluir usuarios'),
        ('usuarios.excluidos.visualizar', 'Administracao', 'Ver usuarios excluidos'),
        ('usuarios.excluidos.restaurar', 'Administracao', 'Restaurar usuarios excluidos'),
        ('perfis.visualizar', 'Administracao', 'Ver perfis'),
        ('perfis.criar', 'Administracao', 'Criar perfis'),
        ('perfis.editar', 'Administracao', 'Editar perfis'),
        ('perfis.excluir', 'Administracao', 'Excluir perfis'),
        ('permissoes.gerenciar', 'Administracao', 'Gerenciar permissoes'),
        ('auditoria.visualizar', 'Administracao', 'Ver auditoria')
      ON CONFLICT (chave) DO NOTHING;

      CREATE TABLE IF NOT EXISTS perfil_permissoes (
        perfil_id INT NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
        permissao_id INT NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
        PRIMARY KEY (perfil_id, permissao_id)
      );

      -- Admin (perfil 1) tem TODAS as permissoes
      INSERT INTO perfil_permissoes (perfil_id, permissao_id)
      SELECT 1, id FROM permissoes
      ON CONFLICT DO NOTHING;

      -- Operador (perfil 2) tem permissoes de leitura/operacao
      INSERT INTO perfil_permissoes (perfil_id, permissao_id)
      SELECT 2, id FROM permissoes WHERE chave IN (
        'dashboard.visualizar',
        'km.visualizar', 'km.criar', 'km.editar',
        'abastecimentos.visualizar', 'abastecimentos.criar', 'abastecimentos.editar',
        'acoplamentos.visualizar', 'acoplamentos.criar', 'acoplamentos.editar',
        'veiculos.visualizar',
        'carretas.visualizar',
        'motoristas.visualizar',
        'manutencoes.visualizar',
        'lancamentos.visualizar',
        'historico.visualizar'
      )
      ON CONFLICT DO NOTHING;

      -- ============================================================
      -- 11. Documentos & Certidoes
      -- ============================================================
      CREATE TABLE IF NOT EXISTS documentos (
        id SERIAL PRIMARY KEY,
        entidade_tipo VARCHAR(50),
        entidade_nome VARCHAR(100),
        tipo_documento VARCHAR(100),
        data_emissao DATE,
        data_vencimento DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    migrationRan = true;
    console.log("OK: Todas as 11 tabelas operacionais verificadas/criadas!");
  } catch (err) {
    console.error("ERRO na auto-migracao central:", err.message);
    throw err; // FIX: propaga erro para o caller saber que falhou
  }
}

module.exports = { autoMigrate };

// Permite rodar diretamente: node src/auto_migrate.js
if (require.main === module) {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  autoMigrate(pool)
    .then(() => {
      console.log("OK: Migrations executadas (execucao direta)");
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("ERRO na migration:", err.message);
      pool.end().finally(() => process.exit(1));
    });
}
