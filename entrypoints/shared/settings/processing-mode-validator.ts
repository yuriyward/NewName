import type { ProcessingMode, Settings } from './types';

/**
 * Auto-correct a single processing mode based on current constraints.
 * Extracted for explicit test coverage and reduced complexity.
 *
 * Correction rules:
 * - Cloud mode with cloud disabled → auto (will degrade to local at runtime)
 * - Local mode with local not ready but cloud available → auto
 * - Auto mode with nothing available → local (will show setup later)
 *
 * @param mode - The processing mode to correct
 * @param cloudEnabled - Whether cloud AI is enabled
 * @param localAiReady - Whether local AI models are ready
 * @returns The corrected processing mode
 */
export function correctProcessingMode(
  mode: ProcessingMode,
  cloudEnabled: boolean,
  localAiReady: boolean,
): ProcessingMode {
  if (mode === 'cloud' && !cloudEnabled) {
    // Cloud mode but cloud disabled → switch to auto (will degrade to local at runtime)
    return 'auto';
  }
  if (mode === 'local' && !localAiReady && cloudEnabled) {
    // Local mode but local not ready and cloud available → switch to auto
    return 'auto';
  }
  if (mode === 'auto' && !cloudEnabled && !localAiReady) {
    // Auto mode but nothing available → default to local (will show setup later)
    return 'local';
  }
  return mode;
}

/**
 * Validation result for a single processing mode option
 */
export interface ProcessingModeValidation {
  /** Whether this mode can be used */
  isValid: boolean;
  /** Tooltip text explaining why this mode is disabled */
  disabledReason?: string;
  /** Whether selecting this mode requires local AI setup */
  requiresSetup?: boolean;
}

/**
 * Validation result for mode change attempt
 */
export interface ModeChangeValidation {
  /** Whether the mode change can proceed */
  canProceed: boolean;
  /** Whether to show the local AI setup modal */
  requiresSetupModal?: boolean;
  /** User-facing reason why the change cannot proceed */
  reason?: string;
}

/**
 * Validation result for cloud disable attempt
 */
export interface CloudDisableValidation {
  /** Whether cloud can be disabled (always true, but may require confirmation) */
  canDisable: boolean;
  /** Whether to show confirmation modal before disabling */
  requiresConfirmation: boolean;
  /** List of processing modes that will be affected */
  affectedModes: Array<{ type: string; mode: ProcessingMode }>;
}

/**
 * Get validation status for all processing mode options
 * Used to determine which dropdown options should be disabled
 */
export function getValidProcessingModes(
  cloudEnabled: boolean,
  localAiReady: boolean,
): Record<ProcessingMode, ProcessingModeValidation> {
  return {
    auto: {
      isValid: cloudEnabled || localAiReady,
      disabledReason:
        !cloudEnabled && !localAiReady
          ? 'Requires either cloud AI or local models to be ready'
          : undefined,
      requiresSetup: !localAiReady && cloudEnabled, // May trigger setup if local not ready
    },
    local: {
      isValid: true, // Always allow selecting, but may require setup modal
      requiresSetup: !localAiReady,
      disabledReason: undefined,
    },
    cloud: {
      isValid: cloudEnabled,
      disabledReason: !cloudEnabled
        ? 'Cloud AI is disabled. Enable it in the Cloud AI section above.'
        : undefined,
      requiresSetup: false,
    },
  };
}

/**
 * Get tooltip text for a disabled processing mode option
 */
export function getDisabledReason(
  mode: ProcessingMode,
  cloudEnabled: boolean,
  localAiReady: boolean,
): string | undefined {
  const validModes = getValidProcessingModes(cloudEnabled, localAiReady);
  return validModes[mode].disabledReason;
}

/**
 * Validate whether a mode change should proceed
 * Returns whether to show setup modal or block the change
 */
export function validateModeChange(
  newMode: ProcessingMode,
  cloudEnabled: boolean,
  localAiReady: boolean,
): ModeChangeValidation {
  // Check if selecting cloud when it's disabled
  if (newMode === 'cloud' && !cloudEnabled) {
    return {
      canProceed: false,
      reason: 'Cloud AI is disabled. Enable it first in the Cloud AI section.',
    };
  }

  // Check if selecting auto when nothing is available
  if (newMode === 'auto' && !cloudEnabled && !localAiReady) {
    return {
      canProceed: false,
      reason:
        'Auto mode requires either cloud AI or local models. Please enable cloud AI or set up local models first.',
    };
  }

  // Check if selecting local/auto without ready models (but cloud is available for auto)
  if ((newMode === 'local' || newMode === 'auto') && !localAiReady) {
    return {
      canProceed: false,
      requiresSetupModal: true,
    };
  }

  return { canProceed: true };
}

/**
 * Check if cloud can be disabled given current processing preferences
 * Returns whether confirmation modal should be shown
 */
export function canDisableCloud(
  processingPreferences: Settings['processingPreferences'],
): CloudDisableValidation {
  const affectedModes: Array<{ type: string; mode: ProcessingMode }> = [];

  // Check global mode
  if (
    processingPreferences.global === 'cloud' ||
    processingPreferences.global === 'auto'
  ) {
    affectedModes.push({
      type: 'global',
      mode: processingPreferences.global,
    });
  }

  // Check per-type overrides if enabled
  if (processingPreferences.usePerTypeOverrides) {
    if (
      processingPreferences.text === 'cloud' ||
      processingPreferences.text === 'auto'
    ) {
      affectedModes.push({ type: 'text', mode: processingPreferences.text });
    }
    if (
      processingPreferences.pdf === 'cloud' ||
      processingPreferences.pdf === 'auto'
    ) {
      affectedModes.push({ type: 'pdf', mode: processingPreferences.pdf });
    }
    if (
      processingPreferences.image === 'cloud' ||
      processingPreferences.image === 'auto'
    ) {
      affectedModes.push({ type: 'image', mode: processingPreferences.image });
    }
  }

  return {
    canDisable: true,
    requiresConfirmation: affectedModes.length > 0,
    affectedModes,
  };
}

/**
 * Auto-correct invalid processing preferences based on current constraints.
 * Used during settings sanitization to ensure stored preferences are valid.
 *
 * @param preferences - The processing preferences to correct
 * @param cloudEnabled - Whether cloud AI is enabled
 * @param localAiReady - Whether local AI models are ready
 * @returns Corrected processing preferences
 */
export function autoCorrectProcessingPreferences(
  preferences: Settings['processingPreferences'],
  cloudEnabled: boolean,
  localAiReady: boolean,
): Settings['processingPreferences'] {
  const corrected = { ...preferences };

  // Correct global mode using extracted helper
  corrected.global = correctProcessingMode(
    preferences.global,
    cloudEnabled,
    localAiReady,
  );

  // Correct per-type modes if overrides enabled
  if (corrected.usePerTypeOverrides) {
    corrected.text = correctProcessingMode(
      preferences.text,
      cloudEnabled,
      localAiReady,
    );
    corrected.pdf = correctProcessingMode(
      preferences.pdf,
      cloudEnabled,
      localAiReady,
    );
    corrected.image = correctProcessingMode(
      preferences.image,
      cloudEnabled,
      localAiReady,
    );
  } else {
    // Sync all types to global when overrides disabled
    corrected.text = corrected.global;
    corrected.pdf = corrected.global;
    corrected.image = corrected.global;
  }

  return corrected;
}
