import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import { type JSX, useState } from 'react';

interface CopyableUrlProps {
  url: string;
  label?: string;
}

export function CopyableUrl({ url, label }: CopyableUrlProps): JSX.Element {
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
      {label && <p className="text-xs font-medium text-primary-700">{label}</p>}
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-primary-100 px-2 py-1 text-xs font-mono text-primary-900 break-all">
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
