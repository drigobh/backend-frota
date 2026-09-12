$ErrorActionPreference = "Stop"
$backendPath = "C:\Users\RAV\OneDrive\Documentos\Projeto caderninho-frota\backend"
$filePath = Join-Path $backendPath "public\index.html"

Write-Host "PATCH JWT v2" -ForegroundColor Cyan
$backupPath = "$filePath.bak"
Copy-Item $filePath $backupPath -Force
Write-Host "[OK] Backup criado" -ForegroundColor Green

$content = Get-Content $filePath -Raw -Encoding UTF8
$originalLength = $content.Length

$regex1 = [regex]"(?m)^\s*const API_URL = '/api';\s*\r?\n\s*const INITIAL_MONTHS"
$replacement1 = @"
    const API_URL = '/api';

    function apiFetch(endpoint, options = {}) {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (token) {
        headers['Authorization'] = `Bearer `${token}`;
      }
      return fetch(``${API_URL}${endpoint}``, {
        ...options,
        headers,
      }).then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          const loginScreen = document.getElementById('login-screen');
          if (loginScreen) loginScreen.style.display = 'flex';
          throw new Error('Sessao expirada. Faca login novamente.');
        }
        return res;
      });
    }

    const INITIAL_MONTHS
"@
if ($regex1.IsMatch($content)) {
    $content = $regex1.Replace($content, $replacement1, 1)
    Write-Host "[1/5] apiFetch adicionado" -ForegroundColor Green
} else {
    Write-Host "[1/5] FALHOU" -ForegroundColor Red
}

$regex2 = [regex]"(?m)^\s*state\.user = data\.usuario;"
$replacement2 = @"
        localStorage.setItem('token', data.token);
        state.user = data.usuario;
"@
if ($regex2.IsMatch($content)) {
    $content = $regex2.Replace($content, $replacement2.TrimEnd(), 1)
    Write-Host "[2/5] Login salva token" -ForegroundColor Green
} else {
    Write-Host "[2/5] FALHOU" -ForegroundColor Red
}

$regex3 = [regex]"(?m)^\s*function fazerLogout\(\) \{\s*\r?\n\s*state\.user = null;"
$replacement3 = @"
    function fazerLogout() {
      localStorage.removeItem('token');
      state.user = null;
"@
if ($regex3.IsMatch($content)) {
    $content = $regex3.Replace($content, $replacement3.TrimEnd(), 1)
    Write-Host "[3/5] Logout remove token" -ForegroundColor Green
} else {
    Write-Host "[3/5] FALHOU" -ForegroundColor Red
}

$content = $content -replace 'fetch\(`\$\{API_URL\}/login`', '___KEEP_LOGIN___'
$content = $content -replace 'fetch\(`\$\{API_URL\}\$\{endpoint\}`', '___KEEP_INTERNAL___'
$content = $content -replace 'fetch\(`\$\{API_URL\}', 'apiFetch(`'
$content = $content -replace '___KEEP_INTERNAL___', 'fetch(`${API_URL}${endpoint}`'
$content = $content -replace '___KEEP_LOGIN___', 'fetch(`${API_URL}/login`'
Write-Host "[4/5] fetch convertidos" -ForegroundColor Green

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "[5/5] Arquivo gravado" -ForegroundColor Green

$diff = $content.Length - $originalLength
Write-Host ""
Write-Host "Original: $originalLength bytes" -ForegroundColor Yellow
Write-Host "Final:    $($content.Length) bytes" -ForegroundColor Yellow
Write-Host "Diff:     $diff bytes" -ForegroundColor Yellow
$c1 = ([regex]::Matches($content, 'apiFetch\(')).Count
$c2 = ([regex]::Matches($content, 'fetch\(`\$\{API_URL\}')).Count
Write-Host "apiFetch(: $c1 ocorrencias" -ForegroundColor Cyan
Write-Host "fetch(`\${API_URL}: $c2 ocorrencias (esperado: 2)" -ForegroundColor Cyan