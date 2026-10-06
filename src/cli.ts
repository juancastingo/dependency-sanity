#!/usr/bin/env node
import { analyzeDependencies } from './analyzer.js';
import { formatTerminalReport } from './reporter.js';

function parseCliArgs(args: string[]) {
  const options = {
    projectDir: process.cwd(),
    json: false,
    strict: false,
    ignore: [] as string[],
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--dir' || arg === '-d') {
      options.projectDir = args[++i];
    } else if (arg === '--ignore' && i + 1 < args.length) {
      options.ignore.push(...args[++i].split(','));
    } else if (!arg.startsWith('-')) {
      options.projectDir = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
dependency-sanity - Fast, read-only dependency tree and import auditor

Usage:
  dependency-sanity [path/to/project] [options]

Options:
  -d, --dir <path>       Target project directory (default: current directory)
  --json                 Output complete audit report as formatted JSON
  --strict               Exit with non-zero code if any errors or warnings are found
  --ignore <packages>    Comma-separated list of packages to ignore
  -h, --help             Show help documentation
  -v, --version          Show version number

Guarantees:
  - Read-only: Never modifies package.json, lockfiles, or node_modules
  - Explains the exact reason and recommended fix for every warning
`);
}

async function run() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    console.log('dependency-sanity v0.1.0');
    process.exit(0);
  }

  try {
    const report = analyzeDependencies({
      projectDir: options.projectDir,
      ignorePackages: options.ignore,
    });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatTerminalReport(report));
    }

    if (options.strict && !report.summary.isHealthy) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(2);
  }
}

run();
