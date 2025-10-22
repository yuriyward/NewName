import {
  CheckIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  SparklesIcon,
} from '@heroicons/react/16/solid';
import type React from 'react';
import { useEffect, useState } from 'react';
import { filenameVariants } from './mocks/notification-data';
import { FilenameDisplay } from './utils/filename-truncation';

// Filename Length Preset Toggles
export const FilenamePresetToggles = ({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (preset: string) => void;
}) => (
  <div className="flex gap-2 flex-wrap">
    {Object.keys(filenameVariants).map((preset) => (
      <button
        key={preset}
        type="button"
        onClick={() => onChange(preset)}
        className={`heroui-button heroui-button-sm ${
          selected === preset
            ? 'heroui-button-primary'
            : 'heroui-button-secondary'
        }`}
      >
        {preset.charAt(0).toUpperCase() + preset.slice(1)}
      </button>
    ))}
  </div>
);

// Upgrade Notification Preview - Auto-rename with hover to pause/edit
export const UpgradeConfirmToastPreview = ({
  state = 'pending',
  filenamePreset = 'normal',
}: {
  state?: string;
  filenamePreset?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [editedName, setEditedName] = useState('');

  const stateConfig: Record<
    string,
    {
      icon: React.ComponentType<{ className: string }>;
      color: string;
      message: string;
    }
  > = {
    pending: {
      icon: SparklesIcon,
      color: 'text-blue-600',
      message: 'Better name found',
    },
    applied: {
      icon: CheckIcon,
      color: 'text-green-600',
      message: 'Renamed',
    },
    error: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      message: 'Failed to rename — kept original',
    },
  };

  const config = stateConfig[state] || stateConfig.pending;
  const Icon = config.icon;
  const variants =
    filenameVariants[filenamePreset as keyof typeof filenameVariants] ||
    filenameVariants.normal;

  const isPending = state === 'pending';

  // Initialize edited name on first hover
  useEffect(() => {
    if (isHovered && !editedName) {
      setEditedName(variants.renamed);
    }
  }, [isHovered, editedName, variants.renamed]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover interactions are required for the design doc preview and do not ship to production components.
    <div
      className="rounded-lg border border-[var(--heroui-content3)] bg-[var(--heroui-content1)] shadow-2xl backdrop-blur w-[400px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-3 space-y-2">
        {/* Header with icon and countdown */}
        <div
          className={`flex ${state === 'error' ? 'items-center' : 'items-start'} justify-between gap-2`}
        >
          <div
            className={`flex ${state === 'error' ? 'items-center' : 'items-start'} gap-2 flex-1 min-w-0`}
          >
            <Icon
              className={`w-4 h-4 ${config.color} flex-shrink-0 ${state !== 'error' ? 'mt-0.5' : ''}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs opacity-80">{config.message}</p>
            </div>
          </div>
          {isPending && (
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-nowrap flex-shrink-0 flex items-center justify-center gap-1">
              {isHovered ? <PauseIcon className="w-3.5 h-3.5" /> : '5s'}
            </span>
          )}
        </div>

        {/* Filename display - static or editing (maintains width) - hidden for error state */}
        {state !== 'error' && (
          <div className="ml-6">
            {isHovered && isPending ? (
              <div className="space-y-2">
                {/* Edit mode on hover */}
                <div>
                  <p className="text-xs text-default-500 mb-1">
                    {variants.original}
                  </p>
                  <textarea
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    rows={2}
                    className="w-full text-xs px-2 py-1 border border-primary rounded bg-default-100 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {/* Action buttons on hover */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 heroui-button heroui-button-sm heroui-button-primary"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="flex-1 heroui-button heroui-button-sm heroui-button-secondary"
                  >
                    Keep Original
                  </button>
                </div>
              </div>
            ) : (
              <FilenameDisplay
                original={variants.original}
                renamed={variants.renamed}
                className="text-xs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Rename Toast Preview (Compact) - Matches rename-toast.tsx:37
export const RenameToastPreview = ({
  isPaused = false,
  filenamePreset = 'normal',
}: {
  isPaused?: boolean;
  filenamePreset?: string;
}) => {
  const variants =
    filenameVariants[filenamePreset as keyof typeof filenameVariants] ||
    filenameVariants.normal;
  return (
    <div className="rounded-lg border border-[var(--heroui-content3)] bg-[var(--heroui-content1)] px-3 py-2 shadow-2xl backdrop-blur inline-flex items-center gap-2.5 max-w-[50vw]">
      <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs break-words">
          Renamed to <FilenameDisplay original="" renamed={variants.renamed} />
        </p>
      </div>
      {isPaused && <span className="text-xs opacity-60">⏸</span>}
    </div>
  );
};

// Onboarding Screen Preview (Compact Thumbnail)
export const OnboardingScreenPreview = ({
  screen = 1,
}: {
  screen?: number;
}) => {
  const screens: Record<number, { title: string; content: string }> = {
    1: { title: 'Mode', content: '🔄 Balanced 🔇 Silent' },
    2: { title: 'Privacy', content: '☁️ Cloud assist toggle' },
    3: { title: 'Access', content: '📁 Grant Downloads' },
    4: { title: 'AI', content: '🧠 Enable models' },
  };

  const config = screens[screen];

  return (
    <div className="heroui-card-sm border border-blue-300 bg-blue-50">
      <p className="text-xs font-medium text-blue-900">{config.title}</p>
      <p className="text-xs opacity-70 mt-1">{config.content}</p>
    </div>
  );
};

// Empty/Error State Preview - Uses toast box styling
export const StatePreview = ({ type = 'error' }: { type?: string }) => {
  const states: Record<
    string,
    {
      icon: React.ComponentType<{ className: string }>;
      color: string;
      iconColor: string;
      message: string;
    }
  > = {
    error: {
      icon: SparklesIcon,
      color: 'border-red-300',
      iconColor: 'text-red-600',
      message: '⚠️ On-device model not ready',
    },
    permission: {
      icon: SparklesIcon,
      color: 'border-orange-300',
      iconColor: 'text-orange-600',
      message: '🔐 Grant Downloads access',
    },
    processing: {
      icon: SparklesIcon,
      color: 'border-blue-300',
      iconColor: 'text-blue-600',
      message: '🧠 Analyzing first pages…',
    },
  };

  const config = states[type];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border ${config.color} bg-[var(--heroui-content1)] px-3 py-2 shadow-2xl backdrop-blur inline-flex items-center gap-2.5 max-w-3xl`}
    >
      <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
      <p className="text-xs">{config.message}</p>
    </div>
  );
};

