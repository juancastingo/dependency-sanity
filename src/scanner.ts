import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx', '.vue', '.svelte']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', '.turbo', 'coverage', '.cache', 'tests', 'test', '__tests__']);

// Node built-in modules
const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'stream/promises', 'stream/web',
  'string_decoder', 'test', 'timers', 'timers/promises', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
]);

const IMPORT_REQUIRE_REGEX = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;

export function extractPackageName(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('#')) {
    return null; // Relative path or local subpath import
  }

  // Handle node: protocol
  if (specifier.startsWith('node:')) {
    return null;
  }

  // Handle builtins
  if (NODE_BUILTINS.has(specifier)) {
    return null;
  }

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return specifier;
  }

  const parts = specifier.split('/');
  return parts[0];
}

export function scanCodebaseImports(projectDir: string, extensions = DEFAULT_EXTENSIONS): Set<string> {
  const importedPackages = new Set<string>();

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.has(ext)) {
          const filePath = path.join(currentDir, entry.name);
          scanFile(filePath, importedPackages);
        }
      }
    }
  }

  walk(projectDir);
  return importedPackages;
}

export function scanFile(filePath: string, accumulator: Set<string>): void {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  let match: RegExpExecArray | null;
  // Reset regex index
  IMPORT_REQUIRE_REGEX.lastIndex = 0;
  while ((match = IMPORT_REQUIRE_REGEX.exec(content)) !== null) {
    const rawSpecifier = match[1];
    const pkg = extractPackageName(rawSpecifier);
    if (pkg) {
      accumulator.add(pkg);
    }
  }
}
