/**
 * Debug logging utilities for media analysis pipeline
 */
import type { DebugLevel } from '@/entrypoints/shared/settings/settings';

export interface MediaDebugSettings {
  readonly enabled: boolean;
  readonly level: DebugLevel;
}

export function logMediaDebug(
  debug: MediaDebugSettings | undefined,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!debug?.enabled) return;

  const prefix = `[NewName Debug][Media] ${event}`;
  switch (debug.level) {
    case 'verbose':
      console.group(prefix);
      if (data) {
        for (const [key, value] of Object.entries(data)) {
          console.log(key, value);
        }
      }
      console.groupEnd();
      break;
    case 'detailed':
      console.log(prefix, data ?? {});
      break;
    default:
      console.log(prefix);
      break;
  }
}
