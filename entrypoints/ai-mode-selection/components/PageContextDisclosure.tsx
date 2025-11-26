import { type JSX, useId } from 'react';

export interface PageContextDisclosureProps {
  consentGranted: boolean;
  onConsentChange: (granted: boolean) => void;
}

/**
 * Data access consent disclosure component
 * Displays comprehensive information about what data the extension accesses
 * Required for Chrome Web Store compliance
 */
export function PageContextDisclosure({
  consentGranted,
  onConsentChange,
}: PageContextDisclosureProps): JSX.Element {
  const checkboxId = useId();

  return (
    <div className="rounded-xl border border-default-200 bg-default-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-default-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>Information</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-xs font-medium text-default-600">Data Access</h3>
        <span className="text-[10px] font-medium text-danger-600 bg-danger-50 px-1 py-0.5 rounded">
          Required
        </span>
      </div>

      <ul className="space-y-1 text-xs text-default-500 pl-6">
        <li className="flex items-center gap-1.5">
          <span className="text-primary-400">✓</span>
          <span>Reads page title and downloaded file content</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="text-primary-400">✓</span>
          <span>Processed on your device, never stored</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="text-primary-400">✓</span>
          <span>Nothing sent online with local AI</span>
        </li>
      </ul>

      <label
        htmlFor={checkboxId}
        className="flex items-center gap-2 cursor-pointer group pt-2 border-t border-default-100"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={consentGranted}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
        />
        <span className="text-xs text-default-600 group-hover:text-primary-600 transition-colors">
          I agree to let NewName read page info and downloads for AI renaming
          <span className="text-danger-500 ml-0.5">*</span>
        </span>
      </label>
    </div>
  );
}
