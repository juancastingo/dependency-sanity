import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  extractPackageName,
  parsePackageLock,
  analyzeDependencies,
  formatTerminalReport,
} from '../src/index.js';

test('extractPackageName extracts correct package names and ignores builtins/relatives', () => {
  assert.equal(extractPackageName('lodash'), 'lodash');
  assert.equal(extractPackageName('lodash/get'), 'lodash');
  assert.equal(extractPackageName('@octokit/rest'), '@octokit/rest');
  assert.equal(extractPackageName('@octokit/rest/plugins'), '@octokit/rest');
  assert.equal(extractPackageName('./utils.js'), null);
  assert.equal(extractPackageName('../index.ts'), null);
  assert.equal(extractPackageName('node:fs'), null);
  assert.equal(extractPackageName('path'), null);
  assert.equal(extractPackageName('crypto'), null);
});

test('parsePackageLock finds duplicate package versions in v2/v3 lockfile', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-sanity-test-'));

  const lockfileContent = {
    name: 'test-app',
    version: '1.0.0',
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'test-app',
        dependencies: {
          'lib-a': '^1.0.0',
          'lib-b': '^2.0.0',
        },
      },
      'node_modules/lib-a': {
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.20',
        },
      },
      'node_modules/lib-b': {
        version: '2.0.0',
        dependencies: {
          lodash: '^3.10.1',
        },
      },
      'node_modules/lib-a/node_modules/lodash': {
        version: '4.17.21',
      },
      'node_modules/lib-b/node_modules/lodash': {
        version: '3.10.1',
      },
      'node_modules/react': {
        version: '18.2.0',
      },
      'node_modules/lib-a/node_modules/react': {
        version: '17.0.2',
      },
    },
  };

  fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify(lockfileContent));

  const result = parsePackageLock(tmpDir);
  assert.equal(result.duplicates.length, 2);

  const lodashDup = result.duplicates.find((d) => d.packageName === 'lodash');
  assert.ok(lodashDup);
  assert.equal(lodashDup.versions.length, 2);
  assert.ok(lodashDup.versions.includes('4.17.21'));
  assert.ok(lodashDup.versions.includes('3.10.1'));

  const reactDup = result.duplicates.find((d) => d.packageName === 'react');
  assert.ok(reactDup);
  assert.equal(reactDup.versions.length, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('analyzeDependencies flags unused dependencies and phantom imports', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-sanity-analyzer-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir);

  const packageJson = {
    name: 'sample-project',
    version: '1.0.0',
    dependencies: {
      'used-pkg': '^1.0.0',
      'unused-pkg': '^2.0.0',
    },
    devDependencies: {
      tsx: '^4.0.0',
    },
  };
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(packageJson));

  // Source imports 'used-pkg' and undeclared 'phantom-pkg'
  fs.writeFileSync(
    path.join(srcDir, 'index.ts'),
    `
    import { something } from 'used-pkg';
    import { ghost } from 'phantom-pkg';
    import fs from 'node:fs';
    `
  );

  const report = analyzeDependencies({ projectDir: tmpDir });

  // Check unused
  assert.ok(report.unused.includes('unused-pkg'));
  assert.ok(!report.unused.includes('used-pkg'));

  // Check phantoms
  assert.ok(report.phantoms.includes('phantom-pkg'));
  assert.ok(!report.phantoms.includes('used-pkg'));

  // Formatted report includes warning explanations
  const text = formatTerminalReport(report);
  assert.match(text, /Phantom Dependencies/);
  assert.match(text, /unused-pkg/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
