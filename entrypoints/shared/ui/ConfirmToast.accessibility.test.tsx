/**
 * Accessibility tests for confirm toast component
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ConfirmToastState } from '@/entrypoints/shared/toast/types';
import { ConfirmToast } from './ConfirmToast';

vi.mock('@/entrypoints/shared/ui/FilenameEditor', () => ({
  __esModule: true,
  FilenameEditor: vi.fn(() => (
    <div data-test="mock-filename-editor">
      <span>Mock filename editor</span>
    </div>
  )),
}));

vi.mock('@/entrypoints/shared/ui/CountdownBadge', () => ({
  __esModule: true,
  CountdownBadge: vi.fn(({ seconds }: { seconds: number }) => (
    <div aria-hidden="true" data-test="mock-countdown-badge">
      {seconds}s
    </div>
  )),
}));

vi.mock('@/entrypoints/shared/messaging/extension-messaging', () => ({
  __esModule: true,
  sendConfirmToastCountdownControl: vi.fn(async () => ({ ok: true as const })),
}));

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
    displayProposedPath: '/downloads/renamed.pdf',
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
    autoApplyRemainingMs: 3_000,
    status: 'pending',
    resolving: false,
    ...overrides,
  };
}

describe('ConfirmToast accessibility', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-10T12:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('renders a polite countdown announcement region', () => {
    const toast = createToast();

    const markup = renderToStaticMarkup(
      <ConfirmToast
        toast={toast}
        onApprove={vi.fn()}
        onKeep={vi.fn()}
        autoFocus
      />,
    );

    expect(markup).toContain('data-test="confirm-toast-countdown-live"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain('Auto-apply in 3 seconds');
    expect(markup).toContain('aria-hidden="true"');
  });

  it('announces when the auto-apply countdown is paused', () => {
    const toast = createToast({
      autoApplyAt: null,
      autoApplyRemainingMs: 4_000,
    });

    const markup = renderToStaticMarkup(
      <ConfirmToast toast={toast} onApprove={vi.fn()} onKeep={vi.fn()} />,
    );

    expect(markup).toContain('Auto-apply paused at 4 seconds');
  });
});
