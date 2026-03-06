$files = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx
$missing = @()
$pattern = 'from\s+["''](?<p>\.[^"'']+)["'']'
foreach ($file in $files) {
  try {
    $content = Get-Content $file.FullName -Raw -ErrorAction Stop
  } catch {
    continue
  }
  if ([string]::IsNullOrWhiteSpace($content)) { continue }
  $matches = [regex]::Matches($content, $pattern)
  foreach ($m in $matches) {
    $p = $m.Groups['p'].Value
    $base = Split-Path $file.FullName
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $base $p))
    $valid = @(
      $candidate,
      "$candidate.ts",
      "$candidate.tsx",
      "$candidate.js",
      "$candidate.jsx",
      (Join-Path $candidate 'index.ts'),
      (Join-Path $candidate 'index.tsx'),
      (Join-Path $candidate 'index.js'),
      (Join-Path $candidate 'index.jsx')
    ) | Where-Object { Test-Path $_ }
    if (-not $valid) {
      $missing += [PSCustomObject]@{ File=$file.FullName.Replace((Get-Location).Path+'\\',''); Import=$p }
    }
  }
}
$missing | Sort-Object File,Import | Format-Table -AutoSize
