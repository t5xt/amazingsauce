$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$horPath = Join-Path $repoRoot "HOR"
$manifestPath = Join-Path $horPath "manifest.json"
$extensions = @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif")
$existingCaptions = @{}

if (-not (Test-Path $horPath)) {
  New-Item -ItemType Directory -Path $horPath | Out-Null
}

if (Test-Path $manifestPath) {
  try {
    $existingManifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
    foreach ($item in @($existingManifest.images)) {
      if ($item -is [string]) {
        $existingCaptions[$item] = ""
      } elseif ($null -ne $item.src) {
        $existingCaptions[[string]$item.src] = [string]$item.caption
      }
    }
  } catch {
    Write-Warning "Existing manifest could not be parsed. Rebuilding without saved captions."
  }
}

$images = Get-ChildItem -Path $horPath -File |
  Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object Name |
  ForEach-Object {
    $src = "HOR/$($_.Name)"
    [ordered]@{
      src = $src
      caption = if ($existingCaptions.ContainsKey($src)) { $existingCaptions[$src] } else { "" }
    }
  }

$manifest = @{
  images = @($images)
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "Wrote $($images.Count) image entries to HOR/manifest.json"
