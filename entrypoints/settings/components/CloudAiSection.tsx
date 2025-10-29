/**
 * Cloud AI configuration section
 */
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/16/solid';
import { Button } from '@heroui/button';
import { Card } from '@heroui/card';
import { Checkbox } from '@heroui/checkbox';
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
import { useState } from 'react';
import type {
  CloudModel,
  CloudSettings,
} from '@/entrypoints/shared/settings/types';

interface CloudAiSectionProps {
  cloudSettings: CloudSettings;
  onUpdate: (settings: Partial<CloudSettings>) => void;
}

export function CloudAiSection({
  cloudSettings,
  onUpdate,
}: CloudAiSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const handleEnableToggle = (enabled: boolean) => {
    if (enabled && !cloudSettings.consentGiven) {
      setShowConsent(true);
    } else {
      onUpdate({ enabled });
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
    </div>
  );
}
