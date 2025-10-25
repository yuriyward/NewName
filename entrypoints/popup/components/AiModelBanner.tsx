import { Alert } from '@heroui/alert';
import type { AiModelId } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type { AiModelSetupState } from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import { PrimaryButton } from './PrimaryButton';

type AiModelBannerDetail = {
  id: AiModelId;
  description: string;
  requiresUserActivation: boolean;
};

interface AiModelBannerProps {
  visible: boolean;
  details: AiModelBannerDetail[];
  lastError: AiModelSetupState['lastError'] | null;
  onEnableAi: () => void;
}

const AiModelBanner = ({
  visible,
  details,
  lastError,
  onEnableAi,
}: AiModelBannerProps) => {
  if (!visible) return null;

  return (
    <Alert color="primary" variant="flat" className="mb-3 text-xs space-y-2">
      <div className="space-y-1">
        <p className="font-semibold text-primary-700">
          Enable AI-powered renaming
        </p>
        <p className="text-default-600">
          Phase 2 upgrades need Chrome&rsquo;s on-device models. Start the setup
          flow to download Gemini Nano.
        </p>
      </div>
      <ul className="list-disc pl-4 text-[11px] text-default-500 space-y-1">
        {details.map((item) => (
          <li key={item.id}>
            {item.description}
            {item.requiresUserActivation ? (
              <span className="ml-1 text-warning-600">
                (requires a recent click)
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {lastError ? (
        <p className="text-[11px] text-danger-600">
          Last attempt failed: {lastError.message}
          {lastError.occurredAt
            ? ` (${new Date(lastError.occurredAt).toLocaleTimeString()})`
            : ''}
        </p>
      ) : null}
      <PrimaryButton onClick={onEnableAi}>Enable AI models</PrimaryButton>
    </Alert>
  );
};

export default AiModelBanner;
