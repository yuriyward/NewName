/**
 * Helper for coordinating the Chrome downloads suggest callback with timeouts.
 */
import { SUGGEST_TIMEOUT_MS } from '@/entrypoints/shared/integrations/mediainfo/constants';

export interface SuggestController<SuggestPayload> {
  trySuggest(payload?: SuggestPayload): boolean;
  ensureDefault(): void;
  finish(): void;
}

export function createSuggestController<SuggestPayload>(
  suggest: (payload?: SuggestPayload) => void,
  timeoutMs = SUGGEST_TIMEOUT_MS,
): SuggestController<SuggestPayload> {
  let resolved = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    try {
      suggest();
    } catch (error) {
      console.warn('Suggest callback failed after timeout', error);
    }
  }, timeoutMs);

  function clearTimer() {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  return {
    trySuggest(payload) {
      if (resolved) return false;
      try {
        if (payload !== undefined) {
          suggest(payload);
        } else {
          suggest();
        }
        resolved = true;
        clearTimer();
        return true;
      } catch (error) {
        resolved = true;
        clearTimer();
        throw error;
      }
    },
    ensureDefault() {
      if (resolved) return;
      try {
        suggest();
      } catch (error) {
        console.warn('Suggest callback failed during fallback', error);
      } finally {
        resolved = true;
        clearTimer();
      }
    },
    finish() {
      if (resolved) return;
      resolved = true;
      clearTimer();
    },
  } as SuggestController<SuggestPayload>;
}
