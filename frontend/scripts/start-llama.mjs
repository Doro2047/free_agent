/**
 * start-llama.mjs — 独立启动 llama-server（不依赖 Electron）
 *
 * 用法：node scripts/start-llama.mjs
 * 环境变量：
 *   LLAMA_EXE_PATH     - llama-server 可执行文件路径（可选）
 *   LLAMA_MODEL_PATH   - 模型文件路径（可选）
 *   LLAMA_MMPROJ_PATH  - 多模态投影文件路径（可选）
 *   LLAMA_PORT         - 监听端口（默认 8080）
 *   LLAMA_GPU_LAYERS   - GPU 层数（默认 99）
 *   LLAMA_CTX_SIZE     - 上下文大小（默认 16384）
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const FRONTEND_DIR = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.LLAMA_PORT || '8080', 10);
const GPU_LAYERS = parseInt(process.env.LLAMA_GPU_LAYERS || '99', 10);
const CTX_SIZE = parseInt(process.env.LLAMA_CTX_SIZE || '16384', 10);

function findExecutable() {
  const exeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  const searchPaths = [
    process.env.LLAMA_EXE_PATH,
    path.join(FRONTEND_DIR, 'llama-b8352', exeName),
    path.join(ROOT_DIR, 'llama-b8352', exeName),
  ].filter(Boolean);

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findModel() {
  const modelFileName = 'Qwen3.5-9B-Unredacted-MAX.Q8_0.gguf';
  const searchPaths = [
    process.env.LLAMA_MODEL_PATH,
    path.join(ROOT_DIR, 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', modelFileName),
  ].filter(Boolean);

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findMmproj() {
  const mmprojFileName = 'Qwen3.5-9B-Unredacted-MAX.mmproj-bf16.gguf';
  const searchPaths = [
    process.env.LLAMA_MMPROJ_PATH,
    path.join(ROOT_DIR, 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', mmprojFileName),
  ].filter(Boolean);

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function checkHealth() {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); resolve(false); }, 2000);
    http.get(`http://localhost:${PORT}/health`, { signal: controller.signal }, (res) => {
      clearTimeout(timer);
      resolve(res.statusCode >= 200 && res.statusCode < 300);
    }).on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

async function waitForHealthy(maxWaitMs = 30000, pollMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkHealth()) return true;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

async function main() {
  const exePath = findExecutable();
  if (!exePath) {
    console.log('[LLM] llama-server 可执行文件未找到，跳过模型服务启动');
    console.log('[LLM] 请将 llama-server 放在以下位置之一：');
    console.log(`      ${path.join(FRONTEND_DIR, 'llama-b8352')}`);
    console.log(`      ${path.join(ROOT_DIR, 'llama-b8352')}`);
    console.log('[LLM] 或设置环境变量 LLAMA_EXE_PATH');
    process.exit(0);
  }

  const modelPath = findModel();
  if (!modelPath) {
    console.log('[LLM] 模型文件未找到，跳过模型服务启动');
    console.log('[LLM] 请设置环境变量 LLAMA_MODEL_PATH');
    process.exit(0);
  }

  const mmprojPath = findMmproj();

  const args = [
    '-m', modelPath,
    '--port', String(PORT),
    '--host', '127.0.0.1',
    '-ngl', String(GPU_LAYERS),
    '--ctx-size', String(CTX_SIZE),
  ];

  if (mmprojPath) {
    args.push('--mmproj', mmprojPath);
  }

  console.log(`[LLM] 启动 llama-server...`);
  console.log(`[LLM] 可执行文件：${exePath}`);
  console.log(`[LLM] 模型文件：${modelPath}`);
  console.log(`[LLM] 端口：${PORT}, GPU 层数：${GPU_LAYERS}, 上下文：${CTX_SIZE}`);
  if (mmprojPath) console.log(`[LLM] 多模态投影：${mmprojPath}`);

  const child = spawn(exePath, args, { stdio: 'inherit', env: { ...process.env } });

  child.on('exit', (code, signal) => {
    console.log(`[LLM] 进程退出: code=${code}, signal=${signal}`);
    process.exit(code ?? 1);
  });

  process.on('SIGINT', () => {
    console.log('[LLM] 收到 SIGINT，正在停止...');
    child.kill('SIGTERM');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });

  console.log('[LLM] 等待服务就绪...');
  const healthy = await waitForHealthy();
  if (healthy) {
    console.log(`[LLM] 服务已就绪 (http://localhost:${PORT}/health)`);
  } else {
    console.warn('[LLM] 健康检查超时，但将继续运行');
  }
}

main().catch((err) => {
  console.error('[LLM] 启动失败:', err);
  process.exit(1);
});
