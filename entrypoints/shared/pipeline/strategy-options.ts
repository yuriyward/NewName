/**
 * Strategy option definitions for the Instant Baseline domain
 */

import type { InstantBaselineStrategy } from '@/entrypoints/shared/pipeline/instant-baseline-types';

export type StrategyOption = {
  value: InstantBaselineStrategy;
  title: string;
  description: string;
};

/**
 * Available strategy options with user-friendly descriptions
 * Part of the Instant Baseline domain
 */
export const STRATEGY_OPTIONS: ReadonlyArray<StrategyOption> = [
  {
    value: 'keep-original',
    title: 'Keep original name',
    description: 'Never rename downloads.',
  },
  {
    value: 'original-with-date',
    title: 'Original name + date',
    description: 'Add download date to filename.',
  },
  {
    value: 'page-title',
    title: 'Page title only',
    description: 'Use the page title as filename.',
  },
  {
    value: 'page-title-with-date',
    title: 'Page title + date',
    description: 'Combine page title with download date.',
  },
] as const;

/**
 * Get strategy option by value
 */
export function getStrategyOption(
  strategy: InstantBaselineStrategy,
): StrategyOption | undefined {
  return STRATEGY_OPTIONS.find((option) => option.value === strategy);
}

/**
 * Get all available strategy values
 */
export function getAvailableStrategies(): ReadonlyArray<InstantBaselineStrategy> {
  return STRATEGY_OPTIONS.map((option) => option.value);
}
