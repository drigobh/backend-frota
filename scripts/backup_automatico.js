#!/usr/bin/env node
/**
 * [FIX_86 v2] Script de backup automatico do banco de dados
 * Exporta cada tabela em um arquivo JSON separado (evita limite de string)
 * 
 * Uso: node scripts/backup_automatico.js
 */

const db = require('../src/database');
const fs = require('fs');
const path = require('path');

// [FIX_88] Salva o backup no Neon (persistente)
async function salvarBackupNoNeon(metadata, backupDir) {
  try {
    // 1. Criar a tabela de backups automaticos (se nao existir)
    await db.query(`
      CREATE TABLE IF NOT EXISTS backups_automaticos (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        pasta VARCHAR(255),
        tamanho_mb DECIMAL(10, 2),
        total_tabelas INTEGER,
        metadata JSONB
      )
    `);

    // 2. Inserir o registro do backup
    const result = await db.query(
      `INSERT INTO backups_automaticos (pasta, tamanho_mb, total_tabelas, metadata) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        backupDir,
        metadata.tamanho_total_mb || 0,
        metadata.total_tabelas || 0,
        JSON.stringify(metadata)
      ]
    );

    console.log(`✅ Backup registrado no Neon (ID: ${result.rows[0].id})`);

    // 3. Limpar registros antigos (manter apenas os ultimos 7)
    await db.query(`
      DELETE FROM backups_automaticos 
      WHERE id NOT IN (
        SELECT id FROM backups_automaticos 
        ORDER BY timestamp DESC 
        LIMIT 7
      )
    `);

    return result.rows[0].id;
  } catch (e) {
    console.warn('⚠️  Erro ao salvar backup no Neon:', e.message);
    return null;
  }
}
async function backupAutomatico() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups', 'automatico', timestamp);

  // Criar pasta de backups se nao existir
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔧 [BACKUP] Iniciando backup automatico...');
  console.log('   Timestamp:', timestamp);
  console.log('   Pasta:', backupDir);

  const metadata = {
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'neondb' : 'desconhecido',
    tabelas: {}
  };

  try {
    // 1. Listar todas as tabelas do schema public
    const tabelasResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tabelas = tabelasResult.rows.map(r => r.table_name);

    // [FIX_86 v3] Tabelas ignoradas no backup (muito grandes ou redundantes)
    const TABELAS_IGNORADAS = ['backups_arquivos', 'auditoria'];
    
    const tabelasFiltradas = tabelas.filter(t => !TABELAS_IGNORADAS.includes(t));
    console.log(`📋 Tabelas para backup: ${tabelasFiltradas.length} (ignoradas: ${tabelas.length - tabelasFiltradas.length})\n`);
    console.log(`📋 Tabelas encontradas: ${tabelas.length}\n`);

    // 2. Exportar cada tabela em arquivo separado
    for (const tabela of tabelasFiltradas) {
      try {
        const result = await db.query(`SELECT * FROM "${tabela}"`);
        
        // Salvar em arquivo separado
        const tabelaFile = path.join(backupDir, `${tabela}.json`);
        fs.writeFileSync(tabelaFile, JSON.stringify(result.rows, null, 2), 'utf8');
        
        const tamanho = (fs.statSync(tabelaFile).size / 1024).toFixed(2);
        console.log(`   ✅ ${tabela}: ${result.rows.length} registros (${tamanho} KB)`);
        
        metadata.tabelas[tabela] = {
          total: result.rows.length,
          arquivo: `${tabela}.json`,
          tamanho_kb: parseFloat(tamanho)
        };
      } catch (e) {
        console.warn(`   ⚠️  ${tabela}: ${e.message}`);
        metadata.tabelas[tabela] = { erro: e.message };
      }
    }

    // 3. Salvar metadata
    const metadataFile = path.join(backupDir, '_metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

    // 4. Calcular tamanho total
    let tamanhoTotal = 0;
    const arquivos = fs.readdirSync(backupDir);
    for (const arquivo of arquivos) {
      tamanhoTotal += fs.statSync(path.join(backupDir, arquivo)).size;
    }

    console.log(`\n✅ Backup concluido!`);

    // [FIX_88] Salvar backup no Neon (persistente)
    console.log('\n📦 Salvando backup no Neon...');
    await salvarBackupNoNeon({
      timestamp: metadata.timestamp,
      total_tabelas: Object.keys(metadata.tabelas).length,
      tamanho_total_mb: parseFloat((tamanhoTotal / 1024 / 1024).toFixed(2)),
      tabelas: metadata.tabelas
    }, timestamp);
    console.log(`   Pasta: ${backupDir}`);
    console.log(`   Arquivos: ${arquivos.length}`);
    console.log(`   Tamanho total: ${(tamanhoTotal / 1024 / 1024).toFixed(2)} MB`);

    // 5. Limpar backups antigos (manter apenas os ultimos 7)
    const backupBaseDir = path.join(__dirname, '..', 'backups', 'automatico');
    const pastas = fs.readdirSync(backupBaseDir)
      .filter(f => fs.statSync(path.join(backupBaseDir, f)).isDirectory())
      .sort()
      .reverse();

    if (pastas.length > 7) {
      const paraRemover = pastas.slice(7);
      for (const pasta of paraRemover) {
        fs.rmSync(path.join(backupBaseDir, pasta), { recursive: true, force: true });
        console.log(`   🗑️  Removido backup antigo: ${pasta}`);
      }
    }

    console.log(`\n📊 Total de backups mantidos: ${Math.min(pastas.length, 7)}`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro no backup:', e.message);
    process.exit(1);
  }
}

backupAutomatico();