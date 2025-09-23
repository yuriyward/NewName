/**
 * Metadata qualification rules and enrichment logic
 */
import type { Candidate } from '@/entrypoints/shared/analysis/candidate-ranking';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import { extractResolutionFromFilename } from '@/entrypoints/shared/context/page-analyzer';
import type {
  FileType,
  SettingsV1,
} from '@/entrypoints/shared/settings/settings';

export interface QualifierState {
  qualifiers: string[];
  reasons: string[];
  lowerCandidate: string;
}

export interface DeriveQualifiersParams {
  signals: Phase1Signals;
  candidate: Candidate;
  brand: string | null;
  fileType: FileType;
  settings: SettingsV1;
}

export type QualifierRule = (
  state: QualifierState,
  params: DeriveQualifiersParams,
) => void;

export function pushQualifier(
  state: QualifierState,
  qualifier: string,
  reason: string,
): void {
  const trimmed = qualifier.trim();
  if (trimmed.length === 0) return;
  state.qualifiers.push(trimmed);
  state.reasons.push(reason);
}

export const applyDocumentDateQualifier: QualifierRule = (state, params) => {
  if (!params.settings.metadataToggles.docDate) return;
  if (!params.signals.startTime) return;

  const date = new Date(params.signals.startTime);
  if (Number.isNaN(date.getTime())) return;

  const yearFragment = date.getFullYear().toString();
  if (state.lowerCandidate.includes(yearFragment)) return;

  const iso = date.toISOString().slice(0, 10);
  pushQualifier(state, iso, 'Date');
};

export const applySourceQualifier: QualifierRule = (state, params) => {
  if (!params.settings.metadataToggles.sourceHint) return;
  if (!params.brand) return;

  const lowerBrand = params.brand.toLowerCase();
  if (state.lowerCandidate.includes(lowerBrand)) return;

  pushQualifier(state, params.brand, 'Source');
};

export const applyMediaSpecQualifier: QualifierRule = (state, params) => {
  if (params.fileType !== 'image') return;
  if (!params.settings.metadataToggles.mediaSpecs) return;

  const dimensionHint = extractResolutionFromFilename(params.signals.filename);
  if (!dimensionHint) return;

  if (state.lowerCandidate.includes(dimensionHint.toLowerCase())) return;

  pushQualifier(state, dimensionHint, 'Spec');
};

export const QUALIFIER_RULES: QualifierRule[] = [
  applyDocumentDateQualifier,
  applySourceQualifier,
  applyMediaSpecQualifier,
];

export function deriveQualifiers(params: DeriveQualifiersParams): {
  qualifiers: string[];
  reasonTags: string[];
} {
  const state: QualifierState = {
    qualifiers: [],
    reasons: [],
    lowerCandidate: params.candidate.value.toLowerCase(),
  };

  for (const applyQualifier of QUALIFIER_RULES) {
    applyQualifier(state, params);
  }

  return { qualifiers: state.qualifiers, reasonTags: state.reasons };
}
