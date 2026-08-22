# MiGym brand asset generator.
# Regenerates every PNG icon/splash from one geometric mark so all densities stay in sync.
# No dependencies beyond .NET System.Drawing. Run from anywhere:
#   powershell -File scripts/make-icons.ps1   (from frontend/)
#
# Mark: minimal dumbbell, accent #30d158 on near-black #0c0e12 (matches --acc / manifest bg).
param([string]$Root = "$PSScriptRoot\..")

Add-Type -AssemblyName System.Drawing

$BG = [System.Drawing.Color]::FromArgb(255, 0x0c, 0x0e, 0x12)
$FG = [System.Drawing.Color]::FromArgb(255, 0x30, 0xd1, 0x58)
$WHITE = [System.Drawing.Color]::White

function New-RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Dumbbell mark drawn inside box (x,y,w,h): handle + two plates.
function Draw-Mark([System.Drawing.Graphics]$g, [float]$x, [float]$y, [float]$w, [float]$h) {
  $brush = New-Object System.Drawing.SolidBrush($FG)
  $plateW = 0.13 * $w; $handleH = 0.12 * $h
  $g.FillPath($brush, (New-RoundRect ($x + 0.04 * $w) ($y + 0.06 * $h) $plateW (0.88 * $h) ($plateW * 0.45)))
  $g.FillPath($brush, (New-RoundRect ($x + 0.83 * $w) ($y + 0.06 * $h) $plateW (0.88 * $h) ($plateW * 0.45)))
  $g.FillPath($brush, (New-RoundRect ($x + 0.15 * $w) ($y + 0.44 * $h) (0.70 * $w) $handleH ($handleH * 0.5)))
  $brush.Dispose()
}

function Get-Dims($path) {
  $img = [System.Drawing.Image]::FromFile($path)
  $d = @($img.Width, $img.Height); $img.Dispose(); return $d
}

function Save-Icon($path, [int]$w, [int]$h, [scriptblock]$paint) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'
  & $paint $g $w $h
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "  wrote $path (${w}x${h})"
}

function Paint-SquareBg($g, $w, $h, [bool]$rounded) {
  if ($rounded) {
    $inset = 0.02 * [Math]::Min($w, $h)
    $g.FillPath((New-Object System.Drawing.SolidBrush($BG)), (New-RoundRect $inset $inset ($w - 2 * $inset) ($h - 2 * $inset) (0.22 * $w)))
  } else {
    $g.Clear($BG)
  }
}

$pub = Join-Path $Root 'public'
$res = Join-Path $Root 'android\app\src\main\res'

Write-Host 'Web/PWA icons:'
$d = Get-Dims (Join-Path $pub 'icon-512.png')
Save-Icon (Join-Path $pub 'icon-512.png') $d[0] $d[1] { param($g, $w, $h)
  Paint-SquareBg $g $w $h $true
  $m = 0.30 * [Math]::Min($w, $h)          # maskable-safe: mark inside centre ~40%
  Draw-Mark $g (($w - $m * 1.4) / 2) (($h - $m) / 2) ($m * 1.4) $m
}
$d = Get-Dims (Join-Path $pub 'icon-180.png')
Save-Icon (Join-Path $pub 'icon-180.png') $d[0] $d[1] { param($g, $w, $h)
  Paint-SquareBg $g $w $h $false           # iOS applies its own mask — full bleed
  $m = 0.34 * [Math]::Min($w, $h)
  Draw-Mark $g (($w - $m * 1.4) / 2) (($h - $m) / 2) ($m * 1.4) $m
}

Write-Host 'Android launchers:'
Get-ChildItem $res -Directory -Filter 'mipmap-*' | ForEach-Object {
  foreach ($name in 'ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground', 'ic_launcher_background') {
    $p = Join-Path $_.FullName "$name.png"
    if (!(Test-Path $p)) { continue }
    $d = Get-Dims $p
    Save-Icon $p $d[0] $d[1] {
      param($g, $w, $h)
      if ($name -eq 'ic_launcher')       { Paint-SquareBg $g $w $h $true;  $m = 0.42 * $h; Draw-Mark $g (($w - $m * 1.4) / 2) (($h - $m) / 2) ($m * 1.4) $m }
      elseif ($name -eq 'ic_launcher_round') { 
        $brush = New-Object System.Drawing.SolidBrush($BG)
        $g.FillEllipse($brush, 0.01 * $w, 0.01 * $h, 0.98 * $w, 0.98 * $h); $brush.Dispose()
        $m = 0.42 * $h; Draw-Mark $g (($w - $m * 1.4) / 2) (($h - $m) / 2) ($m * 1.4) $m
      }
      elseif ($name -eq 'ic_launcher_foreground') { $m = 0.46 * $h; Draw-Mark $g (($w - $m * 1.4) / 2) (($h - $m) / 2) ($m * 1.4) $m }  # transparent bg; adaptive inset shrinks further
      else { $g.Clear($BG) }               # ic_launcher_background: solid fill
    }.GetNewClosure()
  }
}

Write-Host 'Splash screens:'
Get-ChildItem $res -Recurse -Filter 'splash.png' | ForEach-Object {
  $p = $_.FullName
  $d = Get-Dims $p
  Save-Icon $p $d[0] $d[1] {
    param($g, $w, $h)
    $g.Clear($BG)
    $min = [Math]::Min($w, $h)
    $m = 0.20 * $min
    $markTop = 0.36 * $h - $m / 2
    Draw-Mark $g (($w - $m * 1.4) / 2) $markTop ($m * 1.4) $m
    $font = try { New-Object System.Drawing.Font('Segoe UI', (0.085 * $min), [System.Drawing.FontStyle]::Bold) } catch { New-Object System.Drawing.Font('Arial', (0.085 * $min), [System.Drawing.FontStyle]::Bold) }
    $tb = New-Object System.Drawing.SolidBrush($WHITE)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $g.DrawString('MiGym', $font, $tb, (New-Object System.Drawing.RectangleF(0, ($markTop + $m + 0.05 * $min), $w, (0.14 * $min))), $sf)
    $sf.Dispose(); $tb.Dispose(); $font.Dispose()
  }.GetNewClosure()
}

Write-Host 'Done.'
