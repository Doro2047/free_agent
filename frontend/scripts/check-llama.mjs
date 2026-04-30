/**
 * check-llama.mjs — 检查 llama-server 是否存在
 * 存在输出 "ready"，不存在输出 "missing"
 * 始终退出码 0（让 shell 继续执行，由后续脚本判断）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const exeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
const searchPaths = [
  process.env.LLAMA_EXE_PATH,
  path.join(FRONTEND_DIR, 'llama-b8352', exeName),
  path.join(ROOT_DIR, 'llama-b8352', exeName),
].filter(Boolean);

const modelFileName = 'Qwen3.5-9B-Unredacted-MAX.Q8_0.gguf';
const modelPaths = [
  process.env.LLAMA_MODEL_PATH,
  path.join(ROOT_DIR, 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', modelFileName),
].filter(Boolean);

const exeFound = searchPaths.some((p) => fs.existsSync(p));
const modelFound = modelPaths.some((p) => fs.existsSync(p));

if (exeFound && modelFound) {
  console.log('ready');
} else {
  if (!exeFound) console.error(`[LLM] llama-server 可执行文件未找到，搜索路径:`);
  if (!exeFound) searchPaths.forEach((p) => console.error(`      ${p}`));
  if (!modelFound) console.error(`[LLM] 模型文件 ${modelFileName} 未找到，搜索路径:`);
  if (!modelFound) modelPaths.forEach((p) => console.error(`      ${p}`));
  console.log('missing');
}
