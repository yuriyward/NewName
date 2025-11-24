/**
 * Local AI Models section
 * Displays AI model status and provides access to model setup page
 * Only visible when local AI processing is enabled (auto or local mode)
 */

import { CpuChipIcon } from '@heroicons/react/24/outline';
import { Button } from '@heroui/button';
import { Card } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { useMemo } from 'react';
import { useAiModelStatus } from '@/entrypoints/popup/hooks/useAiModelStatus';
import { openAiModelSetupPage } from '@/entrypoints/shared/integrations/chrome-ai/ensure-local-ai-setup';
import type { ProcessingPreferences } from '@/entrypoints/shared/settings/types';

interface LocalAiModelSectionProps {
  preferences: ProcessingPreferences;
}

export function LocalAiModelSection({ preferences }: LocalAiModelSectionProps) {
  const { aiStatuses, aiStatusChecked, aiStatusError, aiBlockingModels } =
    useAiModelStatus();

  // Determine if local AI is being used
  const isLocalAiEnabled = useMemo(() => {
    if (!preferences.usePerTypeOverrides) {
      // Using global setting
      return preferences.global === 'auto' || preferences.global === 'local';
    }
    // Using per-type overrides - check if ANY type uses local
    return (
      preferences.text === 'auto' ||
      preferences.text === 'local' ||
      preferences.pdf === 'auto' ||
      preferences.pdf === 'local' ||
      preferences.image === 'auto' ||
      preferences.image === 'local'
    );
  }, [preferences]);

  // Don't render if local AI is not enabled
  if (!isLocalAiEnabled) {
    return null;
  }

  // Determine overall status
  const getStatusInfo = () => {
    if (!aiStatusChecked) {
      return {
        label: 'Checking...',
        color: 'default' as const,
        description: 'Checking AI model availability...',
      };
    }

    if (aiStatusError) {
      return {
        label: 'Error',
        color: 'danger' as const,
        description: aiStatusError,
      };
    }

    if (aiBlockingModels.length > 0) {
      const hasDownloading =
        aiStatuses &&
        aiBlockingModels.some((id) => aiStatuses[id].state === 'downloading');

      if (hasDownloading) {
        return {
          label: 'Downloading',
          color: 'primary' as const,
          description:
            'AI models are being downloaded. This may take a few minutes.',
        };
      }

      return {
        label: 'Setup Required',
        color: 'warning' as const,
        description: `${aiBlockingModels.length} model${aiBlockingModels.length > 1 ? 's' : ''} need${aiBlockingModels.length === 1 ? 's' : ''} to be downloaded.`,
      };
    }

    return {
      label: 'Ready',
      color: 'success' as const,
      description: 'All AI models are ready for local processing.',
    };
  };

  const statusInfo = getStatusInfo();

  const handleOpenSetup = async () => {
    await openAiModelSetupPage();
  };

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold mb-1">Local AI Models</h2>
        <p className="text-xs text-default-600 mb-2">
          Manage on-device AI models for local processing.
        </p>
      </div>

      <Card className="p-2.5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1">
            <CpuChipIcon className="w-5 h-5 text-default-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">Model Status</p>
                <Chip size="sm" color={statusInfo.color} variant="flat">
                  {statusInfo.label}
                </Chip>
              </div>
              <p className="text-xs text-default-600">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>

        <Button
          onPress={handleOpenSetup}
          size="sm"
          variant="flat"
          color="primary"
          className="w-full"
        >
          Manage AI Models
        </Button>
      </Card>
    </div>
  );
}
