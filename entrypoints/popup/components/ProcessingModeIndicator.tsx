import {
  CloudIcon,
  ComputerDesktopIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@heroui/tooltip';
import type { ProcessingMode } from '@/entrypoints/shared/settings/types';

interface ProcessingModeIndicatorProps {
  mode: ProcessingMode;
}

const MODE_CONFIG: Record<
  ProcessingMode,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  auto: {
    icon: SparklesIcon,
    label: 'Auto mode: Try local AI first, fall back to cloud if unavailable',
  },
  local: {
    icon: ComputerDesktopIcon,
    label: 'Local mode: Use on-device AI only',
  },
  cloud: {
    icon: CloudIcon,
    label: 'Cloud mode: Use cloud AI only',
  },
};

/**
 * Small indicator showing current AI processing mode with tooltip
 */
export const ProcessingModeIndicator: React.FC<
  ProcessingModeIndicatorProps
> = ({ mode }) => {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <Tooltip content={config.label} placement="bottom" delay={300}>
      <div className="flex items-center justify-center h-7 text-default-600">
        <Icon className="size-4" />
      </div>
    </Tooltip>
  );
};
