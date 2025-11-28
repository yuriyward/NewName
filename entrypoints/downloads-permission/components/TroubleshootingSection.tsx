/**
 * Troubleshooting help section shown on error
 */

import type { JSX } from 'react';

export function TroubleshootingSection(): JSX.Element {
  return (
    <details className="rounded-2xl border border-default-200 bg-default-50/50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-default-600 hover:text-default-900">
        Need help?
      </summary>
      <div className="space-y-2 border-t border-default-200 px-4 py-3 text-sm text-default-600">
        <p className="font-medium">If Chrome blocked access:</p>
        <ol className="list-inside list-decimal space-y-1.5 text-default-500">
          <li>Click the padlock icon in the address bar</li>
          <li>Go to Site settings</li>
          <li>Set File system access to Allow</li>
          <li>Try again</li>
        </ol>
      </div>
    </details>
  );
}
