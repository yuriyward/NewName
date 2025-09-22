import { runPhase1Heuristics } from '@/entrypoints/shared/analysis/heuristics-orchestrator';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
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
  const normalised = path.replace(/\\/g, '/');
  const parts = normalised.split('/');
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
