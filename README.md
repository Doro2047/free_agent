# FREE Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848C?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-Axum-000000?logo=rust)](https://www.rust-lang.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows)](https://www.microsoft.com/windows)

AI 编程助手桌面应用 — 基于 Electron + React + Rust 的高性能架构，让 AI 真正融入你的开发工作流。

---

## 功能特性

### 核心体验

- **三栏布局** — 任务管理 | 聊天对话 | 代码编辑/文件浏览，信息一目了然
- **双模式切换** — 聊天模式专注对话，代码模式专注开发，按需切换
- **流式对话输出** — 实时接收 AI 响应，无需等待完整生成
- **暗色主题** — 护眼沉浸的开发体验

### AI 能力

- **多 LLM 后端支持** — OpenAI / Anthropic / Ollama / llama.cpp / DashScope，灵活接入
- **MCP 协议支持** — 通过 Model Context Protocol 扩展 AI 工具链
- **插件系统** — 自定义 Hook 与工具，按需扩展

### 开发工具

- **代码编辑** — 内置 Monaco Editor，支持语法高亮、智能补全
- **文件浏览与操作** — 项目文件树浏览，直接读写文件
- **命令执行** — 白名单安全机制，受控执行终端命令
- **Git 集成** — 版本控制操作，无需离开应用

### 工程化

- **自动更新** — 基于 GitHub Releases，始终使用最新版本
- **系统托盘** — 后台常驻，随时唤起
- **本地优先** — 支持 llama.cpp 本地推理，数据不出本机

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS |
| 状态管理 | Zustand |
| 代码编辑器 | Monaco Editor |
| 后端服务 | Rust (Axum + Tokio) |
| 应用打包 | electron-builder |

---

## 项目结构

```
free_agent/
├── frontend/              # Electron + React 前端
│   ├── electron/          # Electron 主进程
│   │   ├── main.ts        # 主进程入口
│   │   ├── preload.ts     # 预加载脚本
│   │   ├── server-manager.ts  # Rust Server 生命周期管理
│   │   ├── llama-manager.ts   # llama.cpp 进程管理
│   │   └── window-manager.ts  # 窗口管理
│   ├── src/               # React 源代码
│   │   ├── api/           # API 客户端
│   │   ├── components/    # UI 组件
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── types/         # TypeScript 类型定义
│   │   └── utils/         # 工具函数
│   ├── resources/server/  # Rust Server 二进制文件
│   └── electron-builder.json
├── claw-code/rust/        # Rust Server 源代码
│   └── crates/
│       ├── server/        # Axum HTTP Server
│       ├── api/           # LLM API 客户端
│       ├── runtime/       # 核心运行时
│       ├── tools/         # 工具集
│       ├── plugins/       # 插件系统
│       ├── commands/      # 命令执行
│       └── telemetry/     # 遥测
├── assets/                # 图标资源
└── scripts/               # 构建脚本
```

---

## 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18 |
| Rust & Cargo | 最新稳定版 |
| 操作系统 | Windows 10/11 |

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/free_agent.git
cd free_agent
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 编译 Rust Server

```bash
cd claw-code/rust
cargo build --release -p server
```

### 4. 复制 Server 二进制文件

```powershell
Copy-Item claw-code/rust/target/release/server.exe frontend/resources/server/
```

### 5. 启动开发模式

```powershell
.\scripts\dev.ps1
```

或手动启动：

```bash
cd frontend
npm run electron:dev
```

---

## 模型接入指南

FREE Agent 支持本地模型和云端 API 两种接入方式，可根据需求灵活选择。

### 方式一：本地模型（llama.cpp）

适合注重隐私、希望数据不出本机的用户。

**1. 安装 llama.cpp**

从 [llama.cpp Releases](https://github.com/ggerganov/llama.cpp/releases) 下载预编译版本，或从源码编译。

**2. 启动 llama.cpp 服务器**

```bash
./llama-server -m your-model.gguf --port 8080
```

**3. 在应用中配置**

- 打开应用设置，将 API 地址设为 `http://localhost:8080/v1`
- 或设置环境变量：

```bash
LLAMA_CPP_BASE_URL=http://localhost:8080/v1
```

### 方式二：云端 API

适合追求模型能力、无需本地算力的用户。

**1. 获取 API Key**

支持以下服务商：

| 服务商 | Provider | 说明 |
|--------|----------|------|
| DeepSeek | OpenAI 兼容 | 使用 OpenAI 兼容接口 |
| 通义千问 | DashScope | 阿里云大模型平台 |
| SiliconFlow | OpenAI 兼容 | 国产推理平台 |
| OpenAI | OpenAI | GPT 系列模型 |
| Anthropic | Anthropic | Claude 系列模型 |

**2. 在应用中配置**

- 打开设置面板
- 选择对应的 Provider
- 填入 API Key
- 选择模型

**3. 自定义 OpenAI 兼容 API**

如果使用其他兼容 OpenAI 接口的服务，选择"自定义 OpenAI 兼容 API"，填入 Base URL 和 API Key 即可。

---

## 使用说明

### 开发模式

```powershell
.\scripts\dev.ps1
```

启动后：
- 前端开发服务器：`http://localhost:5173`
- Rust Server：`http://localhost:3000`
- Electron 窗口自动加载开发服务器

### 构建发布版本

```powershell
.\scripts\build.ps1
```

构建产物输出到 `frontend/release/` 目录。

### 环境变量配置

复制 `.env.example` 为 `.env.development` 并按需修改：

```bash
# 后端 API 服务地址
VITE_SERVER_URL=http://localhost:3000/api

# llama.cpp 服务器地址
LLAMA_CPP_BASE_URL=http://localhost:8080/v1

# llama.cpp API 密钥（本地推理通常留空）
LLAMA_CPP_API_KEY=

# 默认模型名称
LLAMA_CPP_MODEL=default

# 额外的 CORS 允许源
CORS_EXTRA_ORIGINS=http://localhost:5173
```

---

## 开发指南

### 前端开发

```bash
cd frontend
npm run dev:renderer    # 仅启动 Vite 开发服务器
npm run test            # 运行测试
npm run test:watch      # 监听模式运行测试
npm run test:coverage   # 生成测试覆盖率报告
npm run lint            # 代码检查
```

### Rust 后端开发

```bash
cd claw-code/rust
cargo build --release -p server   # 编译 Server
cargo test -p server              # 运行 Server 测试
cargo test                        # 运行全部测试
```

### 完整开发流程

```bash
# 终端 1：启动 Rust Server
cd frontend
npm run dev:server

# 终端 2：启动前端开发服务器 + Electron
cd frontend
npm run electron:dev
```

或使用一键脚本：

```powershell
.\scripts\dev.ps1
```

---

## 贡献指南

欢迎贡献代码！请遵循以下流程：

1. **Fork** 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交变更：`git commit -m 'feat: add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 发起 **Pull Request**

### 提交规范

建议使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档变更
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具变更

---

## 许可证

[MIT](LICENSE) © FREE Agent Contributors
