import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid';
import { Alert } from '@heroui/alert';
import { Divider } from '@heroui/divider';
import { Radio, RadioGroup } from '@heroui/radio';
import type { InstantBaselineStrategy } from '@/entrypoints/shared/settings/settings';
import { Skeleton } from '@/entrypoints/shared/ui/Skeleton';

interface StrategyOption {
  value: InstantBaselineStrategy;
  title: string;
  description: string;
}

interface StrategyTabProps {
  loading: boolean;
  saving: boolean;
  error: string | null;
  strategy: InstantBaselineStrategy | null;
  options: ReadonlyArray<StrategyOption>;
  onChange: (strategy: InstantBaselineStrategy) => void;
  aiEnabled: boolean;
  /** Called when user clicks a disabled AI option - opens settings to configure AI */
  onDisabledClick?: () => void;
}

/** Strategies that require AI to be enabled */
const AI_STRATEGIES: ReadonlyArray<InstantBaselineStrategy> = [
  'ai-rename',
  'original-with-date',
];

const StrategyTab = ({
  loading,
  saving,
  error,
  strategy,
  options,
  onChange,
  aiEnabled,
  onDisabledClick,
}: StrategyTabProps) => {
  if (loading) {
    return (
      <div className="space-y-2 pt-3">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="pt-3">
      {error && (
        <Alert color="danger" variant="flat" className="mb-3 text-xs">
          {error}
        </Alert>
      )}

      <p className="text-xs text-default-600 leading-relaxed mb-3">
        Choose how to rename downloads automatically.
      </p>

      <RadioGroup
        value={aiEnabled ? strategy || '' : 'keep-original'}
        onValueChange={(value) => onChange(value as InstantBaselineStrategy)}
        isDisabled={saving}
        className="mb-3"
      >
        {options.map((option) => {
          const requiresAi = AI_STRATEGIES.includes(option.value);
          const isDisabled = requiresAi && !aiEnabled;

          // For disabled options, wrap in a clickable div that opens settings
          if (isDisabled) {
            return (
              <button
                key={option.value}
                type="button"
                onClick={onDisabledClick}
                className="max-w-full m-0 bg-content1 items-start rounded-lg gap-3 p-2 border border-transparent opacity-60 hover:opacity-80 hover:bg-content2 cursor-pointer transition-opacity text-left flex w-full"
              >
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-default-300 flex-shrink-0" />
                <div className="ml-0 flex-1">
                  <span className="text-sm font-medium block">
                    {option.title}
                  </span>
                  <span className="text-xs text-primary mt-0.5 flex items-center gap-1">
                    <span>Configure AI to enable</span>
                    <ArrowTopRightOnSquareIcon className="size-3" />
                  </span>
                </div>
              </button>
            );
          }

          return (
            <Radio
              key={option.value}
              value={option.value}
              description={option.description}
              classNames={{
                base: 'max-w-full m-0 bg-content1 items-start rounded-lg gap-3 p-2 border border-transparent hover:bg-content2 cursor-pointer data-[selected=true]:border-primary data-[selected=true]:bg-primary-50',
                wrapper: 'mt-0.5',
                labelWrapper: 'ml-0',
                label: 'text-sm font-medium',
                description: 'text-xs text-default-500 mt-0.5',
              }}
            >
              {option.title}
            </Radio>
          );
        })}
      </RadioGroup>

      <Divider className="mb-2" />

      <footer>
        <p className="text-xs text-default-500 leading-relaxed">
          If it can't rename, saves with original name.
        </p>
      </footer>
    </div>
  );
};

export default StrategyTab;
