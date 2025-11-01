/**
 * Per-file-type processing preferences
 */

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@heroui/button';
import { Card } from '@heroui/card';
import { Select, SelectItem } from '@heroui/select';
import { useState } from 'react';
import { ensureLocalAiSetup } from '@/entrypoints/shared/integrations/chrome-ai/ensure-local-ai-setup';
import type {
  ProcessingMode,
  ProcessingPreferences,
} from '@/entrypoints/shared/settings/types';

interface ProcessingPreferencesProps {
  preferences: ProcessingPreferences;
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
  onUpdate,
}: ProcessingPreferencesProps) {
  const [showPerType, setShowPerType] = useState(
    preferences.usePerTypeOverrides,
  );

  const handleGlobalChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const mode = Array.from(keys)[0] as ProcessingMode;
    onUpdate({
      global: mode,
      // Always sync all types to global when global changes
      text: mode,
      pdf: mode,
      image: mode,
    });

    // Check if local AI setup is needed when selecting 'local' or 'auto'
    if (mode === 'local' || mode === 'auto') {
      void ensureLocalAiSetup();
    }
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
    onUpdate({ [type]: mode });

    // Check if local AI setup is needed when selecting 'local' or 'auto'
    if (mode === 'local' || mode === 'auto') {
      void ensureLocalAiSetup();
    }
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
            {modeOptions.map((option) => (
              <SelectItem key={option.value}>{option.label}</SelectItem>
            ))}
          </Select>
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
                {modeOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
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
                {modeOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
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
                {modeOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
