#Requires -Version 5.1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# FREE Agent 构建脚本
# 流程：安装依赖 → 构建前端 → 编译 Rust Server → 打包 Electron

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "frontend"
$RustDir = Join-Path $ProjectRoot "claw-code" "rust"
$ResourcesDir = Join-Path $FrontendDir "resources" "server"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FREE Agent Build Script v6.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ==================== 第一步：安装前端依赖 ====================
Write-Host "[1/4] 安装前端依赖..." -ForegroundColor Yellow
Set-Location $FrontendDir
if (Test-Path "node_modules") {
    Write-Host "  跳过 npm install (node_modules 已存在)" -ForegroundColor Gray
} else {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install 失败" }
}
Write-Host "  ✅ 前端依赖安装完成" -ForegroundColor Green
Write-Host ""

# ==================== 第二步：构建前端 ====================
Write-Host "[2/4] 构建前端..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "前端构建失败" }
Write-Host "  ✅ 前端构建完成" -ForegroundColor Green
Write-Host ""

# ==================== 第三步：编译 Rust Server ====================
Write-Host "[3/4] 编译 Rust Server..." -ForegroundColor Yellow
Set-Location $RustDir

# 检查 cargo 是否可用
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "  ⚠️  cargo 未安装，跳过 Rust Server 编译" -ForegroundColor Yellow
    Write-Host "  请手动编译 server crate 并放置到 resources/server/ 目录" -ForegroundColor Yellow
} else {
    # 尝试 release 编译
    cargo build --release -p server
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Rust Server 编译成功" -ForegroundColor Green

        # 复制到 resources 目录
        $ServerExe = Join-Path $RustDir "target" "release" "server.exe"
        if (Test-Path $ServerExe) {
            if (-not (Test-Path $ResourcesDir)) {
                New-Item -ItemType Directory -Path $ResourcesDir -Force | Out-Null
            }
            Copy-Item -Path $ServerExe -Destination (Join-Path $ResourcesDir "server.exe") -Force
            Write-Host "  ✅ Server 已复制到 resources/server/" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ 未找到 server.exe，可能在其他位置" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️ Release 编译失败，尝试 debug 模式..." -ForegroundColor Yellow
        cargo build -p server
        if ($LASTEXITCODE -eq 0) {
            $ServerExe = Join-Path $RustDir "target" "debug" "server.exe"
            if (Test-Path $ServerExe) {
                if (-not (Test-Path $ResourcesDir)) {
                    New-Item -ItemType Directory -Path $ResourcesDir -Force | Out-Null
                }
                Copy-Item -Path $ServerExe -Destination (Join-Path $ResourcesDir "server.exe") -Force
                Write-Host "  ✅ Server (debug) 已复制到 resources/server/" -ForegroundColor Green
            }
        } else {
            Write-Host "  ❌ Rust Server 编译失败" -ForegroundColor Red
            Write-Host "  请手动运行: cargo build -p server" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# ==================== 第四步：打包 Electron ====================
Write-Host "[4/4] 打包 Electron 应用..." -ForegroundColor Yellow
Set-Location $FrontendDir
npx electron-builder
if ($LASTEXITCODE -ne 0) { throw "Electron 打包失败" }
Write-Host "  ✅ Electron 打包完成" -ForegroundColor Green
Write-Host ""

# ==================== 完成 ====================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  构建完成！" -ForegroundColor Green
Write-Host "  安装包位置: $FrontendDir\release\" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
