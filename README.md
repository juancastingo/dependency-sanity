# @juancastingo/dependency-sanity

[![CI](https://github.com/juancastingo/dependency-sanity/actions/workflows/ci.yml/badge.svg)](https://github.com/juancastingo/dependency-sanity/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@juancastingo/dependency-sanity.svg)](https://www.npmjs.com/package/@juancastingo/dependency-sanity)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)

**Dependency Sanity** is a fast, read-only diagnostic tool that audits your Node.js / TypeScript project for duplicate dependency versions, phantom imports, and unused packages — **without ever touching or mutating your `package.json`**.

Every warning is paired with a clear explanation of *why* it poses a risk and actionable steps on *how to resolve it*.

---

## Why Dependency Sanity?

- 👯 **Duplicate Versions In Tree**: Multiple versions of the same package inflate bundle sizes and can cause critical runtime exceptions (e.g. duplicated `react` breaking Hooks & Context, or duplicated `graphql` breaking `instanceof` checks).
- 👻 **Phantom Dependencies**: Importing a package that is installed transitively via another dependency, but not declared in your `package.json`. These fail unexpectedly in clean CI builds or under strict package managers like `pnpm`.
- 📦 **Unused Direct Dependencies**: Packages lingering in `package.json` that are never imported anywhere in your source code, increasing vulnerability attack surface and install times.
- 🛑 **Zero Unintended Mutations**: Never rewrites `package.json` or modifies lockfiles behind your back.

---

## Quick Usage

Run directly with `npx` in any project root:

```bash
npx @juancastingo/dependency-sanity
```

Or install globally:

```bash
npm install -g @juancastingo/dependency-sanity
dependency-sanity
```

---

## Terminal Output Example

```text
=== Dependency Sanity Audit ===
Project: /home/user/my-project
Dependencies: 18 direct, 12 dev, 432 total in tree

[!] Phantom Dependencies (1) - CRITICAL:
  • chalk
    Problem: Package "chalk" is imported in code but NOT declared in package.json
    Why:     Code relies on transitive hoisting in node_modules. Builds will break under strict package managers (pnpm) or clean CI environments.
    Fix:     Add it explicitly to dependencies with 'npm install chalk'.

[!] Duplicate Versions in Dependency Tree (2):
  • react
    Versions: 18.2.0, 17.0.2
    Why:      Multiple instances of "react" can cause runtime exceptions, broken context, and split singletons.
    Fix:      Deduplicate using 'npm dedupe' or pin a unified version using the "overrides" field in package.json.

  • lodash
    Versions: 4.17.21, 3.10.1
    Why:      Multiple versions inflate bundle size and slow down installation.
    Fix:      Deduplicate using 'npm dedupe' or pin a unified version using the "overrides" field in package.json.

[i] Potentially Unused Dependencies (1):
  • moment (not found in source imports)

--- Audit Summary ---
Errors:   2
Warnings: 1
Info:     1
Status:   ATTENTION NEEDED
Note: dependency-sanity never modifies your files or package.json.
```

---

## CLI Options

| Flag | Description |
| :--- | :--- |
| `-d, --dir <path>` | Target project directory (defaults to current working directory) |
| `--json` | Output machine-readable structured JSON report (ideal for CI pipelines) |
| `--strict` | Exit with code `1` if any errors or warnings are discovered |
| `--ignore <pkgs>` | Comma-separated list of package names to skip |
| `-h, --help` | Show CLI help |
| `-v, --version` | Display version |

### CI / CD Integration

Enforce dependency hygiene on pull requests:

```yaml
- name: Dependency Sanity Check
  run: npx @juancastingo/dependency-sanity --strict
```

---

## Programmatic API

You can also run audits programmatically in Node.js / TypeScript:

```typescript
import { analyzeDependencies } from '@juancastingo/dependency-sanity';

const report = analyzeDependencies({
  projectDir: './my-app',
  checkDuplicates: true,
  checkPhantoms: true,
  checkUnused: true,
});

if (!report.summary.isHealthy) {
  console.log(`Found ${report.summary.errors} errors and ${report.summary.warnings} warnings`);
}
```

---

## License

MIT License © 2026 Juan Castin
