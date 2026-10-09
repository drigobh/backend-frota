const { Pool } = require('pg');

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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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
        senha VARCHAR(255),
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
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL UNIQUE,
        modelo VARCHAR(100),
        ano VARCHAR(20),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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
    console.log('OK: Todas as 11 tabelas operacionais verificadas/criadas!');
  } catch (err) {
    console.error('ERRO na auto-migracao central:', err.message);
    throw err; // FIX: propaga erro para o caller saber que falhou
  }
}

module.exports = { autoMigrate };


// Permite rodar diretamente: node src/auto_migrate.js
if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  autoMigrate(pool)
    .then(() => {
      console.log('OK: Migrations executadas (execucao direta)');
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('ERRO na migration:', err.message);
      pool.end().finally(() => process.exit(1));
    });
}