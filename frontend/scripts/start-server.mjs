/**
 * start-server.mjs — 独立启动 Rust Server（不依赖 Electron）
 *
 * 优先使用预编译的 server.exe，避免 Rust 编译兼容性问题。
 * 如果找不到预编译二进制，才使用 cargo run 从源码编译。
 *
 * 用法：node scripts/start-server.mjs
 * 环境变量：
 *   SERVER_PORT     - 监听端口（默认 3000）
 *   RUST_LOG        - 日志级别（默认 info）
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.resolve(__dirname, '..');
const RUST_DIR = path.resolve(__dirname, '..', '..', 'claw-code', 'rust');

const serverPort = process.env.SERVER_PORT || '3000';

function findServerExe() {
  const searchPaths = [
    path.join(ROOT_DIR, 'server.exe'),
    path.join(FRONTEND_DIR, 'resources', 'server', 'server.exe'),
    path.join(FRONTEND_DIR, 'server.exe'),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function startWithBinary(exePath) {
  console.log(`[server] 使用预编译二进制：${exePath}`);
  console.log(`[server] 端口：${serverPort}`);

  const child = spawn(exePath, ['--port', serverPort], {
    stdio: 'inherit',
    env: {
      ...process.env,
      RUST_LOG: process.env.RUST_LOG || 'info,server=debug,runtime=debug',
      CORS_EXTRA_ORIGINS: 'http://localhost:5173',
    },
  });

  child.on('exit', (code, signal) => {
    console.log(`[server] 进程退出: code=${code}, signal=${signal}`);
    process.exit(code ?? 1);
  });

  process.on('SIGINT', () => {
    console.log('[server] 收到 SIGINT，正在停止...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'inherit' });
    } else {
      child.kill('SIGTERM');
    }
  });

  process.on('SIGTERM', () => {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'inherit' });
    } else {
      child.kill('SIGTERM');
    }
  });
}

function startWithCargo() {
  console.log(`[server] 未找到预编译二进制，从源码编译启动...`);
  console.log(`[server] 工作目录：${RUST_DIR}`);
  console.log(`[server] 端口：${serverPort}`);

  const child = spawn('cargo', ['run', '-p', 'server', '--release', '--', '--port', serverPort], {
    stdio: 'inherit',
    cwd: RUST_DIR,
    env: {
      ...process.env,
      RUST_LOG: process.env.RUST_LOG || 'info,server=debug,runtime=debug',
      CORS_EXTRA_ORIGINS: 'http://localhost:5173',
    },
  });

  child.on('exit', (code, signal) => {
    console.log(`[server] 进程退出: code=${code}, signal=${signal}`);
    process.exit(code ?? 1);
  });

  process.on('SIGINT', () => {
    console.log('[server] 收到 SIGINT，正在停止...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'inherit' });
    } else {
      child.kill('SIGTERM');
    }
  });

  process.on('SIGTERM', () => {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'inherit' });
    } else {
      child.kill('SIGTERM');
    }
  });
}

const exePath = findServerExe();
if (exePath) {
  startWithBinary(exePath);
} else {
  startWithCargo();
}