// Compact State Toggle Button
export const StateToggleButton = ({
  states,
  current,
  onChange,
}: {
  states: string[];
  current: string;
  onChange: (state: string) => void;
}) => (
  <div className="flex gap-1 flex-wrap">
    {states.map((state) => (
      <button
        type="button"
        key={state}
        onClick={() => onChange(state)}
        className={`heroui-button heroui-button-sm ${
          current === state
            ? 'heroui-button-primary'
            : 'heroui-button-secondary'
        }`}
      >
        {state}
      </button>
    ))}
  </div>
);

// Compact Code Snippet (Multi-line)
export const CompactCodeSnippet = ({
  code,
  label,
}: {
  code: string;
  label?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative text-xs">
      {label && <p className="text-xs opacity-70 mb-1">{label}</p>}
      <button
        type="button"
        onClick={copyCode}
        className="absolute top-1 right-1 heroui-button heroui-button-sm opacity-70 hover:opacity-100"
      >
        {copied ? (
          <CheckIcon className="w-3 h-3" />
        ) : (
          <ClipboardIcon className="w-3 h-3" />
        )}
      </button>
      <pre className="code-block text-xs max-h-20 overflow-y-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Implementation Reference Link
export const ImplRef = ({
  file,
  line,
  description,
}: {
  file: string;
  line?: number;
  description?: string;
}) => (
  <div className="text-xs opacity-70 space-y-1">
    <div
      className="text-blue-600 font-mono text-xs break-all"
      title={description}
    >
      {file}
      {line && `:${line}`}
    </div>
    {description && <p className="text-xs">{description}</p>}
  </div>
);
