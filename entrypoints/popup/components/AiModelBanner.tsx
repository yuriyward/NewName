import { Alert } from '@heroui/alert';
import type { AiModelSetupState } from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import { PrimaryButton } from './PrimaryButton';

interface AiModelBannerProps {
  visible: boolean;
  lastError: AiModelSetupState['lastError'] | null;
  onEnableAi: () => void;
}

const AiModelBanner = ({
  visible,
  lastError,
  onEnableAi,
}: AiModelBannerProps) => {
  if (!visible) return null;

  return (
    <Alert color="primary" variant="flat" className="mb-3 text-xs space-y-2">
      <div className="space-y-1">
        <p className="font-semibold text-primary-700">
          ✨ Enable smarter file names
        </p>
        <p className="text-default-600">
          Get AI-powered suggestions that understand your files and give them
          meaningful names automatically.
        </p>
      </div>
      {lastError ? (
        <p className="text-[11px] text-danger-600">
          Setup issue: {lastError.message}
        </p>
      ) : null}
      <PrimaryButton onClick={onEnableAi}>Set up AI renaming</PrimaryButton>
    </Alert>
  );
};

export default AiModelBanner;
