import { describe, expect, it } from 'vitest';
import {
  autoCorrectProcessingPreferences,
  canDisableCloud,
  correctProcessingMode,
  getDisabledReason,
  getValidProcessingModes,
  validateModeChange,
} from './processing-mode-validator';
import type { Settings } from './types';

describe('correctProcessingMode', () => {
  describe('cloud mode corrections', () => {
    it('returns auto when cloud mode selected but cloud disabled', () => {
      expect(correctProcessingMode('cloud', false, true)).toBe('auto');
      expect(correctProcessingMode('cloud', false, false)).toBe('auto');
    });

    it('keeps cloud mode when cloud is enabled', () => {
      expect(correctProcessingMode('cloud', true, true)).toBe('cloud');
      expect(correctProcessingMode('cloud', true, false)).toBe('cloud');
    });
  });

  describe('local mode corrections', () => {
    it('returns auto when local mode selected but local not ready and cloud available', () => {
      expect(correctProcessingMode('local', true, false)).toBe('auto');
    });

    it('keeps local mode when local is ready', () => {
      expect(correctProcessingMode('local', true, true)).toBe('local');
      expect(correctProcessingMode('local', false, true)).toBe('local');
    });

    it('keeps local mode when local not ready but cloud also unavailable', () => {
      // No fallback available, keep local (will show setup later)
      expect(correctProcessingMode('local', false, false)).toBe('local');
    });
  });

  describe('auto mode corrections', () => {
    it('returns local when auto mode selected but nothing available', () => {
      expect(correctProcessingMode('auto', false, false)).toBe('local');
    });

    it('keeps auto mode when cloud is available', () => {
      expect(correctProcessingMode('auto', true, false)).toBe('auto');
      expect(correctProcessingMode('auto', true, true)).toBe('auto');
    });

    it('keeps auto mode when local is available', () => {
      expect(correctProcessingMode('auto', false, true)).toBe('auto');
    });
  });
});

describe('getValidProcessingModes', () => {
  it('marks all modes valid when both cloud and local are available', () => {
    const result = getValidProcessingModes(true, true);
    expect(result.auto.isValid).toBe(true);
    expect(result.local.isValid).toBe(true);
    expect(result.cloud.isValid).toBe(true);
  });

  it('marks cloud invalid when cloud is disabled', () => {
    const result = getValidProcessingModes(false, true);
    expect(result.cloud.isValid).toBe(false);
    expect(result.cloud.disabledReason).toContain('Cloud AI is disabled');
  });

  it('marks auto invalid when nothing is available', () => {
    const result = getValidProcessingModes(false, false);
    expect(result.auto.isValid).toBe(false);
    expect(result.auto.disabledReason).toContain(
      'Requires either cloud AI or local models',
    );
  });

  it('marks local as requiring setup when local not ready', () => {
    const result = getValidProcessingModes(true, false);
    expect(result.local.isValid).toBe(true);
    expect(result.local.requiresSetup).toBe(true);
  });
});

describe('getDisabledReason', () => {
  it('returns undefined for valid modes', () => {
    expect(getDisabledReason('auto', true, true)).toBeUndefined();
    expect(getDisabledReason('local', true, true)).toBeUndefined();
    expect(getDisabledReason('cloud', true, true)).toBeUndefined();
  });

  it('returns reason for disabled cloud mode', () => {
    expect(getDisabledReason('cloud', false, true)).toContain(
      'Cloud AI is disabled',
    );
  });
});

describe('validateModeChange', () => {
  it('blocks cloud selection when cloud is disabled', () => {
    const result = validateModeChange('cloud', false, true);
    expect(result.canProceed).toBe(false);
    expect(result.reason).toContain('Cloud AI is disabled');
  });

  it('blocks auto selection when nothing is available', () => {
    const result = validateModeChange('auto', false, false);
    expect(result.canProceed).toBe(false);
    expect(result.reason).toContain('Auto mode requires');
  });

  it('requires setup modal for local when local not ready', () => {
    const result = validateModeChange('local', true, false);
    expect(result.canProceed).toBe(false);
    expect(result.requiresSetupModal).toBe(true);
  });

  it('allows valid mode changes', () => {
    expect(validateModeChange('cloud', true, true).canProceed).toBe(true);
    expect(validateModeChange('local', true, true).canProceed).toBe(true);
    expect(validateModeChange('auto', true, true).canProceed).toBe(true);
  });
});

describe('canDisableCloud', () => {
  const basePreferences: Settings['processingPreferences'] = {
    global: 'local',
    text: 'local',
    pdf: 'local',
    image: 'local',
    usePerTypeOverrides: false,
  };

  it('requires no confirmation when no cloud modes are used', () => {
    const result = canDisableCloud(basePreferences);
    expect(result.canDisable).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.affectedModes).toHaveLength(0);
  });

  it('requires confirmation when global mode is cloud', () => {
    const result = canDisableCloud({ ...basePreferences, global: 'cloud' });
    expect(result.requiresConfirmation).toBe(true);
    expect(result.affectedModes).toContainEqual({
      type: 'global',
      mode: 'cloud',
    });
  });

  it('requires confirmation when global mode is auto', () => {
    const result = canDisableCloud({ ...basePreferences, global: 'auto' });
    expect(result.requiresConfirmation).toBe(true);
    expect(result.affectedModes).toContainEqual({
      type: 'global',
      mode: 'auto',
    });
  });

  it('checks per-type overrides when enabled', () => {
    const result = canDisableCloud({
      ...basePreferences,
      usePerTypeOverrides: true,
      text: 'cloud',
      pdf: 'auto',
    });
    expect(result.requiresConfirmation).toBe(true);
    expect(result.affectedModes).toContainEqual({
      type: 'text',
      mode: 'cloud',
    });
    expect(result.affectedModes).toContainEqual({ type: 'pdf', mode: 'auto' });
  });
});

describe('autoCorrectProcessingPreferences', () => {
  const basePreferences: Settings['processingPreferences'] = {
    global: 'auto',
    text: 'auto',
    pdf: 'auto',
    image: 'auto',
    usePerTypeOverrides: false,
  };

  it('returns unchanged preferences when all constraints satisfied', () => {
    const result = autoCorrectProcessingPreferences(
      basePreferences,
      true,
      true,
    );
    expect(result).toEqual(basePreferences);
  });

  it('corrects global mode and syncs to per-type when overrides disabled', () => {
    const prefs = { ...basePreferences, global: 'cloud' as const };
    const result = autoCorrectProcessingPreferences(prefs, false, true);
    expect(result.global).toBe('auto');
    expect(result.text).toBe('auto');
    expect(result.pdf).toBe('auto');
    expect(result.image).toBe('auto');
  });

  it('corrects per-type modes independently when overrides enabled', () => {
    const prefs: Settings['processingPreferences'] = {
      global: 'local',
      text: 'cloud',
      pdf: 'local',
      image: 'auto',
      usePerTypeOverrides: true,
    };
    const result = autoCorrectProcessingPreferences(prefs, false, true);
    expect(result.global).toBe('local');
    expect(result.text).toBe('auto'); // cloud → auto (cloud disabled)
    expect(result.pdf).toBe('local');
    expect(result.image).toBe('auto');
  });

  it('handles nothing available scenario', () => {
    const result = autoCorrectProcessingPreferences(
      basePreferences,
      false,
      false,
    );
    expect(result.global).toBe('local'); // auto → local (nothing available)
    expect(result.text).toBe('local');
    expect(result.pdf).toBe('local');
    expect(result.image).toBe('local');
  });
});
