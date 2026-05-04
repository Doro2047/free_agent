# Contributing to CodeCraft

Thank you for your interest in contributing to CodeCraft! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js >= 18
- Rust >= 1.70
- npm or yarn

### Development Setup

1. Fork and clone the repository
2. Run the development setup script:

```bash
# For macOS/Linux
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
cp target/release/server ../../frontend/resources/server/
```

## Development Workflow

### Branch Naming

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions/changes

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new chat interface
fix: resolve streaming response bug
docs: update README
refactor: simplify API client
test: add chat store tests
chore: update dependencies
```

### Pull Request Process

1. Create a new branch from `master`
2. Make your changes
3. Add tests if applicable
4. Ensure all tests pass
5. Update documentation if needed
6. Submit a pull request with a clear description

## Code Style

### Frontend (TypeScript/React)

- Use TypeScript for all new files
- Follow ESLint and Prettier configurations
- Use functional components with hooks
- Write meaningful variable and function names

### Backend (Rust)

- Follow `rustfmt` formatting
- Address all `clippy` warnings
- Write documentation for public APIs
- Include unit tests for new functionality

## Testing

### Frontend Tests

```bash
cd frontend
npm run test          # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Rust Tests

```bash
cd claw-code/rust
cargo test            # Run all tests
cargo test --doc      # Documentation tests only
```

## Reporting Issues

When reporting issues, please include:

- Operating system and version
- FREE Agent version
- Steps to reproduce the issue
- Expected vs actual behavior
- Relevant logs or screenshots

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
