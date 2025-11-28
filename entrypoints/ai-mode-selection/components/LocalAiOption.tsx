import type { JSX } from 'react';
import { LoadingSpinner } from '@/entrypoints/shared/ui/LoadingSpinner';

interface LocalAiOptionProps {
  recommended: boolean;
  ramGB: number;
  meetsRamRequirement: boolean;
  onSelect: () => void;
  disabled: boolean;
  loading: boolean;
}

export function LocalAiOption({
  recommended,
  ramGB,
  meetsRamRequirement,
  onSelect,
  disabled,
  loading,
}: LocalAiOptionProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative flex flex-col gap-4 rounded-2xl border-2 p-6 text-left transition-all
        ${
          recommended
            ? 'border-primary-500 bg-primary-50/50'
            : 'border-default-200 bg-white hover:border-primary-300'
        }
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-lg'}
      `}
    >
      {recommended && (
        <div className="absolute right-4 top-4 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
          Recommended
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Local AI</h3>
        <p className="text-sm text-default-600">
          On-device processing with Chrome's built-in AI
        </p>
      </div>

      <ul className="space-y-2 text-sm text-default-700">
        <li>✓ Private & fast</li>
        <li>✓ Free - no API costs</li>
        <li>✓ Requires ~3GB download</li>
        <li>
          {meetsRamRequirement ? '✓' : '•'} 16GB+ RAM
          {ramGB > 0 && (
            <span className="ml-1 text-default-500">({ramGB}GB detected)</span>
          )}
        </li>
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
