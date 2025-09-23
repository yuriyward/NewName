/**
 * Phase 1 renaming pipeline coordination and orchestration
 */
import {
  runPhase1Heuristics,
  runPhase1HeuristicsDebug,
} from '@/entrypoints/shared/analysis/heuristics-orchestrator';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import {
  applyFilenamePolicy,
  applyFilenamePolicyDebug,
} from '@/entrypoints/shared/naming/policy-engine';
import type {
  FileType,
  SettingsV1,
} from '@/entrypoints/shared/settings/settings';

export interface Phase1Outcome {
  path: string;
  filename: string;
  reasonTags: string[];
  source: 'on-device' | 'metadata';
  originalPath: string;
  fileType: FileType;
}

function splitPath(path: string): { directory: string; name: string } {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts.pop() ?? path;
  const directory = parts.join('/');
  return { directory, name };
}

export function computePhase1Outcome(
  signals: Phase1Signals,
  settings: SettingsV1,
): Phase1Outcome {
  const heuristics = runPhase1Heuristics(signals, settings);
  const { directory } = splitPath(signals.filename);

  const policy = applyFilenamePolicy({
    subject: heuristics.subject,
    qualifiers: heuristics.qualifiers,
    extension: heuristics.extension,
    maxLength: settings.maxLen,
    separator: settings.separator,
    transliterateAscii: settings.transliterateAscii,
  });

  const filename = policy.filename;
  const path = directory ? `${directory}/${filename}` : filename;

  return {
    path,
    filename,
    reasonTags: heuristics.reasonTags,
    source: heuristics.source,
    originalPath: signals.filename,
    fileType: heuristics.fileType,
  };
}

export function computePhase1OutcomeDebug(
  signals: Phase1Signals,
  settings: SettingsV1,
  downloadId: string,
): DebugContext {
  const startTime = performance.now();
  const heuristics = runPhase1HeuristicsDebug(signals, settings);
  const { directory } = splitPath(signals.filename);

  const policy = applyFilenamePolicyDebug({
    subject: heuristics.subject,
    qualifiers: heuristics.qualifiers,
    extension: heuristics.extension,
    maxLength: settings.maxLen,
    separator: settings.separator,
    transliterateAscii: settings.transliterateAscii,
  });

  const filename = policy.filename;
  const path = directory ? `${directory}/${filename}` : filename;

  const outcome: Phase1Outcome = {
    path,
    filename,
    reasonTags: heuristics.reasonTags,
    source: heuristics.source,
    originalPath: signals.filename,
    fileType: heuristics.fileType,
  };

  const processingTime = performance.now() - startTime;

  return {
    downloadId,
    timestamp: Date.now(),
    signals,
    heuristicResult: heuristics,
    policyResult: policy,
    finalOutcome: outcome,
    processingTime,
    renamed: false, // Will be set by caller
    decision: {
      shouldRename: false, // Will be set by caller
      reason: 'pending',
    },
  };
}
