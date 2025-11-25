import { describe, expect, it } from 'vitest';
import type { AiModelState } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type { ModelProgress } from './types';
import { resolveModelAction } from './utils';

describe('resolveModelAction', () => {
  describe('basic state handling (no progress)', () => {
    it('returns null for available state', () => {
      const result = resolveModelAction('available');
      expect(result).toBeNull();
    });

    it('returns null for unsupported state', () => {
      const result = resolveModelAction('unsupported');
      expect(result).toBeNull();
    });

    it('returns "Download" for downloadable state', () => {
      const result = resolveModelAction('downloadable');
      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });

    it('returns "Retry download" for downloading state', () => {
      const result = resolveModelAction('downloading');
      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('returns "Try again" for error state', () => {
      const result = resolveModelAction('error');
      expect(result).toEqual({ label: 'Try again', tone: 'primary' });
    });

    it('returns "Check status" for unknown state', () => {
      const result = resolveModelAction('unknown');
      expect(result).toEqual({ label: 'Check status', tone: 'secondary' });
    });

    it('returns "Check again" for unavailable state', () => {
      const result = resolveModelAction('unavailable');
      expect(result).toEqual({ label: 'Check again', tone: 'secondary' });
    });
  });

  describe('race condition handling: Chrome reports "downloading" but user never started', () => {
    it('returns "Download" when state is downloading but progress shows not started', () => {
      const progress: ModelProgress = {
        started: false,
        completed: false,
      };

      const result = resolveModelAction('downloading', progress);

      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });

    it('follows normal downloading flow when progress shows started', () => {
      const progress: ModelProgress = {
        started: true,
        completed: false,
      };

      const result = resolveModelAction('downloading', progress);

      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('follows normal downloading flow when progress is undefined', () => {
      const result = resolveModelAction('downloading', undefined);

      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('handles race condition when other models complete causing false "downloading" state', () => {
      // Chrome API bug: reports model as "downloading" when other models finish
      const progress: ModelProgress = {
        started: false,
        completed: false,
        loaded: undefined,
        total: undefined,
      };

      const result = resolveModelAction('downloading', progress);

      // Should treat as downloadable, not downloading
      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });
  });

  describe('race condition handling: Download started but status slipped back to downloadable', () => {
    it('returns "Retry download" when downloadable but user already started', () => {
      const progress: ModelProgress = {
        started: true,
        completed: false,
      };

      const result = resolveModelAction('downloadable', progress);

      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('returns "Download" when downloadable and not started', () => {
      const progress: ModelProgress = {
        started: false,
        completed: false,
      };

      const result = resolveModelAction('downloadable', progress);

      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });

    it('returns "Download" when downloadable and progress is undefined', () => {
      const result = resolveModelAction('downloadable', undefined);

      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });

    it('handles case where download started but Chrome state reverted to downloadable', () => {
      // Chrome API bug: status slips back to "downloadable" even though user started download
      const progress: ModelProgress = {
        started: true,
        completed: false,
        loaded: 1024,
        total: 10240,
      };

      const result = resolveModelAction('downloadable', progress);

      // Should keep CTA as "Retry download" to maintain user experience
      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('returns normal downloadable action when download already completed', () => {
      const progress: ModelProgress = {
        started: true,
        completed: true,
      };

      const result = resolveModelAction('downloadable', progress);

      // Completed downloads shouldn't show "Retry" - fall through to normal downloadable
      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });
  });

  describe('progress edge cases', () => {
    it('handles progress with only started flag', () => {
      const progress: ModelProgress = {
        started: true,
        completed: false,
      };

      const result = resolveModelAction('downloading', progress);

      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('handles progress with loaded/total bytes', () => {
      const progress: ModelProgress = {
        started: true,
        completed: false,
        loaded: 5000,
        total: 10000,
      };

      const result = resolveModelAction('downloading', progress);

      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('handles progress with error', () => {
      const progress: ModelProgress = {
        started: true,
        completed: false,
        error: 'Network error',
        errorCode: 'NETWORK_ERROR',
      };

      const result = resolveModelAction('error', progress);

      expect(result).toEqual({ label: 'Try again', tone: 'primary' });
    });

    it('handles completed progress with available state', () => {
      const progress: ModelProgress = {
        started: true,
        completed: true,
      };

      const result = resolveModelAction('available', progress);

      expect(result).toBeNull();
    });
  });

  describe('regression tests for Chrome API race conditions', () => {
    it('prevents showing "Resume download" when Chrome incorrectly reports downloading', () => {
      // Scenario: User downloads Model A, which completes
      // Chrome incorrectly reports Model B as "downloading"
      // But Model B was never started by the user
      const progressModelB: ModelProgress = {
        started: false,
        completed: false,
      };

      const result = resolveModelAction('downloading', progressModelB);

      // Should show "Download" not "Retry download"
      expect(result).toEqual({ label: 'Download', tone: 'primary' });
    });

    it('maintains user experience when download state degrades during network issues', () => {
      // Scenario: User starts download, network hiccups, Chrome status reverts to "downloadable"
      // But we have local progress showing they started
      const progress: ModelProgress = {
        started: true,
        completed: false,
        loaded: 2048,
        total: 10240,
      };

      const result = resolveModelAction('downloadable', progress);

      // Should keep showing "Retry download" to maintain continuity
      expect(result).toEqual({ label: 'Retry download', tone: 'primary' });
    });

    it('handles rapid state transitions during simultaneous model downloads', () => {
      // Scenario: Multiple models downloading, Chrome reports inconsistent states
      const states: Array<{
        state: AiModelState;
        progress: ModelProgress;
        expected: string;
      }> = [
        {
          state: 'downloading',
          progress: { started: false, completed: false },
          expected: 'Download',
        },
        {
          state: 'downloadable',
          progress: { started: true, completed: false },
          expected: 'Retry download',
        },
        {
          state: 'downloading',
          progress: { started: true, completed: false },
          expected: 'Retry download',
        },
      ];

      for (const { state, progress, expected } of states) {
        const result = resolveModelAction(state, progress);
        expect(result?.label).toBe(expected);
      }
    });
  });
});
