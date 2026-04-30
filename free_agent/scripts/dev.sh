#!/bin/bash

set -e

echo "============================================"
echo "  FREE Agent - Development Setup"
echo "============================================"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "[1/6] Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be >= 18, current: $(node -v)"
    exit 1
fi
echo "✓ Node.js $(node -v)"

if ! command_exists rustc; then
    echo "❌ Rust is not installed. Please install Rust from https://rustup.rs"
    exit 1
fi
echo "✓ Rust $(rustc --version)"

if ! command_exists cargo; then
    echo "❌ Cargo is not installed (comes with Rust)"
    exit 1
fi
echo "✓ Cargo $(cargo --version)"

echo ""
echo "[2/6] Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
npm install

echo ""
echo "[3/6] Building Rust server..."
cd "$PROJECT_ROOT/claw-code/rust"
cargo build --release -p server

echo ""
echo "[4/6] Copying Rust binary to resources..."
mkdir -p "$PROJECT_ROOT/frontend/resources/server"
if [ "$(uname)" = "Darwin" ] || [ "$(uname)" = "Linux" ]; then
    cp "$PROJECT_ROOT/claw-code/rust/target/release/server" "$PROJECT_ROOT/frontend/resources/server/"
else
    cp "$PROJECT_ROOT/claw-code/rust/target/release/server.exe" "$PROJECT_ROOT/frontend/resources/server/"
fi

echo ""
echo "[5/6] Verifying build..."
if [ ! -f "$PROJECT_ROOT/frontend/resources/server/server" ] && [ ! -f "$PROJECT_ROOT/frontend/resources/server/server.exe" ]; then
    echo "❌ Rust binary not found in resources directory"
    exit 1
fi
echo "✓ Build verification passed"

echo ""
echo "[6/6] Starting development servers..."
cd "$PROJECT_ROOT/frontend"

echo ""
echo "============================================"
echo "  Starting FREE Agent in development mode"
echo "============================================"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start all services (API, LLM, UI)"
echo "  npm run dev:renderer - Start only the UI dev server"
echo "  npm run dev:server   - Start only the Rust API server"
echo ""
echo "Opening application..."
echo ""

npm run electron:dev
