Security Policy
================

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within CodeCraft, please create an issue
with the label "security" or contact the maintainers directly.

Please include as much information as possible:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

## Security Best Practices

### API Keys

- Never commit API keys to the repository
- Use environment variables or secure storage (Electron safeStorage)
- Rotate keys regularly

### Command Execution

- All commands are executed via a whitelist mechanism
- Review the whitelist before executing unfamiliar commands
- Use sandbox mode for untrusted operations

### File Operations

- File read/write operations are scoped to workspace directory
- Path traversal protections are implemented
- Be cautious with file glob patterns

### Network Requests

- API requests are routed through a local proxy
- CORS is properly configured
- Sensitive data should never be logged

## Dependencies

Keep dependencies up to date:

```bash
# Frontend
npm audit
npm update

# Rust
cargo audit
cargo outdated
```
