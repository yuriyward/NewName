/**
 * Step 1 complete message component
 */

import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import type { JSX } from 'react';

export function Step1CompleteMessage(): JSX.Element {
  return (
    <div className="mb-4 rounded-2xl border border-success-200 bg-success-50 p-3.5 dark:border-success-800 dark:bg-success-950/50">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/50 dark:text-success-400">
          <CheckCircleIcon className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-success-900 dark:text-success-200">
            Step 1 done!
          </p>
          <p className="text-sm text-success-700 dark:text-success-400">
            A new tab will open for step 2. If not, close this and click the
            extension icon.
          </p>
        </div>
      </div>
    </div>
  );
}
