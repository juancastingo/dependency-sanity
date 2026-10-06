export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueType =
  | 'duplicate_version'
  | 'unused_dependency'
  | 'phantom_dependency'
  | 'conflicting_range';

export interface SanityIssue {
  type: IssueType;
  severity: IssueSeverity;
  package: string;
  message: string;
  explanation: string;
  recommendation: string;
  details?: Record<string, any>;
}

export interface DuplicateInstance {
  version: string;
  locations: string[];
}

export interface DuplicatePackageSummary {
  packageName: string;
  versions: string[];
  instances: DuplicateInstance[];
}

export interface SanityReport {
  projectPath: string;
  timestamp: string;
  packageCount: {
    directDependencies: number;
    devDependencies: number;
    totalTreePackages: number;
  };
  duplicates: DuplicatePackageSummary[];
  unused: string[];
  phantoms: string[];
  issues: SanityIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    isHealthy: boolean;
  };
}

export interface AnalyzerOptions {
  projectDir?: string;
  checkDuplicates?: boolean;
  checkUnused?: boolean;
  checkPhantoms?: boolean;
  ignorePackages?: string[];
  sourceExtensions?: string[];
}
