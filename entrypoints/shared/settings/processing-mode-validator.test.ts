import { describe, expect, it } from 'vitest';
import {
  autoCorrectProcessingPreferences,
  canDisableCloud,
  getDisabledReason,
  getValidProcessingModes,
  validateModeChange,
} from './processing-mode-validator';
import type { Settings } from './types';

describe('processing-mode-validator', () => {
  describe('getValidProcessingModes', () => {
    it('should allow all modes when both cloud and local are ready', () => {
      const result = getValidProcessingModes(true, true);

      expect(result.auto.isValid).toBe(true);
      expect(result.auto.disabledReason).toBeUndefined();

      expect(result.local.isValid).toBe(true);
      expect(result.local.disabledReason).toBeUndefined();

      expect(result.cloud.isValid).toBe(true);
      expect(result.cloud.disabledReason).toBeUndefined();
    });

    it('should disable cloud when cloud is not enabled', () => {
      const result = getValidProcessingModes(false, true);

      expect(result.cloud.isValid).toBe(false);
      expect(result.cloud.disabledReason).toContain('disabled');
    });

    it('should disable auto when neither cloud nor local is ready', () => {
      const result = getValidProcessingModes(false, false);

      expect(result.auto.isValid).toBe(false);
      expect(result.auto.disabledReason).toBeDefined();
    });

    it('should allow local mode even when not ready (requires setup)', () => {
      const result = getValidProcessingModes(true, false);

      expect(result.local.isValid).toBe(true);
      expect(result.local.requiresSetup).toBe(true);
    });

    it('should allow auto when only cloud is ready', () => {
      const result = getValidProcessingModes(true, false);

      expect(result.auto.isValid).toBe(true);
    });

    it('should allow auto when only local is ready', () => {
      const result = getValidProcessingModes(false, true);

      expect(result.auto.isValid).toBe(true);
    });
  });

  describe('getDisabledReason', () => {
    it('should return reason for cloud when disabled', () => {
      const reason = getDisabledReason('cloud', false, true);
      expect(reason).toContain('disabled');
    });

    it('should return undefined for valid modes', () => {
      const reason = getDisabledReason('local', true, true);
      expect(reason).toBeUndefined();
    });
  });

  describe('validateModeChange', () => {
    it('should allow local mode change when local is ready', () => {
      const result = validateModeChange('local', true, true);
      expect(result.canProceed).toBe(true);
      expect(result.requiresSetupModal).toBeUndefined();
    });

    it('should require setup modal for local when not ready', () => {
      const result = validateModeChange('local', true, false);
      expect(result.canProceed).toBe(false);
      expect(result.requiresSetupModal).toBe(true);
    });

    it('should require setup modal for auto when local not ready', () => {
      const result = validateModeChange('auto', true, false);
      expect(result.canProceed).toBe(false);
      expect(result.requiresSetupModal).toBe(true);
    });

    it('should block cloud mode when cloud is disabled', () => {
      const result = validateModeChange('cloud', false, true);
      expect(result.canProceed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should block auto mode when nothing is available', () => {
      const result = validateModeChange('auto', false, false);
      expect(result.canProceed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow cloud mode when cloud is enabled', () => {
      const result = validateModeChange('cloud', true, true);
      expect(result.canProceed).toBe(true);
    });

    it('should allow auto mode when cloud is enabled even if local not ready', () => {
      const result = validateModeChange('auto', true, false);
      // This should show setup modal, not block
      expect(result.canProceed).toBe(false);
      expect(result.requiresSetupModal).toBe(true);
    });
  });

  describe('canDisableCloud', () => {
    it('should not require confirmation when no cloud modes are active', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'local',
        usePerTypeOverrides: false,
        text: 'local',
        pdf: 'local',
        image: 'local',
      };

      const result = canDisableCloud(prefs);
      expect(result.canDisable).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.affectedModes).toHaveLength(0);
    });

    it('should require confirmation when global mode is cloud', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'cloud',
        usePerTypeOverrides: false,
        text: 'cloud',
        pdf: 'cloud',
        image: 'cloud',
      };

      const result = canDisableCloud(prefs);
      expect(result.canDisable).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.affectedModes).toHaveLength(1);
      expect(result.affectedModes[0].type).toBe('global');
      expect(result.affectedModes[0].mode).toBe('cloud');
    });

    it('should require confirmation when global mode is auto', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'auto',
        usePerTypeOverrides: false,
        text: 'auto',
        pdf: 'auto',
        image: 'auto',
      };

      const result = canDisableCloud(prefs);
      expect(result.canDisable).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.affectedModes).toHaveLength(1);
      expect(result.affectedModes[0].mode).toBe('auto');
    });

    it('should require confirmation when per-type overrides have cloud modes', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'local',
        usePerTypeOverrides: true,
        text: 'cloud',
        pdf: 'auto',
        image: 'local',
      };

      const result = canDisableCloud(prefs);
      expect(result.canDisable).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.affectedModes).toHaveLength(2);
      expect(result.affectedModes.some((m) => m.type === 'text')).toBe(true);
      expect(result.affectedModes.some((m) => m.type === 'pdf')).toBe(true);
    });

    it('should not check per-type when overrides are disabled', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'local',
        usePerTypeOverrides: false,
        text: 'cloud', // This should be ignored since overrides are disabled
        pdf: 'auto',
        image: 'local',
      };

      const result = canDisableCloud(prefs);
      expect(result.requiresConfirmation).toBe(false);
    });
  });

  describe('autoCorrectProcessingPreferences', () => {
    it('should not change preferences when all modes are valid', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'auto',
        usePerTypeOverrides: false,
        text: 'auto',
        pdf: 'auto',
        image: 'auto',
      };

      const result = autoCorrectProcessingPreferences(prefs, true, true);
      expect(result).toEqual(prefs);
    });

    it('should change cloud to auto when cloud is disabled', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'cloud',
        usePerTypeOverrides: false,
        text: 'cloud',
        pdf: 'cloud',
        image: 'cloud',
      };

      const result = autoCorrectProcessingPreferences(prefs, false, true);
      expect(result.global).toBe('auto');
      expect(result.text).toBe('auto');
      expect(result.pdf).toBe('auto');
      expect(result.image).toBe('auto');
    });

    it('should change local to auto when local not ready and cloud available', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'local',
        usePerTypeOverrides: false,
        text: 'local',
        pdf: 'local',
        image: 'local',
      };

      const result = autoCorrectProcessingPreferences(prefs, true, false);
      expect(result.global).toBe('auto');
      expect(result.text).toBe('auto');
      expect(result.pdf).toBe('auto');
      expect(result.image).toBe('auto');
    });

    it('should keep local when local not ready but cloud disabled', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'local',
        usePerTypeOverrides: false,
        text: 'local',
        pdf: 'local',
        image: 'local',
      };

      const result = autoCorrectProcessingPreferences(prefs, false, false);
      // Keep local even if not ready (user will need to set up)
      expect(result.global).toBe('local');
    });

    it('should correct per-type modes when overrides enabled', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'local',
        usePerTypeOverrides: true,
        text: 'cloud',
        pdf: 'local',
        image: 'auto',
      };

      const result = autoCorrectProcessingPreferences(prefs, false, false);
      expect(result.global).toBe('local');
      expect(result.text).toBe('auto'); // cloud → auto when cloud disabled
      expect(result.pdf).toBe('local'); // stays local
      expect(result.image).toBe('local'); // auto → local when nothing available
    });

    it('should sync all types to global when overrides disabled', () => {
      const prefs: Settings['processingPreferences'] = {
        global: 'cloud',
        usePerTypeOverrides: false,
        text: 'local',
        pdf: 'auto',
        image: 'cloud',
      };

      const result = autoCorrectProcessingPreferences(prefs, false, true);
      const correctedGlobal = 'auto'; // cloud → auto when cloud disabled
      expect(result.global).toBe(correctedGlobal);
      expect(result.text).toBe(correctedGlobal);
      expect(result.pdf).toBe(correctedGlobal);
      expect(result.image).toBe(correctedGlobal);
    });
  });
});
