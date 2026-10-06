# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-06

### Added
- Initial public release of `@juancastingo/dependency-sanity`.
- Lockfile inspection detecting duplicate package versions across dependency tree.
- High-risk singleton detection (React, GraphQL, Vue, TypeScript) that breaks runtime context when duplicated.
- Source code scanner discovering imported packages across JS/TS source files.
- Phantom dependency detection (packages imported but absent from package.json).
- Unused direct dependency detection.
- Detailed explanations and recommended remediation steps for each issue.
- CLI executable (`dependency-sanity`) with `--json`, `--strict`, and `--ignore` flags.
- Programmatic TypeScript/JavaScript API (`analyzeDependencies`).
