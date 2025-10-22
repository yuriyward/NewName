import { Alert } from '@heroui/alert';
import { Divider } from '@heroui/divider';
import { Radio, RadioGroup } from '@heroui/radio';
import { Skeleton } from '@heroui/skeleton';
import type { InstantBaselineStrategy } from '@/entrypoints/shared/settings/settings';

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
}

const StrategyTab = ({
  loading,
  saving,
  error,
  strategy,
  options,
  onChange,
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
        value={strategy || ''}
        onValueChange={(value) => onChange(value as InstantBaselineStrategy)}
        isDisabled={saving}
        className="mb-3"
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            description={option.description}
            classNames={{
              base: 'max-w-full m-0 bg-content1 hover:bg-content2 items-start cursor-pointer rounded-lg gap-3 p-2 border border-transparent data-[selected=true]:border-primary data-[selected=true]:bg-primary-50',
              wrapper: 'mt-0.5',
              labelWrapper: 'ml-0',
              label: 'text-sm font-medium',
              description: 'text-xs text-default-500 mt-0.5',
            }}
          >
            {option.title}
          </Radio>
        ))}
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
