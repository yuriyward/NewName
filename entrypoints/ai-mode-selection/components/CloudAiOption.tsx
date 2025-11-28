import type { JSX } from 'react';
import { LoadingSpinner } from '@/entrypoints/shared/ui/LoadingSpinner';

interface CloudAiOptionProps {
  recommended: boolean;
  onSelect: () => void;
  disabled: boolean;
  loading: boolean;
}

export function CloudAiOption({
  recommended,
  onSelect,
  disabled,
  loading,
}: CloudAiOptionProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative flex flex-col gap-4 rounded-2xl border-2 p-6 text-left transition-all
        ${
          recommended
            ? 'border-primary-500 bg-primary-50/50 dark:border-primary-400 dark:bg-primary-500/15 hover:bg-primary-100/60 dark:hover:bg-primary-500/25 hover:border-primary-600 dark:hover:border-primary-300'
            : 'border-content3 bg-content1 hover:border-primary-300 dark:hover:border-primary-400 hover:bg-content2'
        }
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-lg dark:hover:shadow-primary-500/20'}
      `}
    >
      {recommended && (
        <div className="absolute right-4 top-4 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
          Recommended
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Cloud AI</h3>
        <p className="text-sm text-default-600">Google Gemini (cloud-based)</p>
      </div>

      <ul className="space-y-2 text-sm text-default-700">
        <li>✓ Works on any system</li>
        <li>✓ No downloads needed</li>
        <li>• Requires API key</li>
        <li>• Pay-per-use</li>
      </ul>

      {loading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-primary-600">
          <LoadingSpinner size="sm" label="Setting up" />
          Setting up...
        </div>
      )}
    </button>
  );
}
