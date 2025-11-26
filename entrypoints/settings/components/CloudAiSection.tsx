/**
 * Cloud AI configuration section
 */
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/16/solid';
import { Button } from '@heroui/button';
import { Card } from '@heroui/card';
import { Checkbox } from '@heroui/checkbox';
import { Chip } from '@heroui/chip';
import { Input } from '@heroui/input';
import { Link } from '@heroui/link';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/modal';
import { Select, SelectItem } from '@heroui/select';
import { useEffect, useState } from 'react';
import { testCloudConnection } from '@/entrypoints/shared/integrations/ai-provider/cloud-connection-test';
import { canDisableCloud } from '@/entrypoints/shared/settings/processing-mode-validator';
import { disableCloudAndResetProcessingModes } from '@/entrypoints/shared/settings/settings';
import type {
  CloudModel,
  CloudSettings,
  ProcessingPreferences,
} from '@/entrypoints/shared/settings/types';
import { validateGeminiApiKeyFormat } from '@/entrypoints/shared/settings/validation';

interface CloudAiSectionProps {
  cloudSettings: CloudSettings;
  processingPreferences: ProcessingPreferences;
  onUpdate: (settings: Partial<CloudSettings>) => void;
}

export function CloudAiSection({
  cloudSettings,
  processingPreferences,
  onUpdate,
}: CloudAiSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | null;
    message?: string;
  }>({ status: null });

  const handleEnableToggle = (enabled: boolean) => {
    if (enabled && !cloudSettings.consentGiven) {
      // Enabling: show consent modal
      setShowConsent(true);
    } else if (!enabled) {
      // Disabling: check if confirmation needed
      const validation = canDisableCloud(processingPreferences);
      if (validation.requiresConfirmation) {
        setShowDisableConfirm(true);
      } else {
        // Can disable without confirmation
        onUpdate({ enabled: false });
      }
    } else {
      // Re-enabling with existing consent
      onUpdate({ enabled: true });
    }
  };

  const handleConsentGiven = () => {
    onUpdate({
      enabled: true,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });
    setShowConsent(false);
  };

  const handleConfirmDisable = async () => {
    // Atomically disable cloud and switch all modes to 'local'
    // This ensures both updates happen in a single storage write
    await disableCloudAndResetProcessingModes();
    setShowDisableConfirm(false);
  };

  const handleCancelDisable = () => {
    setShowDisableConfirm(false);
  };

  // Clear test result when API key or model changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally want to re-run when these values change
  useEffect(() => {
    setTestResult({ status: null });
  }, [cloudSettings.apiKey, cloudSettings.model]);

  const handleTestConnection = async () => {
    if (!cloudSettings.apiKey) {
      setTestResult({
        status: 'error',
        message: 'Please enter an API key first',
      });
      return;
    }

    // Check format before making API call
    if (!validateGeminiApiKeyFormat(cloudSettings.apiKey)) {
      setTestResult({
        status: 'error',
        message:
          'Invalid API key format. Key should start with "AIza" and be 35-45 characters.',
      });
      return;
    }

    setTesting(true);
    setTestResult({ status: null });

    const result = await testCloudConnection(
      cloudSettings.apiKey,
      cloudSettings.model,
    );

    setTesting(false);
    setTestResult({
      status: result.success ? 'success' : 'error',
      message: result.success ? 'Connection successful!' : result.error,
    });

    // Store test result in settings
    if (result.success) {
      onUpdate({
        lastTestTimestamp: Date.now(),
        lastTestSuccess: true,
      });
    } else {
      onUpdate({
        lastTestSuccess: false,
      });
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold mb-1">Cloud AI Processing</h2>
        <p className="text-xs text-default-600 mb-2">
          Enable cloud-based AI processing as a fallback when local AI is
          unavailable.
        </p>
      </div>

      <Card className="p-2.5 space-y-2.5">
        <Checkbox
          isSelected={cloudSettings.enabled}
          onValueChange={handleEnableToggle}
          size="sm"
          classNames={{
            label: 'text-sm',
          }}
        >
          <div>
            <p className="text-sm font-medium">Enable Cloud AI</p>
            <p className="text-xs text-default-600">
              Use cloud processing when local AI is unavailable
            </p>
          </div>
        </Checkbox>

        {cloudSettings.enabled && (
          <>
            <Input
              label="API Key"
              type={showApiKey ? 'text' : 'password'}
              value={cloudSettings.apiKey || ''}
              onValueChange={(value) => onUpdate({ apiKey: value })}
              placeholder="Enter your Gemini API key"
              size="sm"
              description={
                <>
                  Get your API key from{' '}
                  <Link
                    href="https://aistudio.google.com/app/apikey"
                    isExternal
                    size="sm"
                  >
                    Google AI Studio
                  </Link>
                </>
              }
              endContent={
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="focus:outline-none"
                >
                  {showApiKey ? (
                    <EyeSlashIcon className="size-4 text-default-400" />
                  ) : (
                    <EyeIcon className="size-4 text-default-400" />
                  )}
                </button>
              }
            />

            <Select
              label="Model"
              selectedKeys={[cloudSettings.model]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as CloudModel;
                onUpdate({ model: value });
              }}
              size="sm"
              disallowEmptySelection
            >
              <SelectItem key="gemini-flash-lite-latest">
                Gemini Flash Lite (Latest)
              </SelectItem>
              <SelectItem key="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                onPress={handleTestConnection}
                isDisabled={!cloudSettings.apiKey || testing}
                isLoading={testing}
              >
                Test Connection
              </Button>

              {testResult.status && (
                <Chip
                  color={testResult.status === 'success' ? 'success' : 'danger'}
                  variant="flat"
                  size="sm"
                >
                  {testResult.message}
                </Chip>
              )}
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={showConsent}
        onClose={() => setShowConsent(false)}
        size="md"
      >
        <ModalContent>
          <ModalHeader className="text-base">
            Cloud Processing Consent
          </ModalHeader>
          <ModalBody>
            <div className="space-y-1.5 text-xs">
              <p className="text-sm">By enabling cloud AI, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-default-600">
                <li>Send file content (text, images) to Google's servers</li>
                <li>Data is sent via secure HTTPS connection</li>
                <li>Only processed data is sent (never raw files)</li>
                <li>Google's Gemini API privacy policy applies</li>
              </ul>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={() => setShowConsent(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button color="primary" onPress={handleConsentGiven} size="sm">
              I Understand
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={showDisableConfirm}
        onClose={handleCancelDisable}
        size="md"
      >
        <ModalContent>
          <ModalHeader className="text-base">
            Confirm Cloud AI Disable
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              You have processing modes set to 'Cloud' or 'Auto'. Disabling
              cloud AI will switch all processing modes to 'Local Only'.
            </p>
            <p className="text-xs text-default-500 mt-2">
              Make sure local AI models are set up, or files won't be processed.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={handleCancelDisable}
              size="sm"
            >
              Cancel
            </Button>
            <Button color="primary" onPress={handleConfirmDisable} size="sm">
              Switch to Local & Disable
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
