import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ConfirmToastState } from '@/entrypoints/shared/toast/types';
import { ConfirmToast } from './ConfirmToast';

function createToast(
  overrides: Partial<ConfirmToastState> = {},
): ConfirmToastState {
  const now = Date.now();
  return {
    toastId: 'toast-a11y',
    createdAt: now,
    historyId: 'history-a11y',
    originalFilename: 'original.pdf',
    proposedFilename: 'renamed.pdf',
    proposedPath: '/downloads/renamed.pdf',
    fileType: 'pdf',
    mode: 'balanced',
    reasonTags: [],
    sensitiveReasons: [],
    sensitiveMatches: [],
    triggerSources: [],
    autoApplyAt: now + 3_000,
    autoApplyDelaySeconds: 3,
    allowAutoApply: true,
    allowAlwaysApply: true,
    status: 'pending',
    resolving: false,
    ...overrides,
  };
}

describe('ConfirmToast accessibility', () => {
  it('renders a polite countdown announcement region', () => {
    vi.setSystemTime(new Date('2025-10-10T12:00:00Z'));
    const toast = createToast();

    const markup = renderToStaticMarkup(
      <ConfirmToast
        toast={toast}
        onApprove={vi.fn()}
        onKeep={vi.fn()}
        onAlwaysApply={vi.fn()}
        autoFocus
      />,
    );

    expect(markup).toContain('data-test="confirm-toast-countdown-live"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain('Auto-apply in 3 seconds');
    expect(markup).toContain('aria-hidden="true"');
  });
});
