# FREE Agent

AI Programming Assistant Desktop Application - Built with Electron + React + Rust for high-performance architecture.

## Features

### Core Experience

- **Three-column Layout** - Task management | Chat | Code editing/file browsing
- **Dual Mode Switching** - Chat mode for conversations, code mode for development
- **Streaming Response** - Real-time AI response output
- **Dark Theme** - Eye-friendly development experience

### AI Capabilities

- **Multi LLM Backend Support** - OpenAI / Anthropic / Ollama / llama.cpp / DashScope
- **MCP Protocol Support** - Extend AI toolchain via Model Context Protocol
- **Plugin System** - Custom hooks and tools for extensibility

### Development Tools

- **Code Editor** - Built-in Monaco Editor with syntax highlighting and IntelliSense
- **File Browser** - Project file tree navigation, read/write files directly
- **Command Execution** - Whitelist-based security mechanism
- **Git Integration** - Version control operations without leaving the app

### Engineering

- **Auto Update** - Based on GitHub Releases
- **System Tray** - Background running, quick access
- **Local First** - llama.cpp local inference support

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 35 |
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Code Editor | Monaco Editor |
| Backend | Rust (Axum + Tokio) |
| Packaging | electron-builder |

## Quick Start

### Prerequisites

| Dependency | Version |
|------------|---------|
| Node.js | >= 18 |
| Rust & Cargo | Latest stable |

### Clone and Setup

```bash
git clone https://github.com/Doro2047/free_agent.git
cd free_agent

# For macOS/Linux
chmod +x scripts/dev.sh scripts/build.sh
./scripts/dev.sh

# For Windows
.\scripts\dev.ps1
```

Or manually:

```bash
# Install frontend dependencies
cd frontend
npm install

# Build Rust server
cd ../claw-code/rust
cargo build --release -p server

# Copy binary
mkdir -p ../frontend/resources/server
cp target/release/server ../frontend/resources/server/

# Start development
cd ../frontend
npm run electron:dev
```

## Model Configuration

### Local Model (llama.cpp)

1. Download from [llama.cpp Releases](https://github.com/ggerganov/llama.cpp/releases)
2. Start server: `./llama-server -m your-model.gguf --port 8080`
3. Set API address to `http://localhost:8080/v1`

### Cloud API

| Provider | Type |
|----------|------|
| DeepSeek | OpenAI compatible |
| Qwen (Tongyi) | DashScope |
| SiliconFlow | OpenAI compatible |
| OpenAI | OpenAI |
| Anthropic | Anthropic |

## Development

```bash
# Frontend
npm run dev:renderer  # Vite dev server only
npm run test          # Run tests
npm run lint          # Lint code

# Rust backend
cargo test -p server  # Run server tests

# Full stack
npm run dev           # Start all services
```

## Project Structure

```
free_agent/
├── frontend/         # Electron + React frontend
│   ├── electron/     # Electron main process
│   ├── src/         # React source
│   └── resources/   # Static resources
├── claw-code/rust/  # Rust backend
│   └── crates/      # Rust workspace
├── scripts/         # Build scripts
└── docs/            # Documentation
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - See [LICENSE](LICENSE)
