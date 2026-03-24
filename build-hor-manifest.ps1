$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$horPath = Join-Path $repoRoot "HOR"
$manifestPath = Join-Path $horPath "manifest.json"
$extensions = @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif")

if (-not (Test-Path $horPath)) {
  New-Item -ItemType Directory -Path $horPath | Out-Null
}

$images = Get-ChildItem -Path $horPath -File |
  Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object Name |
  ForEach-Object { "HOR/$($_.Name)" }

$manifest = @{
  images = @($images)
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "Wrote $($images.Count) image entries to HOR/manifest.json"
