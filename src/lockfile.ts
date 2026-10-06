import fs from 'node:fs';
import path from 'node:path';
import { DuplicatePackageSummary, DuplicateInstance } from './types.js';

export function parsePackageLock(projectDir: string): {
  totalPackages: number;
  duplicates: DuplicatePackageSummary[];
} {
  const lockPath = path.join(projectDir, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    return { totalPackages: 0, duplicates: [] };
  }

  let content: any;
  try {
    content = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return { totalPackages: 0, duplicates: [] };
  }

  // Map: packageName -> version -> Array<location>
  const packageVersionMap = new Map<string, Map<string, string[]>>();
  let totalCount = 0;

  // npm lockfile v2/v3 has "packages"
  if (content.packages && typeof content.packages === 'object') {
    for (const [pkgPath, info] of Object.entries<any>(content.packages)) {
      if (!pkgPath || pkgPath === '') continue; // root project itself
      totalCount++;

      // Extract package name from node_modules path
      const parts = pkgPath.split('node_modules/');
      const rawPkgName = parts[parts.length - 1];
      const version = info.version;

      if (!rawPkgName || !version) continue;

      if (!packageVersionMap.has(rawPkgName)) {
        packageVersionMap.set(rawPkgName, new Map());
      }
      const vMap = packageVersionMap.get(rawPkgName)!;
      if (!vMap.has(version)) {
        vMap.set(version, []);
      }
      vMap.get(version)!.push(pkgPath);
    }
  } else if (content.dependencies && typeof content.dependencies === 'object') {
    // npm lockfile v1 recursive traverse
    function traverse(deps: Record<string, any>, currentPath: string) {
      for (const [pkgName, info] of Object.entries(deps)) {
        totalCount++;
        const version = info.version;
        const fullLocation = currentPath ? `${currentPath} -> ${pkgName}` : pkgName;

        if (version) {
          if (!packageVersionMap.has(pkgName)) {
            packageVersionMap.set(pkgName, new Map());
          }
          const vMap = packageVersionMap.get(pkgName)!;
          if (!vMap.has(version)) {
            vMap.set(version, []);
          }
          vMap.get(version)!.push(fullLocation);
        }

        if (info.dependencies) {
          traverse(info.dependencies, fullLocation);
        }
      }
    }
    traverse(content.dependencies, '');
  }

  const duplicates: DuplicatePackageSummary[] = [];

  for (const [pkgName, vMap] of packageVersionMap.entries()) {
    if (vMap.size > 1) {
      const versions = Array.from(vMap.keys());
      const instances: DuplicateInstance[] = [];
      for (const [ver, locs] of vMap.entries()) {
        instances.push({
          version: ver,
          locations: locs,
        });
      }
      duplicates.push({
        packageName: pkgName,
        versions,
        instances,
      });
    }
  }

  // Sort duplicates by number of distinct versions descending
  duplicates.sort((a, b) => b.versions.length - a.versions.length);

  return {
    totalPackages: totalCount,
    duplicates,
  };
}
