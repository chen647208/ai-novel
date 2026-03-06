$ErrorActionPreference = 'Stop'
function Resolve-ImportFix($filePath, $oldImport, $fallbackBase) {
  $dir = Split-Path $filePath
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $dir $oldImport))
  $exists = @(
    $candidate, "$candidate.ts", "$candidate.tsx", "$candidate.js", "$candidate.jsx",
    (Join-Path $candidate 'index.ts'), (Join-Path $candidate 'index.tsx'), (Join-Path $candidate 'index.js'), (Join-Path $candidate 'index.jsx')
  ) | Where-Object { Test-Path $_ }
  if ($exists) { return $oldImport }
  $name = [System.IO.Path]::GetFileName($oldImport)
  $fallbackCandidate = Join-Path $fallbackBase $name
  $fallbackExists = @(
    "$fallbackCandidate.ts", "$fallbackCandidate.tsx", "$fallbackCandidate.js", "$fallbackCandidate.jsx"
  ) | Where-Object { Test-Path $_ }
  if (-not $fallbackExists) { return $oldImport }
  $targetDir = Split-Path $filePath
  $baseDir = Split-Path ($fallbackExists[0])
  $fallbackRel = [System.IO.Path]::GetRelativePath($targetDir, (Join-Path $baseDir $name)).Replace('\\','/')
  if (-not $fallbackRel.StartsWith('.')) { $fallbackRel = './' + $fallbackRel }
  return $fallbackRel
}

$localImportPattern = 'from\s+["''](?<p>\./[^"'']+)["'']'

Get-ChildItem src/renderer -Directory | Where-Object { $_.Name -notin @('components','services','app','features','shared','constants') } | ForEach-Object {
  $serviceDir = Join-Path $_.FullName 'services'
  if (Test-Path $serviceDir) {
    Get-ChildItem $serviceDir -File -Include *.ts | ForEach-Object {
      $path = $_.FullName
      $content = Get-Content $path -Raw
      $content = $content.Replace("from '../types'", "from '../../types'")
      $content = $content.Replace('from "../types"', 'from "../../types"')
      $content = $content.Replace("from '../constants'", "from '../../constants'")
      $content = $content.Replace('from "../constants"', 'from "../../constants"')
      $content = $content.Replace("from '../constants/", "from '../../constants/")
      $content = $content.Replace('from "../constants/', 'from "../../constants/')
      $matches = [regex]::Matches($content, $localImportPattern)
      foreach ($m in $matches) {
        $old = $m.Groups['p'].Value
        $new = Resolve-ImportFix $path $old (Resolve-Path 'src/renderer/services')
        if ($new -ne $old) { $content = $content.Replace($old, $new) }
      }
      Set-Content $path $content
    }
  }
}

Get-ChildItem src/renderer/features -Recurse -File -Include *.tsx | ForEach-Object {
  $path = $_.FullName
  $content = Get-Content $path -Raw
  $matches = [regex]::Matches($content, $localImportPattern)
  foreach ($m in $matches) {
    $old = $m.Groups['p'].Value
    $new = Resolve-ImportFix $path $old (Resolve-Path 'src/renderer/components')
    if ($new -ne $old) { $content = $content.Replace($old, $new) }
  }
  Set-Content $path $content
}

Get-ChildItem src/renderer/app -Recurse -File -Include *.tsx | ForEach-Object {
  $path = $_.FullName
  $content = Get-Content $path -Raw
  $matches = [regex]::Matches($content, $localImportPattern)
  foreach ($m in $matches) {
    $old = $m.Groups['p'].Value
    $new = Resolve-ImportFix $path $old (Resolve-Path 'src/renderer/components')
    if ($new -ne $old) { $content = $content.Replace($old, $new) }
  }
  Set-Content $path $content
}
