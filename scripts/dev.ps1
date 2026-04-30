#Requires -Version 5.1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# FREE Agent 开发模式启动脚本

$ErrorActionPreference = "Stop"
$FrontendDir = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FREE Agent Dev Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 node_modules
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "安装依赖..." -ForegroundColor Yellow
    Set-Location $FrontendDir
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install 失败" }
    Write-Host ""
}

# 启动开发模式
Write-Host "启动开发服务器..." -ForegroundColor Yellow
Write-Host "前端: http://localhost:5173" -ForegroundColor Gray
Write-Host ""

Set-Location $FrontendDir
npm run electron:dev
