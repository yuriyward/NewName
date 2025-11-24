import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearInFlightPreparation,
  createPreparationKey,
} from './status-preparation';
import type { EnsureAiModelsOptions } from './status-types';

describe('clearInFlightPreparation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('can be called without throwing', () => {
    expect(() => {
      clearInFlightPreparation(['language-model']);
    }).not.toThrow();
  });

  it('can be called multiple times safely', () => {
    expect(() => {
      clearInFlightPreparation(['language-model']);
      clearInFlightPreparation(['language-model']);
      clearInFlightPreparation(['summarizer']);
    }).not.toThrow();
  });

  it('can clear multiple model IDs at once', () => {
    expect(() => {
      clearInFlightPreparation(['language-model', 'summarizer']);
    }).not.toThrow();
  });

  it('generates consistent keys for the same inputs', () => {
    const options1: EnsureAiModelsOptions = {
      signal: new AbortController().signal,
    };
    const options2: EnsureAiModelsOptions = {
      signal: new AbortController().signal,
    };

    const key1 = createPreparationKey(['language-model'], options1);
    const key2 = createPreparationKey(['language-model'], options2);

    expect(key1).toBe(key2);
  });

  it('generates different keys for different model IDs', () => {
    const options: EnsureAiModelsOptions = {
      signal: new AbortController().signal,
    };

    const key1 = createPreparationKey(['language-model'], options);
    const key2 = createPreparationKey(['summarizer'], options);

    expect(key1).not.toBe(key2);
  });

  it('generates consistent keys regardless of model ID order', () => {
    const options: EnsureAiModelsOptions = {
      signal: new AbortController().signal,
    };

    const key1 = createPreparationKey(
      ['language-model', 'summarizer'],
      options,
    );
    const key2 = createPreparationKey(
      ['summarizer', 'language-model'],
      options,
    );

    expect(key1).toBe(key2);
  });
});
