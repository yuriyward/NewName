import { describe, expect, it } from 'vitest';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/types';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
import { shouldAnalyzeUpgrade, UPGRADE_RECENT_WINDOW_MS } from './eligibility';

const baseHistoryItem: HistoryItem = {
  id: 'history-keep',
  ts: Date.now(),
  path: 'downloads/file.pdf',
  original: 'file.pdf',
  final: 'file.pdf',
  source: 'on-device',
  fileType: 'pdf',
  phase: 'instant-baseline',
  reasonTags: [],
};

describe('shouldAnalyzeUpgrade', () => {
  it('skips contextual upgrades when keep-original strategy is selected', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'keep-original',
    };

    const result = shouldAnalyzeUpgrade(baseHistoryItem, settings, Date.now());

    expect(result).toBe(false);
  });

  it('allows contextual upgrades when AI rename strategy is selected', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    };

    const result = shouldAnalyzeUpgrade(baseHistoryItem, settings, Date.now());

    expect(result).toBe(true);
  });

  it('skips contextual upgrades when the file type is disabled', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
      perType: {
        ...DEFAULT_SETTINGS.perType,
        pdf: { behavior: 'off' },
      },
    };

    const result = shouldAnalyzeUpgrade(baseHistoryItem, settings, Date.now());

    expect(result).toBe(false);
  });

  it('skips contextual upgrades after a perfect-confidence rename decision', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      decision: {
        outcome: 'rename',
        strategy: 'ai-rename',
        confidence: 100,
        guardrail: 'strategy-applied',
        reasons: ['ai-perfect-confidence'],
        signals: {
          inputsUsed: [],
          missingInputs: [],
        },
      },
    };

    const result = shouldAnalyzeUpgrade(historyItem, settings, Date.now());

    expect(result).toBe(false);
  });

  it('enforces the cooldown window after a recent contextual upgrade', () => {
    const now = Date.now();
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      upgrade: {
        proposedFilename: 'descriptive-file.pdf',
        proposedPath: 'downloads/descriptive-file.pdf',
        autoApply: true,
        reasonTags: ['ai-upgrade'],
        generatedAt: now - (UPGRADE_RECENT_WINDOW_MS - 1),
        source: 'ai',
        confidenceScore: 0.92,
      },
    };

    const result = shouldAnalyzeUpgrade(historyItem, settings, now);

    expect(result).toBe(false);
  });

  it('still blocks when ai-rename is active but the previous upgrade timestamp is in the future', () => {
    const now = Date.now();
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      upgrade: {
        proposedFilename: 'future-file.pdf',
        proposedPath: 'downloads/future-file.pdf',
        autoApply: true,
        reasonTags: ['ai-upgrade'],
        generatedAt: now + 5_000,
        source: 'ai',
      },
    };

    const result = shouldAnalyzeUpgrade(historyItem, settings, now);

    expect(result).toBe(false);
  });
});
