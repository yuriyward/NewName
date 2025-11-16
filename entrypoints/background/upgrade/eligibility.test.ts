import { describe, expect, it } from 'vitest';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
import { shouldAnalyzeUpgrade } from './eligibility';

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
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'keep-original',
    } as const;

    const result = shouldAnalyzeUpgrade(baseHistoryItem, settings, Date.now());

    expect(result).toBe(false);
  });

  it('allows contextual upgrades when AI rename strategy is selected', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    } as const;

    const result = shouldAnalyzeUpgrade(baseHistoryItem, settings, Date.now());

    expect(result).toBe(true);
  });
});
