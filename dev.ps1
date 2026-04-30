# FREE Agent 一键启动脚本（Windows PowerShell）
# 同时启动：Vite 前端 + Rust Server + llama-server

$ErrorActionPreference = 'Continue'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FREE Agent - 一键启动" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 项目根目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$FrontendDir = Join-Path $ScriptDir "frontend"
$RustDir = Join-Path $ScriptDir "claw-code\rust"

# ==================== 1. 检查 llama-server ====================

$llamaPaths = @(
    (Join-Path $FrontendDir "llama-b8352\llama-server.exe"),
    (Join-Path $ScriptDir "llama-b8352\llama-server.exe"),
    "$env:LOCALAPPDATA\free-agent\llama-b8352\llama-server.exe"
)

$llamaExe = $null
foreach ($p in $llamaPaths) {
    if (Test-Path $p) {
        $llamaExe = $p
        break
    }
}

if ($llamaExe) {
    Write-Host "[OK] llama-server 已找到: $llamaExe" -ForegroundColor Green
} else {
    Write-Host "[WARN] llama-server 未找到，将跳过模型服务启动" -ForegroundColor Yellow
    Write-Host "       请将 llama-server.exe 放在以下任一位置：" -ForegroundColor Yellow
    foreach ($p in $llamaPaths) {
        Write-Host "         - $p" -ForegroundColor DarkYellow
    }
}

# ==================== 2. 检查模型文件 ====================

$modelFileName = "Qwen3.5-9B-Unredacted-MAX.Q8_0.gguf"
$modelSearchPaths = @(
    (Join-Path $ScriptDir "Qwen3.5-Thinking-AIO-GGUF\Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF\$modelFileName"),
    "$env:LOCALAPPDATA\free-agent\Qwen3.5-Thinking-AIO-GGUF\Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF\$modelFileName"
)

$modelPath = $null
foreach ($p in $modelSearchPaths) {
    if (Test-Path $p) {
        $modelPath = $p
        break
    }
}

if ($modelPath) {
    $modelSize = [math]::Round((Get-Item $modelPath).Length / 1GB, 2)
    Write-Host "[OK] 模型文件已找到: $modelPath ($modelSize GB)" -ForegroundColor Green
} else {
    Write-Host "[WARN] 模型文件未找到，将使用默认路径搜索" -ForegroundColor Yellow
}

# ==================== 3. GPU 检测 ====================

$gpuLayers = 99
try {
    $gpuInfo = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue
    if ($gpuInfo) {
        $hasGpu = $false
        foreach ($gpu in $gpuInfo) {
            if ($gpu.Name -match "NVIDIA|AMD|Intel") {
                $hasGpu = $true
                if ($gpu.Name -match "NVIDIA") {
                    Write-Host "[OK] 检测到 NVIDIA GPU，使用 CUDA 加速" -ForegroundColor Green
                } elseif ($gpu.Name -match "AMD") {
                    Write-Host "[OK] 检测到 AMD GPU，使用 ROCm 加速" -ForegroundColor Green
                } else {
                    Write-Host "[OK] 检测到 GPU: $($gpu.Name)" -ForegroundColor Green
                }
            }
        }
        if (-not $hasGpu) {
            $gpuLayers = 0
            Write-Host "[INFO] 未检测到独立 GPU，使用 CPU 推理" -ForegroundColor DarkYellow
        }
    }
} catch {
    Write-Host "[WARN] GPU 检测失败，使用默认 GPU 层数" -ForegroundColor Yellow
}

# ==================== 4. 启动服务 ====================

Write-Host ""
Write-Host "正在启动服务..." -ForegroundColor Cyan
Write-Host ""

# --- 启动 Vite ---
Write-Host "[1/3] 启动 Vite 前端 (http://localhost:5173) ..." -ForegroundColor Cyan
$frontendJob = Start-Process -FilePath "npx" -ArgumentList "vite", "--host", "127.0.0.1" -WorkingDirectory $FrontendDir -NoNewWindow -PassThru -ErrorAction SilentlyContinue
if ($frontendJob) {
    Write-Host "      PID: $($frontendJob.Id)" -ForegroundColor DarkGray
}
Start-Sleep -Seconds 2

# --- 启动 Rust Server ---
Write-Host "[2/3] 启动 Rust Server (http://localhost:3000) ..." -ForegroundColor Cyan
$rustJob = Start-Process -FilePath "cargo" -ArgumentList "run", "-p", "server" -WorkingDirectory $RustDir -NoNewWindow -PassThru -ErrorAction SilentlyContinue
if ($rustJob) {
    Write-Host "      PID: $($rustJob.Id)" -ForegroundColor DarkGray
}
Start-Sleep -Seconds 2

# --- 启动 llama-server ---
if ($llamaExe -and $modelPath) {
    Write-Host "[3/3] 启动 llama-server (http://localhost:8080) ..." -ForegroundColor Cyan
    $mmprojPath = $modelPath -replace "\.gguf$", ""
    $mmprojSearch = @(
        "$mmprojPath-mmproj-bf16.gguf",
        "$mmprojPath.mmproj-bf16.gguf",
        (Join-Path (Split-Path $modelPath) "Qwen3.5-9B-Unredacted-MAX.mmproj-bf16.gguf")
    )
    $actualMmproj = $null
    foreach ($mp in $mmprojSearch) {
        if (Test-Path $mp) {
            $actualMmproj = $mp
            break
        }
    }

    $llamaArgs = @(
        "-m", "`"$modelPath`""
    )
    if ($actualMmproj) {
        $llamaArgs += "--mmproj", "`"$actualMmproj`""
    }
    $llamaArgs += "--port", "8080", "--host", "127.0.0.1", "-ngl", "$gpuLayers", "--ctx-size", "16384"

    $llamaJob = Start-Process -FilePath $llamaExe -ArgumentList $llamaArgs -NoNewWindow -PassThru -ErrorAction SilentlyContinue
    if ($llamaJob) {
        Write-Host "      PID: $($llamaJob.Id)" -ForegroundColor DarkGray
    }
} elseif ($llamaExe) {
    Write-Host "[3/3] 启动 llama-server (模型路径需手动配置) ..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  服务已启动" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "  前端:   http://localhost:5173" -ForegroundColor White
Write-Host "  API:    http://localhost:3000" -ForegroundColor White
Write-Host "  模型:   http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "  按 Ctrl+C 停止所有服务" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# 等待用户中断
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "正在停止所有服务..." -ForegroundColor Yellow
    if ($frontendJob) { Stop-Process -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue }
    if ($rustJob) { Stop-Process -Id $rustJob.Id -Force -ErrorAction SilentlyContinue }
    if ($llamaJob) { Stop-Process -Id $llamaJob.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "所有服务已停止" -ForegroundColor Green
}
