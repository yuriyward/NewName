/**
 * Success screen shown after folder access is granted
 */

import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import type { JSX } from 'react';

export function SuccessScreen(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-success-50 via-background to-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <div className="relative">
          <div className="absolute -inset-4 animate-pulse rounded-full bg-success-200/50" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success-500 text-white shadow-lg">
            <CheckCircleIcon className="h-12 w-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-success-700">All set! 🎉</h1>
          <p className="text-default-600">
            NewName can now organize your downloads.
          </p>
        </div>

        <p className="text-sm text-default-400">Closing...</p>
      </main>
    </div>
  );
}
