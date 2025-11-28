/**
 * Error message display component
 */

import type { JSX } from 'react';

interface ErrorMessageProps {
  message: string;
  hint?: string;
}

export function ErrorMessage({
  message,
  hint,
}: ErrorMessageProps): JSX.Element {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <span className="text-lg">💡</span>
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {message}
          </p>
          {hint && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
