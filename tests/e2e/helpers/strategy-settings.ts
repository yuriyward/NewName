import type { InstantBaselineStrategy } from '@/entrypoints/shared/settings/settings';
import { createTestSettings } from './test-settings';

export function createStrategySettings(
  strategy: InstantBaselineStrategy,
  overrides: Parameters<typeof createTestSettings>[0] = {},
) {
  return createTestSettings({
    instantBaselineStrategy: strategy,
    ...overrides,
  });
}
