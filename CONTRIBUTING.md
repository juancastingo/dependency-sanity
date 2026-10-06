# Contributing to Dependency Sanity

Thank you for helping improve `dependency-sanity`!

## Philosophy & Guarantees

1. **Read-Only**: `dependency-sanity` must **never** mutate `package.json`, lockfiles, or files on disk. Its role is an auditor and educator.
2. **Actionable Explanations**: Every warning or error MUST include a clear explanation of *why* it matters and actionable steps on *how* to resolve it.
3. **Zero Runtime Bloat**: Minimize or avoid external runtime dependencies so running via `npx` is fast.

## Development Setup

```bash
git clone https://github.com/juancastingo/dependency-sanity.git
cd dependency-sanity
npm install
npm test
npm run build
```
