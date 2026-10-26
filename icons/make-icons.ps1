Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

  $rect = New-Object System.Drawing.Rectangle 1, 1, ($size - 2), ($size - 2)
  $c1 = [System.Drawing.Color]::FromArgb(255, 102, 126, 234)
  $c2 = [System.Drawing.Color]::FromArgb(255, 118, 75, 162)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 135.0)

  $g.FillRectangle($brush, $rect)

  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $penWidth = [Math]::Max(1, [int]($size / 16))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 255, 255, 255), $penWidth)
  $innerX = [int]($size * 0.22)
  $innerY = [int]($size * 0.22)
  $innerW = [int]($size * 0.56)
  $innerH = [int]($size * 0.56)
  $g.DrawRectangle($pen, $innerX, $innerY, $innerW, $innerH)

  $cx = [int]($size * 0.38)
  $cy = [int]($size * 0.40)
  $cr = [Math]::Max(1, [int]($size * 0.08))
  $g.FillEllipse($white, $cx - $cr, $cy - $cr, $cr * 2, $cr * 2)

  $pts = @(
    (New-Object System.Drawing.Point ([int]($size * 0.22), [int]($size * 0.70))),
    (New-Object System.Drawing.Point ([int]($size * 0.40), [int]($size * 0.52))),
    (New-Object System.Drawing.Point ([int]($size * 0.55), [int]($size * 0.62))),
    (New-Object System.Drawing.Point ([int]($size * 0.68), [int]($size * 0.48))),
    (New-Object System.Drawing.Point ([int]($size * 0.78), [int]($size * 0.70)))
  )
  $g.FillPolygon($white, $pts)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose()
  $white.Dispose()
  $brush.Dispose()
  $g.Dispose()
  $bmp.Dispose()
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Icon 16 (Join-Path $dir 'icon16.png')
New-Icon 48 (Join-Path $dir 'icon48.png')
New-Icon 128 (Join-Path $dir 'icon128.png')
Write-Output 'ok'
