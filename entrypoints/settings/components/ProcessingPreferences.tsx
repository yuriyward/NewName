/**
 * Per-file-type processing preferences
 */

import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@heroui/button';
import { Card } from '@heroui/card';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/modal';
import { Select, SelectItem } from '@heroui/select';
import { Tooltip } from '@heroui/tooltip';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { isLocalAiSetupNeeded } from '@/entrypoints/shared/integrations/chrome-ai/ensure-local-ai-setup';
import {
  getDisabledReason,
  validateModeChange,
} from '@/entrypoints/shared/settings/processing-mode-validator';
import type {
  ProcessingMode,
  ProcessingPreferences,
} from '@/entrypoints/shared/settings/types';

interface ProcessingPreferencesProps {
  preferences: ProcessingPreferences;
  cloudEnabled: boolean;
  /** API key for cloud processing (null if not configured) */
  cloudApiKey: string | null;
  onUpdate: (preferences: Partial<ProcessingPreferences>) => void;
}

const modeOptions: Array<{
  value: ProcessingMode;
  label: string;
  description: string;
}> = [
  {
    value: 'auto',
    label: 'Auto (Local → Cloud)',
    description: 'Try local AI first, fall back to cloud if unavailable',
  },
  {
    value: 'local',
    label: 'Local Only',
    description: 'Only use on-device AI (Chrome built-in)',
  },
  {
    value: 'cloud',
    label: 'Cloud Only',
    description: 'Always use cloud AI (requires API key)',
  },
];

