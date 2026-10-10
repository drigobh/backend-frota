/**
 * [FIX_37] Pre-compressao de assets (Brotli + Gzip)
 * Roda automaticamente no boot do server.js
 * Tambem pode ser chamado manualmente: node scripts/37_pre_compress.js
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

console.log("[FIX_37] Gerando pre-compressao de assets...\n");

const ARQUIVOS = [
  "index.html",
  "empresas.html",
  "empresas.css",
  "empresas.js",
  "manifest.json",
  "offline.html",
  "sw.js"
];

const DIRS = ["libs", "icons"];

let totalBr = 0;
let totalGz = 0;

function comprimirArquivo(filePath) {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) return;
  if (stat.size < 1024) return;
  if (filePath.endsWith(".br") || filePath.endsWith(".gz")) return;

  const content = fs.readFileSync(filePath);
  const rel = path.relative(PUBLIC, filePath);

  try {
    const brPath = filePath + ".br";
    const brContent = zlib.brotliCompressSync(content, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_LGWIN]: 22
      }
    });
    fs.writeFileSync(brPath, brContent);
    totalBr++;
  } catch (e) {
    console.warn("  Aviso Brotli " + rel + ": " + e.message);
  }

  try {
    const gzPath = filePath + ".gz";
    const gzContent = zlib.gzipSync(content, { level: 9 });
    fs.writeFileSync(gzPath, gzContent);
    totalGz++;
  } catch (e) {
    console.warn("  Aviso Gzip " + rel + ": " + e.message);
  }
}

ARQUIVOS.forEach((f) => {
  const full = path.join(PUBLIC, f);
  if (fs.existsSync(full)) {
    comprimirArquivo(full);
    console.log("OK: " + f);
  }
});

DIRS.forEach((d) => {
  const dir = path.join(PUBLIC, d);
  if (!fs.existsSync(dir)) return;
  const walk = (current) => {
    fs.readdirSync(current).forEach((item) => {
      const full = path.join(current, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else comprimirArquivo(full);
    });
  };
  walk(dir);
});

console.log("\n[FIX_37] Pre-compressao concluida!");
console.log("  Brotli (.br): " + totalBr + " arquivos");
console.log("  Gzip (.gz):   " + totalGz + " arquivos");
