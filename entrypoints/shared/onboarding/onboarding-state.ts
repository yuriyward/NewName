/**
 * Persistence helpers for onboarding progress shared across extension contexts.
 */
import { getStorageAdapter } from '@/entrypoints/shared/settings/storage-state';

const ONBOARDING_STORAGE_KEY = 'local:onboarding-state.v1';

export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

export interface OnboardingState {
  status: OnboardingStatus;
  completedAt?: number;
  skippedAt?: number;
}

const DEFAULT_STATE: OnboardingState = {
  status: 'pending',
};

async function readState(): Promise<OnboardingState> {
  try {
    const stored =
      (await getStorageAdapter().getItem<OnboardingState>(
        ONBOARDING_STORAGE_KEY,
      )) ?? DEFAULT_STATE;
    const { status, completedAt, skippedAt } = stored;
    if (status === 'completed') {
      return {
        status: 'completed',
        completedAt: completedAt ?? Date.now(),
      };
    }
    if (status === 'skipped') {
      return {
        status: 'skipped',
        skippedAt: skippedAt ?? Date.now(),
      };
    }
    return DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: OnboardingState): Promise<void> {
  await getStorageAdapter().setItem(ONBOARDING_STORAGE_KEY, state);
}

export async function getOnboardingState(): Promise<OnboardingState> {
  return readState();
}

export async function markOnboardingCompleted(): Promise<void> {
  await writeState({
    status: 'completed',
    completedAt: Date.now(),
  });
}

export async function markOnboardingSkipped(): Promise<void> {
  await writeState({
    status: 'skipped',
    skippedAt: Date.now(),
  });
}

export async function resetOnboardingState(): Promise<void> {
  await writeState(DEFAULT_STATE);
}
