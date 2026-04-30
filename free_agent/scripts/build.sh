#!/bin/bash

set -e

echo "============================================"
echo "  FREE Agent - Production Build"
echo "============================================"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "[1/5] Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command_exists rustc; then
    echo "❌ Rust is not installed"
    exit 1
fi

echo "✓ Prerequisites check passed"

echo ""
echo "[2/5] Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
npm ci

echo ""
echo "[3/5] Building Rust server..."
cd "$PROJECT_ROOT/claw-code/rust"
cargo build --release -p server

echo ""
echo "[4/5] Copying Rust binary..."
mkdir -p "$PROJECT_ROOT/frontend/resources/server"
if [ "$(uname)" = "Darwin" ] || [ "$(uname)" = "Linux" ]; then
    cp "$PROJECT_ROOT/claw-code/rust/target/release/server" "$PROJECT_ROOT/frontend/resources/server/"
else
    cp "$PROJECT_ROOT/claw-code/rust/target/release/server.exe" "$PROJECT_ROOT/frontend/resources/server/"
fi

echo ""
echo "[5/5] Building Electron application..."
cd "$PROJECT_ROOT/frontend"
npm run electron:build

echo ""
echo "============================================"
echo "  Build complete!"
echo "============================================"
echo ""
echo "Output directory: frontend/release/"
ls -la "$PROJECT_ROOT/frontend/release/" 2>/dev/null || echo "No release files found"
echo ""
