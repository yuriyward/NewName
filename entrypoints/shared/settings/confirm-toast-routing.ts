/**
 * Helper utilities for deciding whether the confirm toast should appear.
 */
import type {
  FileType,
  PerTypeBehavior,
  Settings,
} from '@/entrypoints/shared/settings/types';

export type ConfirmToastTriggerSource =
  | 'careful-mode'
  | 'per-type-confirm'
  | 'sensitive-detection'
  | 'metadata-rule';

export type ConfirmToastSkipReason =
  | 'mode-silent'
  | 'per-type-off'
  | 'balanced-auto'
  | 'custom-auto'
  | 'default-auto';

export interface ConfirmToastSignals {
  /**
   * Sensitive detection reasons (legal/financial/etc) that should force confirmation.
   */
  sensitiveReasons?: readonly string[];
  /**
   * Additional metadata-driven reasons to force confirmation (custom routing).
   */
  metadataReasons?: readonly string[];
}

export interface ConfirmToastRouteToast {
  kind: 'toast';
  autoApplyDelaySeconds: number | null;
  requireManualDecision: boolean;
  sources: ConfirmToastTriggerSource[];
}

export interface ConfirmToastRouteSkip {
  kind: 'skip';
  reason: ConfirmToastSkipReason;
}

export type ConfirmToastRoute = ConfirmToastRouteToast | ConfirmToastRouteSkip;

function resolvePerTypeBehavior(
  perType: Record<FileType, PerTypeBehavior>,
  fileType: FileType,
): PerTypeBehavior['behavior'] {
  return perType[fileType]?.behavior ?? 'auto';
}

export function resolveConfirmToastRoute({
  settings,
  fileType,
  signals,
}: {
  settings: Settings;
  fileType: FileType;
  signals?: ConfirmToastSignals;
}): ConfirmToastRoute {
  const behavior = resolvePerTypeBehavior(settings.perType, fileType);

  if (settings.mode === 'silent') {
    return { kind: 'skip', reason: 'mode-silent' };
  }

  if (behavior === 'off') {
    return { kind: 'skip', reason: 'per-type-off' };
  }

  if (settings.mode === 'careful') {
    return {
      kind: 'toast',
      autoApplyDelaySeconds: null,
      requireManualDecision: true,
      sources: ['careful-mode'],
    };
  }

  if (behavior === 'confirm') {
    return {
      kind: 'toast',
      autoApplyDelaySeconds: settings.confirmToast.autoApplyDelaySeconds,
      requireManualDecision: false,
      sources: ['per-type-confirm'],
    };
  }

  const sensitiveReasons = signals?.sensitiveReasons ?? [];
  const metadataReasons = signals?.metadataReasons ?? [];
  const hasSensitive = sensitiveReasons.length > 0;
  const hasMetadata = metadataReasons.length > 0;

  if (hasMetadata) {
    return {
      kind: 'toast',
      autoApplyDelaySeconds: settings.confirmToast.autoApplyDelaySeconds,
      requireManualDecision: false,
      sources: ['metadata-rule'],
    };
  }

  if (settings.mode === 'balanced') {
    if (hasSensitive) {
      return {
        kind: 'toast',
        autoApplyDelaySeconds: settings.confirmToast.autoApplyDelaySeconds,
        requireManualDecision: false,
        sources: ['sensitive-detection'],
      };
    }
    return { kind: 'skip', reason: 'balanced-auto' };
  }

  if (settings.mode === 'custom') {
    if (hasSensitive) {
      return {
        kind: 'toast',
        autoApplyDelaySeconds: settings.confirmToast.autoApplyDelaySeconds,
        requireManualDecision: false,
        sources: ['sensitive-detection'],
      };
    }
    if (behavior === 'auto') {
      return { kind: 'skip', reason: 'custom-auto' };
    }
  }

  return { kind: 'skip', reason: 'default-auto' };
}
