#Requires -Version 5.1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Drawing

$buildDir = "C:\Users\FREE\.trae-cn\free_agent\frontend\build"
$pngPath = "$buildDir\icon.png"
$icoPath = "$buildDir\icon.ico"

Write-Host "生成 FREE Agent 占位图标..." -ForegroundColor Yellow

# 1024x1024 画布
$bmp = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 4  # AntiAlias
$g.TextRenderingHint = 4  # ClearTypeGridFit

# 纯色背景
$bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 15, 35))
$g.FillRectangle($bg, 0, 0, 1024, 1024)
$bg.Dispose()

# 同心圆装饰
$i = 0
while ($i -lt 5) {
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 120, 255), 4)
    $size = 424 - $i * 100
    $offset = 300 + $i * 50
    $g.DrawEllipse($pen, $offset, $offset, $size, $size)
    $pen.Dispose()
    $i++
}

# 文字阴影
$font = New-Object System.Drawing.Font("Segoe UI", 120, [System.Drawing.FontStyle]::Bold)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = 1  # Center
$format.LineAlignment = 1  # Center
$shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 0, 0, 0))
$g.DrawString("DA", $font, $shadow, 513, 515, $format)
$shadow.Dispose()

# 文字
$text = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 240, 255))
$g.DrawString("DA", $font, $text, 512, 512, $format)
$text.Dispose()

# 清理
$format.Dispose()
$font.Dispose()
$g.Dispose()

# 保存 PNG
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

if (Test-Path $pngPath) {
    $size = (Get-Item $pngPath).Length
    Write-Host "PNG:  $pngPath ($size bytes)" -ForegroundColor Green
} else {
    Write-Host "PNG 生成失败" -ForegroundColor Red
    exit 1
}

Write-Host "图标已生成，可直接使用" -ForegroundColor Cyan