export function ProcessingPreferencesSection({
  preferences,
  cloudEnabled,
  cloudApiKey,
  onUpdate,
}: ProcessingPreferencesProps) {
  const [showPerType, setShowPerType] = useState(
    preferences.usePerTypeOverrides,
  );
  const [localAiReady, setLocalAiReady] = useState(true); // Optimistic default
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<ProcessingMode | null>(null);

  // Check local AI readiness on mount
  useEffect(() => {
    void (async () => {
      try {
        const needsSetup = await isLocalAiSetupNeeded();
        setLocalAiReady(!needsSetup);
      } catch {
        // If check fails, assume ready to avoid blocking user
        setLocalAiReady(true);
      }
    })();
  }, []);

  // Determine if cloud mode is selected but missing API key
  const isCloudModeWithoutApiKey =
    preferences.global === 'cloud' && cloudEnabled && !cloudApiKey;

  const handleGlobalChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const mode = Array.from(keys)[0] as ProcessingMode;

    // Validate the mode change
    const validation = validateModeChange(mode, cloudEnabled, localAiReady);

    if (!validation.canProceed) {
      if (validation.requiresSetupModal) {
        // Show setup modal, save pending mode
        setPendingMode(mode);
        setShowSetupModal(true);
      }
      // Mode change blocked, don't update
      return;
    }

    // Mode change allowed
    onUpdate({
      global: mode,
      // Always sync all types to global when global changes
      text: mode,
      pdf: mode,
      image: mode,
    });
  };

  const handleTogglePerType = () => {
    const newValue = !showPerType;
    setShowPerType(newValue);
    onUpdate({
      usePerTypeOverrides: newValue,
      // When enabling per-type, initialize all to current global value
      // When disabling per-type, sync all to global
      text: preferences.global,
      pdf: preferences.global,
      image: preferences.global,
    });
  };

  const handleTypeChange = (
    type: 'text' | 'pdf' | 'image',
    keys: 'all' | Set<React.Key>,
  ) => {
    if (keys === 'all') return;
    const mode = Array.from(keys)[0] as ProcessingMode;

    // Validate the mode change
    const validation = validateModeChange(mode, cloudEnabled, localAiReady);

    if (!validation.canProceed) {
      if (validation.requiresSetupModal) {
        // Show setup modal, save pending mode
        setPendingMode(mode);
        setShowSetupModal(true);
      }
      // Mode change blocked, don't update
      return;
    }

    // Mode change allowed
    onUpdate({ [type]: mode });
  };

  const handleOpenSetup = async () => {
    setShowSetupModal(false);
    // Open setup page
    await browser.tabs.create({
      url: browser.runtime.getURL('/ai-model-setup.html'),
    });
  };

  const handleCancelSetup = () => {
    setShowSetupModal(false);
    setPendingMode(null);
  };

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold mb-1">Processing Preferences</h2>
        <p className="text-xs text-default-600 mb-2">
          Choose how files should be processed by AI.
        </p>
      </div>

      <div className="space-y-3">
        {/* Global Setting */}
        <Card className="p-2.5">
          <Select
            label="All Files"
            selectedKeys={[preferences.global]}
            onSelectionChange={handleGlobalChange}
            description={
              modeOptions.find((o) => o.value === preferences.global)
                ?.description
            }
            size="sm"
            disallowEmptySelection
          >
            {modeOptions.map((option) => {
              const disabledReason = getDisabledReason(
                option.value,
                cloudEnabled,
                localAiReady,
              );
              const isDisabled = !!disabledReason;

              return (
                <SelectItem
                  key={option.value}
                  isDisabled={isDisabled}
                  title={isDisabled ? disabledReason : undefined}
                  textValue={option.label}
                >
                  <Tooltip
                    content={disabledReason}
                    isDisabled={!isDisabled}
                    placement="right"
                  >
                    <div>{option.label}</div>
                  </Tooltip>
                </SelectItem>
              );
            })}
          </Select>

          {/* Warning when cloud mode selected without API key */}
          {isCloudModeWithoutApiKey && (
            <p className="text-xs text-warning-600 mt-1.5 flex items-center gap-1">
              <ExclamationTriangleIcon className="size-3.5 flex-shrink-0" />
              <span>Add your API key above to enable cloud processing.</span>
            </p>
          )}
        </Card>

        {/* Advanced Per-Type Toggle */}
        <Button
          variant="light"
          size="sm"
          onClick={handleTogglePerType}
          startContent={
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${showPerType ? 'rotate-180' : ''}`}
            />
          }
          className="justify-start"
        >
          Advanced: Per-File-Type Settings
        </Button>

        {/* Per-Type Settings (Collapsible) */}
        {showPerType && (
          <div className="space-y-2 pl-4 border-l-2 border-default-200">
            {/* Text Files */}
            <Card className="p-2.5">
              <Select
                label="Text Files"
                selectedKeys={[
                  preferences.usePerTypeOverrides
                    ? preferences.text
                    : preferences.global,
                ]}
                onSelectionChange={(keys) => handleTypeChange('text', keys)}
                description={
                  modeOptions.find(
                    (o) =>
                      o.value ===
                      (preferences.usePerTypeOverrides
                        ? preferences.text
                        : preferences.global),
                  )?.description
                }
                size="sm"
                disallowEmptySelection
                isDisabled={!preferences.usePerTypeOverrides}
              >
                {modeOptions.map((option) => {
                  const disabledReason = getDisabledReason(
                    option.value,
                    cloudEnabled,
                    localAiReady,
                  );
                  const isDisabled = !!disabledReason;

                  return (
                    <SelectItem
                      key={option.value}
                      isDisabled={isDisabled}
                      title={isDisabled ? disabledReason : undefined}
                      textValue={option.label}
                    >
                      <Tooltip
                        content={disabledReason}
                        isDisabled={!isDisabled}
                        placement="right"
                      >
                        <div>{option.label}</div>
                      </Tooltip>
                    </SelectItem>
                  );
                })}
              </Select>
            </Card>

            {/* PDF Files */}
            <Card className="p-2.5">
              <Select
                label="PDF Files"
                selectedKeys={[
                  preferences.usePerTypeOverrides
                    ? preferences.pdf
                    : preferences.global,
                ]}
                onSelectionChange={(keys) => handleTypeChange('pdf', keys)}
                description={
                  modeOptions.find(
                    (o) =>
                      o.value ===
                      (preferences.usePerTypeOverrides
                        ? preferences.pdf
                        : preferences.global),
                  )?.description
                }
                size="sm"
                disallowEmptySelection
                isDisabled={!preferences.usePerTypeOverrides}
              >
                {modeOptions.map((option) => {
                  const disabledReason = getDisabledReason(
                    option.value,
                    cloudEnabled,
                    localAiReady,
                  );
                  const isDisabled = !!disabledReason;

                  return (
                    <SelectItem
                      key={option.value}
                      isDisabled={isDisabled}
                      title={isDisabled ? disabledReason : undefined}
                      textValue={option.label}
                    >
                      <Tooltip
                        content={disabledReason}
                        isDisabled={!isDisabled}
                        placement="right"
                      >
                        <div>{option.label}</div>
                      </Tooltip>
                    </SelectItem>
                  );
                })}
              </Select>
            </Card>

            {/* Image Files */}
            <Card className="p-2.5">
              <Select
                label="Image Files"
                selectedKeys={[
                  preferences.usePerTypeOverrides
                    ? preferences.image
                    : preferences.global,
                ]}
                onSelectionChange={(keys) => handleTypeChange('image', keys)}
                description={
                  modeOptions.find(
                    (o) =>
                      o.value ===
                      (preferences.usePerTypeOverrides
                        ? preferences.image
                        : preferences.global),
                  )?.description
                }
                size="sm"
                disallowEmptySelection
                isDisabled={!preferences.usePerTypeOverrides}
              >
                {modeOptions.map((option) => {
                  const disabledReason = getDisabledReason(
                    option.value,
                    cloudEnabled,
                    localAiReady,
                  );
                  const isDisabled = !!disabledReason;

                  return (
                    <SelectItem
                      key={option.value}
                      isDisabled={isDisabled}
                      title={isDisabled ? disabledReason : undefined}
                      textValue={option.label}
                    >
                      <Tooltip
                        content={disabledReason}
                        isDisabled={!isDisabled}
                        placement="right"
                      >
                        <div>{option.label}</div>
                      </Tooltip>
                    </SelectItem>
                  );
                })}
              </Select>
            </Card>
          </div>
        )}
      </div>

      {/* Local AI Setup Required Modal */}
      <Modal isOpen={showSetupModal} onClose={handleCancelSetup} size="md">
        <ModalContent>
          <ModalHeader className="text-base">
            Local AI Setup Required
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              {pendingMode === 'local' ? 'Local Only' : 'Auto'} mode requires
              Chrome's built-in AI models to be downloaded and ready. Would you
              like to open the setup page now?
            </p>
            <p className="text-xs text-default-500 mt-2">
              You can complete the setup and return to this page to change the
              processing mode.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={handleCancelSetup}
              size="sm"
            >
              Cancel
            </Button>
            <Button color="primary" onPress={handleOpenSetup} size="sm">
              Open Setup Page
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
