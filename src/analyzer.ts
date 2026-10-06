import fs from 'node:fs';
import path from 'node:path';
import {
  SanityReport,
  SanityIssue,
  AnalyzerOptions,
  DuplicatePackageSummary,
} from './types.js';
import { parsePackageLock } from './lockfile.js';
import { scanCodebaseImports } from './scanner.js';

// Packages where having duplicate versions breaks React context, Symbol comparisons, or singletons
const HIGH_RISK_DUPLICATE_PACKAGES = new Set([
  'react',
  'react-dom',
  'graphql',
  'vue',
  'svelte',
  'mobx',
  'rxjs',
  'typescript',
  '@angular/core',
  'styled-components',
  '@emotion/react',
]);

// Packages frequently used without direct imports (CLI bins, types, build tools, plugins)
const COMMONLY_IMPLICIT_DEPS = new Set([
  'tslib',
  '@types/node',
  'nodemon',
  'ts-node',
  'tsx',
  'typescript',
  'prettier',
  'eslint',
  'jest',
  'vitest',
]);

export function analyzeDependencies(options: AnalyzerOptions = {}): SanityReport {
  const projectDir = path.resolve(options.projectDir || process.cwd());
  const pkgJsonPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`package.json not found in directory: ${projectDir}`);
  }

  let pkg: any;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse package.json: ${(err as Error).message}`);
  }

  const directDeps = new Set(Object.keys(pkg.dependencies || {}));
  const devDeps = new Set(Object.keys(pkg.devDependencies || {}));
  const peerDeps = new Set(Object.keys(pkg.peerDependencies || {}));
  const allDeclared = new Set([...directDeps, ...devDeps, ...peerDeps]);

  const ignored = new Set(options.ignorePackages || []);

  const issues: SanityIssue[] = [];

  // 1. Lockfile Duplicate Analysis
  let totalTreePackages = 0;
  let duplicates: DuplicatePackageSummary[] = [];

  if (options.checkDuplicates !== false) {
    const lockResult = parsePackageLock(projectDir);
    totalTreePackages = lockResult.totalPackages;
    duplicates = lockResult.duplicates.filter((d) => !ignored.has(d.packageName));

    for (const dup of duplicates) {
      const isHighRisk = HIGH_RISK_DUPLICATE_PACKAGES.has(dup.packageName);
      issues.push({
        type: 'duplicate_version',
        severity: isHighRisk ? 'error' : 'warning',
        package: dup.packageName,
        message: `Package "${dup.packageName}" is installed in ${dup.versions.length} conflicting versions: ${dup.versions.join(', ')}`,
        explanation: isHighRisk
          ? `Multiple instances of "${dup.packageName}" can cause runtime exceptions, broken context, and split singletons.`
          : `Multiple versions inflate bundle size and slow down installation.`,
        recommendation: `Deduplicate using 'npm dedupe' or pin a unified version using the "overrides" field in package.json.`,
        details: {
          versions: dup.versions,
          instances: dup.instances,
        },
      });
    }
  }

  // 2. Codebase Import Scanner
  const importedPackages = scanCodebaseImports(projectDir);

  // 3. Unused Dependencies Analysis
  const unusedList: string[] = [];
  if (options.checkUnused !== false) {
    for (const dep of directDeps) {
      if (ignored.has(dep) || COMMONLY_IMPLICIT_DEPS.has(dep) || dep.startsWith('@types/')) {
        continue;
      }
      if (!importedPackages.has(dep)) {
        unusedList.push(dep);
        issues.push({
          type: 'unused_dependency',
          severity: 'info',
          package: dep,
          message: `Package "${dep}" is declared in dependencies but never imported in source files`,
          explanation: `Unused dependencies add security exposure, increase install times, and clutter your dependency graph.`,
          recommendation: `Verify if it is loaded dynamically or remove it from package.json with 'npm uninstall ${dep}'.`,
        });
      }
    }
  }

  // 4. Phantom Dependencies Analysis
  const phantomList: string[] = [];
  if (options.checkPhantoms !== false) {
    for (const imp of importedPackages) {
      if (ignored.has(imp) || allDeclared.has(imp)) {
        continue;
      }
      phantomList.push(imp);
      issues.push({
        type: 'phantom_dependency',
        severity: 'error',
        package: imp,
        message: `Package "${imp}" is imported in code but NOT declared in package.json`,
        explanation: `Code relies on transitive hoisting in node_modules. Builds will break under strict package managers (pnpm) or clean CI environments.`,
        recommendation: `Add it explicitly to dependencies with 'npm install ${imp}'.`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const info = issues.filter((i) => i.severity === 'info').length;

  return {
    projectPath: projectDir,
    timestamp: new Date().toISOString(),
    packageCount: {
      directDependencies: directDeps.size,
      devDependencies: devDeps.size,
      totalTreePackages,
    },
    duplicates,
    unused: unusedList,
    phantoms: phantomList,
    issues,
    summary: {
      errors,
      warnings,
      info,
      isHealthy: errors === 0 && warnings === 0,
    },
  };
}
