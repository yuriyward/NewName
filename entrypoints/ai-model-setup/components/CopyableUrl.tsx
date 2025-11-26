import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import { type JSX, useState } from 'react';

interface CopyableUrlProps {
  url: string;
  label?: string;
  setting?: string;
}

export function CopyableUrl({
  url,
  label,
  setting,
}: CopyableUrlProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        {label && (
          <p className="text-xs font-medium text-primary-700">{label}</p>
        )}
        {setting && (
          <p className="text-xs font-semibold text-success-700">
            Set to: {setting}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-primary-100 px-2 py-1 font-mono text-xs text-primary-900">
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex flex-shrink-0 items-center justify-center rounded-full border border-primary-400 bg-white px-2 py-1 text-primary-700 transition hover:bg-primary-50"
          title="Copy to clipboard"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <ClipboardDocumentIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
