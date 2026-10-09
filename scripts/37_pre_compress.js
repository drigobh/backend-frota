#!/usr/bin/env node
/**
 * FIX_37 - Pré-compressão do index.html
 *
 * O que faz:
 *  1. Lê public/index.html
 *  2. Gera public/index.html.br (Brotli, ~120 KB)
 *  3. Gera public/index.html.gz (Gzip, ~150 KB)
 *  4. Só regenera se o index.html mudou (comparação por hash SHA-256)
 *  5. Salva um .meta.json com hash + timestamp + versão
 *
 * Uso:
 *   node scripts/37_pre_compress.js              → gera se necessário
 *   node scripts/37_pre_compress.js --force      → força regeneração
 *   node scripts/37_pre_compress.js --check      → só verifica status (não gera)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILE = path.join(ROOT, 'public', 'index.html');
const BR_FILE = path.join(ROOT, 'public', 'index.html.br');
const GZ_FILE = path.join(ROOT, 'public', 'index.html.gz');
const META_FILE = path.join(ROOT, 'public', 'index.html.meta.json');

const FORCE = process.argv.includes('--force');
const CHECK_ONLY = process.argv.includes('--check');

console.log('🔧 FIX_37: Pre-compressao do index.html');
console.log(`Modo: ${CHECK_ONLY ? 'CHECK (só verifica)' : FORCE ? 'FORCE (regenera)' : 'AUTO (só se mudou)'}`);
console.log('');

// ============================================================
// 0. Validações
// ============================================================
if (!fs.existsSync(HTML_FILE)) {
  console.error(`❌ Arquivo não encontrado: ${HTML_FILE}`);
  process.exit(1);
}

// ============================================================
// 1. Calcula hash do index.html atual
// ============================================================
const htmlContent = fs.readFileSync(HTML_FILE);
const htmlSize = htmlContent.length;
const htmlHash = crypto.createHash('sha256').update(htmlContent).digest('hex');

console.log(`📄 index.html:`);
console.log(`   Tamanho: ${(htmlSize / 1024).toFixed(1)} KB`);
console.log(`   Hash:    ${htmlHash.substring(0, 16)}...`);

// ============================================================
// 2. Verifica meta anterior
// ============================================================
let meta = null;
if (fs.existsSync(META_FILE)) {
  try {
    meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    console.log(`📋 Meta anterior:`);
    console.log(`   Hash:    ${(meta.hash || '').substring(0, 16)}...`);
    console.log(`   Gerado:  ${meta.gerado_em}`);
  } catch (e) {
    console.log('⚠️  Meta corrompido, regenerando...');
  }
}

// ============================================================
// 3. Decide se regenera
// ============================================================
const hashMudou = !meta || meta.hash !== htmlHash;
const brExiste = fs.existsSync(BR_FILE);
const gzExiste = fs.existsSync(GZ_FILE);
const precisaRegenerar = FORCE || hashMudou || !brExiste || !gzExiste;

console.log('');
console.log('🔍 Análise:');
console.log(`   Hash mudou?         ${hashMudou ? 'SIM' : 'NÃO'}`);
console.log(`   .br existe?         ${brExiste ? 'SIM' : 'NÃO'}`);
console.log(`   .gz existe?         ${gzExiste ? 'SIM' : 'NÃO'}`);
console.log(`   Precisa regenerar?  ${precisaRegenerar ? 'SIM' : 'NÃO'}`);

if (CHECK_ONLY) {
  console.log('');
  console.log('✅ Check concluído. Nenhum arquivo foi modificado.');
  process.exit(0);
}

if (!precisaRegenerar) {
  console.log('');
  console.log('✅ Arquivos .br e .gz já estão atualizados. Nada a fazer.');
  console.log('');
  if (brExiste) console.log(`   📦 ${(fs.statSync(BR_FILE).size / 1024).toFixed(1)} KB (.br)`);
  if (gzExiste) console.log(`   📦 ${(fs.statSync(GZ_FILE).size / 1024).toFixed(1)} KB (.gz)`);
  process.exit(0);
}

// ============================================================
// 4. Gera .br (Brotli)
// ============================================================
console.log('');
console.log('🗜️  Gerando Brotli...');

const t0 = Date.now();
const brotliParams = {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,  // 11 = máxima qualidade
    [zlib.constants.BROTLI_PARAM_LGWIN]: 22,    // window 22 (4 MB) — ótimo p/ HTML
  },
};

const brBuffer = zlib.brotliCompressSync(htmlContent, brotliParams);
fs.writeFileSync(BR_FILE, brBuffer);

const brSize = brBuffer.length;
const brTempo = Date.now() - t0;
const brReducao = ((1 - brSize / htmlSize) * 100).toFixed(1);

console.log(`   ✅ ${(brSize / 1024).toFixed(1)} KB (-${brReducao}%) em ${brTempo}ms`);

// ============================================================
// 5. Gera .gz (Gzip) como fallback
// ============================================================
console.log('');
console.log('🗜️  Gerando Gzip (fallback)...');

const t1 = Date.now();
const gzBuffer = zlib.gzipSync(htmlContent, { level: 9 });  // 9 = máxima compressão
fs.writeFileSync(GZ_FILE, gzBuffer);

const gzSize = gzBuffer.length;
const gzTempo = Date.now() - t1;
const gzReducao = ((1 - gzSize / htmlSize) * 100).toFixed(1);

console.log(`   ✅ ${(gzSize / 1024).toFixed(1)} KB (-${gzReducao}%) em ${gzTempo}ms`);

// ============================================================
// 6. Salva meta
// ============================================================
const novoMeta = {
  hash: htmlHash,
  gerado_em: new Date().toISOString(),
  html_size: htmlSize,
  br_size: brSize,
  gz_size: gzSize,
  br_reducao: brReducao + '%',
  gz_reducao: gzReducao + '%',
};

fs.writeFileSync(META_FILE, JSON.stringify(novoMeta, null, 2), 'utf8');

// ============================================================
// 7. Relatório final
// ============================================================
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  ✅ FIX_37 CONCLUÍDO');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Original:  ${(htmlSize / 1024).toFixed(1)} KB`);
console.log(`  Brotli:    ${(brSize / 1024).toFixed(1)} KB (-${brReducao}%)`);
console.log(`  Gzip:      ${(gzSize / 1024).toFixed(1)} KB (-${gzReducao}%)`);
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('📁 Arquivos gerados:');
console.log(`   public/index.html.br`);
console.log(`   public/index.html.gz`);
console.log(`   public/index.html.meta.json`);
console.log('');