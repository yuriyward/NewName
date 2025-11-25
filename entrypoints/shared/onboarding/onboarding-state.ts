/**
 * Persistence helpers for onboarding progress shared across extension contexts.
 */
import { getStorageAdapter } from '@/entrypoints/shared/settings/storage-state';

const ONBOARDING_STORAGE_KEY = 'local:onboarding-state.v1';

/**
 * Only new installs after this date see AI mode selection screen.
 * Existing users (installed before this date) skip the selection screen.
 */
export const AI_MODE_SELECTION_FEATURE_DATE = new Date('2025-11-25').getTime();

/**
 * Two-step onboarding flow for Downloads access:
 * 1. pending → awaiting-persistent once the user picks a directory and Chrome needs a new tab
 *    to request persistent permission.
 * 2. awaiting-persistent → completed when the follow-up tab verifies persistent permission.
 * Users can also take shortcuts:
 * - pending → completed when an existing directory handle is restored successfully.
 * - pending/awaiting-persistent → skipped if the user explicitly opts out.
 * completed and skipped are terminal states (except for tests calling reset).
 */
export type OnboardingStatus =
  | 'pending'
  | 'awaiting-persistent'
  | 'completed'
  | 'skipped';

export interface OnboardingState {
  status: OnboardingStatus;
  completedAt?: number;
  skippedAt?: number;
  awaitingPersistentAt?: number;
  aiModeSelected?: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  status: 'pending',
};

const VALID_TRANSITIONS: Record<
  OnboardingStatus,
  ReadonlySet<OnboardingStatus>
> = {
  pending: new Set<OnboardingStatus>([
    'awaiting-persistent',
    'completed',
    'skipped',
  ]),
  'awaiting-persistent': new Set<OnboardingStatus>(['completed', 'skipped']),
  completed: new Set<OnboardingStatus>(),
  skipped: new Set<OnboardingStatus>(),
};

function canTransition(from: OnboardingStatus, to: OnboardingStatus): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

async function readState(): Promise<OnboardingState> {
  try {
    const stored =
      (await getStorageAdapter().getItem<OnboardingState>(
        ONBOARDING_STORAGE_KEY,
      )) ?? DEFAULT_STATE;
    const {
      status,
      completedAt,
      skippedAt,
      awaitingPersistentAt,
      aiModeSelected,
    } = stored;
    if (status === 'completed') {
      return {
        status: 'completed',
        completedAt: completedAt ?? Date.now(),
        aiModeSelected,
      };
    }
    if (status === 'skipped') {
      return {
        status: 'skipped',
        skippedAt: skippedAt ?? Date.now(),
        aiModeSelected,
      };
    }
    if (status === 'awaiting-persistent') {
      return {
        status: 'awaiting-persistent',
        awaitingPersistentAt: awaitingPersistentAt ?? Date.now(),
        aiModeSelected,
      };
    }
    return { ...DEFAULT_STATE, aiModeSelected };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: OnboardingState): Promise<void> {
  await getStorageAdapter().setItem(ONBOARDING_STORAGE_KEY, state);
}

async function transitionState(
  targetStatus: OnboardingStatus,
  buildState: () => OnboardingState,
): Promise<void> {
  const current = await readState();
  if (current.status === targetStatus) {
    return;
  }
  if (!canTransition(current.status, targetStatus)) {
    throw new Error(
      `[OnboardingState] Invalid transition from ${current.status} to ${targetStatus}`,
    );
  }
  await writeState(buildState());
}

export async function getOnboardingState(): Promise<OnboardingState> {
  return readState();
}

export async function markOnboardingCompleted(): Promise<void> {
  await transitionState('completed', () => ({
    status: 'completed',
    completedAt: Date.now(),
  }));
}

export async function markOnboardingAwaitingPersistent(): Promise<void> {
  await transitionState('awaiting-persistent', () => ({
    status: 'awaiting-persistent',
    awaitingPersistentAt: Date.now(),
  }));
}

export async function markOnboardingSkipped(): Promise<void> {
  await transitionState('skipped', () => ({
    status: 'skipped',
    skippedAt: Date.now(),
  }));
}

export async function resetOnboardingState(): Promise<void> {
  await writeState(DEFAULT_STATE);
}

/**
 * Mark that the user has selected an AI processing mode (local or cloud).
 * This prevents showing the AI mode selection screen again.
 */
export async function markAiModeSelected(): Promise<void> {
  const current = await readState();
  await writeState({ ...current, aiModeSelected: true });
}

/**
 * Check if the user has already selected an AI processing mode.
 */
export async function hasSelectedAiMode(): Promise<boolean> {
  const state = await readState();
  return state.aiModeSelected === true;
}
