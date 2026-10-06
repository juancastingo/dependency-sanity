import { SanityReport, SanityIssue } from './types.js';

export function formatTerminalReport(report: SanityReport): string {
  const lines: string[] = [];

  lines.push('\n=== Dependency Sanity Audit ===');
  lines.push(`Project: ${report.projectPath}`);
  lines.push(`Dependencies: ${report.packageCount.directDependencies} direct, ${report.packageCount.devDependencies} dev, ${report.packageCount.totalTreePackages} total in tree\n`);

  if (report.issues.length === 0) {
    lines.push('✔ No dependency sanity issues detected! Dependency tree is clean and sound.\n');
    return lines.join('\n');
  }

  // Group by issue type
  const duplicates = report.issues.filter((i) => i.type === 'duplicate_version');
  const phantoms = report.issues.filter((i) => i.type === 'phantom_dependency');
  const unused = report.issues.filter((i) => i.type === 'unused_dependency');

  if (phantoms.length > 0) {
    lines.push(`[!] Phantom Dependencies (${phantoms.length}) - CRITICAL:`);
    for (const issue of phantoms) {
      lines.push(`  • ${issue.package}`);
      lines.push(`    Problem: ${issue.message}`);
      lines.push(`    Why:     ${issue.explanation}`);
      lines.push(`    Fix:     ${issue.recommendation}\n`);
    }
  }

  if (duplicates.length > 0) {
    lines.push(`[!] Duplicate Versions in Dependency Tree (${duplicates.length}):`);
    for (const issue of duplicates) {
      lines.push(`  • ${issue.package}`);
      lines.push(`    Versions: ${(issue.details?.versions || []).join(', ')}`);
      lines.push(`    Why:      ${issue.explanation}`);
      lines.push(`    Fix:      ${issue.recommendation}\n`);
    }
  }

  if (unused.length > 0) {
    lines.push(`[i] Potentially Unused Dependencies (${unused.length}):`);
    for (const issue of unused) {
      lines.push(`  • ${issue.package} (not found in source imports)`);
    }
    lines.push('');
  }

  lines.push('--- Audit Summary ---');
  lines.push(`Errors:   ${report.summary.errors}`);
  lines.push(`Warnings: ${report.summary.warnings}`);
  lines.push(`Info:     ${report.summary.info}`);
  lines.push(report.summary.isHealthy ? 'Status:   HEALTHY' : 'Status:   ATTENTION NEEDED');
  lines.push('Note: dependency-sanity never modifies your files or package.json.\n');

  return lines.join('\n');
}
