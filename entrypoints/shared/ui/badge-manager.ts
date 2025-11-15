import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';

export type BadgeIntent = 'action-required';

interface BadgeStyle {
  text: string;
  color: string;
}

const BADGE_STYLES: Record<BadgeIntent, BadgeStyle> = {
  'action-required': {
    text: '!',
    color: '#F59E0B',
  },
};

async function applyBadgeUpdate(update: () => Promise<void>): Promise<void> {
  try {
    await update();
  } catch (error) {
    debugLogger.warn('[BadgeManager] Failed to update toolbar badge', {
      error,
    });
  }
}

export async function showBadge(intent: BadgeIntent, overrides?: Partial<BadgeStyle>): Promise<void> {
  const style = {
    ...BADGE_STYLES[intent],
    ...overrides,
  } satisfies BadgeStyle;

  await applyBadgeUpdate(async () => {
    await browser.action.setBadgeText({ text: style.text });
    await browser.action.setBadgeBackgroundColor({ color: style.color });
  });
}

export async function clearBadge(): Promise<void> {
  await applyBadgeUpdate(async () => {
    await browser.action.setBadgeText({ text: '' });
  });
}

export async function showPersistentPermissionBadge(): Promise<void> {
  await showBadge('action-required');
}
