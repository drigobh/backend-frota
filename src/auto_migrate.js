const { Pool } = require('pg');

let migrationRan = false;

async function autoMigrate(pool) {
  if (migrationRan) return;
  try {
    await pool.query(`
      -- 1. Perfis e Usuários
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

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255),
        senha VARCHAR(255),
        perfil_id INT,
        perfil VARCHAR(50) DEFAULT 'Administrador',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Cavalos / Veículos
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL UNIQUE,
        modelo VARCHAR(100),
        ano VARCHAR(20),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Carretas
      CREATE TABLE IF NOT EXISTS carretas (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        tipo VARCHAR(100),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Motoristas
      CREATE TABLE IF NOT EXISTS motoristas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cnh VARCHAR(50),
        telefone VARCHAR(50),
        obs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Acoplamentos Mensais
      CREATE TABLE IF NOT EXISTS acoplamentos (
        id SERIAL PRIMARY KEY,
        mes_referencia DATE NOT NULL,
        veiculo_id INT,
        carreta_id INT,
        motorista_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Quilometragem Mensal
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

      -- 7. Abastecimentos Detalhados
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

      -- 8. Financeiro / Lançamentos DRE
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

      -- 9. Manutenções
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

      -- 10. Documentos & Certidões
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
    console.log('✔ Todas as 10 tabelas operacionais verificadas/criadas no Neon!');
  } catch (err) {
    console.error('Erro na auto-migracao central:', err.message);
  }
}

module.exports = { autoMigrate };
