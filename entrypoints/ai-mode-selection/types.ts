/**
 * Type definitions for AI mode selection page
 */

import type { PageContextConsent } from '@/entrypoints/shared/settings/types';

/**
 * User's AI processing choice
 * - 'local': Use only local Chrome AI (Gemini Nano)
 * - 'cloud': Use only cloud AI services
 * - 'manual': User wants to configure manually later
 */
export type AiChoice = 'local' | 'cloud' | 'manual';

/**
 * State machine for the AI mode selection page
 * Uses discriminated union for type-safe state handling
 */
export type PageState =
  | { status: 'loading' }
  | { status: 'ready'; ramGB: number }
  | { status: 'navigating'; choice: AiChoice }
  | { status: 'error'; message: string };

/**
 * State for the page context consent modal
 * Tracks whether the modal is open and which choice triggered it
 */
export interface ConsentModalState {
  /** Whether the consent modal is currently displayed */
  isOpen: boolean;
  /** The AI choice that triggered the modal (null if closed) */
  pendingChoice: 'local' | 'cloud' | null;
}

/**
 * Re-export PageContextConsent for convenience
 */
export type { PageContextConsent };
