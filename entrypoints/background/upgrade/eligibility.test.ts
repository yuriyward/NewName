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

  it('skips AI analysis when metadata upgrade already exists', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      fileType: 'video',
      upgrade: {
        proposedFilename: 'video_1920x1080_60fps_H264.mp4',
        proposedPath: 'downloads/video_1920x1080_60fps_H264.mp4',
        autoApply: true,
        reasonTags: ['media-specs'],
        generatedAt: Date.now(),
        source: 'metadata',
        confidenceScore: 0.95,
      },
    };

    const result = shouldAnalyzeUpgrade(historyItem, settings, Date.now());

    // Should return false to prevent AI analysis from overwriting metadata upgrade
    expect(result).toBe(false);
  });

  it('skips AI analysis when metadata upgrade exists even if file type is disabled', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
      perType: {
        ...DEFAULT_SETTINGS.perType,
        video: { behavior: 'off' },
      },
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      fileType: 'video',
      upgrade: {
        proposedFilename: 'video_1920x1080_60fps_H264.mp4',
        proposedPath: 'downloads/video_1920x1080_60fps_H264.mp4',
        autoApply: true,
        reasonTags: ['media-specs'],
        generatedAt: Date.now(),
        source: 'metadata',
        confidenceScore: 0.95,
      },
    };

    const result = shouldAnalyzeUpgrade(historyItem, settings, Date.now());

    // Metadata upgrade check happens before file type check, so this returns false
    expect(result).toBe(false);
  });

  it('skips immediate AI analysis for media files when media specs are enabled', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
      metadataToggles: {
        ...DEFAULT_SETTINGS.metadataToggles,
        mediaSpecs: true,
      },
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      fileType: 'video',
    };

    const result = shouldAnalyzeUpgrade(
      historyItem,
      settings,
      Date.now(),
      'immediate',
    );

    expect(result).toBe(false);
  });

  it('allows scheduler AI fallback for media files when media specs are enabled', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
      metadataToggles: {
        ...DEFAULT_SETTINGS.metadataToggles,
        mediaSpecs: true,
      },
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      fileType: 'audio',
    };

    const result = shouldAnalyzeUpgrade(
      historyItem,
      settings,
      Date.now(),
      'scheduler',
    );

    expect(result).toBe(true);
  });

  it('allows immediate AI analysis for media files when media specs toggle is off', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      instantBaselineStrategy: 'ai-rename',
      metadataToggles: {
        ...DEFAULT_SETTINGS.metadataToggles,
        mediaSpecs: false,
      },
    };

    const historyItem: HistoryItem = {
      ...baseHistoryItem,
      fileType: 'video',
    };

    const result = shouldAnalyzeUpgrade(
      historyItem,
      settings,
      Date.now(),
      'immediate',
    );

    expect(result).toBe(true);
  });
});
