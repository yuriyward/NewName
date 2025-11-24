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
    const options: EnsureAiModelsOptions = {
      signal: new AbortController().signal,
    };
    expect(() => {
      clearInFlightPreparation(['language-model'], options);
    }).not.toThrow();
  });

  it('can be called multiple times safely', () => {
    const options: EnsureAiModelsOptions = {
      signal: new AbortController().signal,
    };
    expect(() => {
      clearInFlightPreparation(['language-model'], options);
      clearInFlightPreparation(['language-model'], options);
      clearInFlightPreparation(['summarizer'], options);
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
