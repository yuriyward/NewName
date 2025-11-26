import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import WrenchScrewdriverIcon from '@heroicons/react/24/outline/WrenchScrewdriverIcon';
import { type JSX, useState } from 'react';
import type { SystemDiagnostics } from '@/entrypoints/shared/integrations/chrome-ai/diagnostics';
import { CopyableUrl } from './CopyableUrl';
import { DiagnosticsSection } from './DiagnosticsSection';

interface TroubleshootingSectionProps {
  diagnostics: SystemDiagnostics | null;
  onRunDiagnostics: () => void;
  onRefresh: () => void;
  isRunningDiagnostics: boolean;
  loading: boolean;
  activeModelId: string | null;
  allUnavailable: boolean;
}

export function TroubleshootingSection({
  diagnostics,
  onRunDiagnostics,
  onRefresh,
  isRunningDiagnostics,
  loading,
  activeModelId,
  allUnavailable,
}: TroubleshootingSectionProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded-lg border border-default-200 bg-white/60 px-4 py-3 text-left shadow-sm transition hover:border-default-300 hover:bg-white"
      >
        <WrenchScrewdriverIcon className="h-5 w-5 flex-shrink-0 text-default-500" />
        <span className="flex-1 text-sm font-semibold text-default-700">
          Troubleshooting
        </span>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 flex-shrink-0 text-default-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-default-400" />
        )}
      </button>

      {isExpanded ? (
        <div className="space-y-4 rounded-lg border border-default-200 bg-white/40 p-4 shadow-sm">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-default-700">
              Manual Verification
            </h3>
            <p className="text-sm text-default-600">
              Need to verify manually? Open Chrome's diagnostics page and
              inspect <strong>Model Status</strong> and{' '}
              <strong>Feature Adaptations</strong> to confirm models are
              available or downloading.
            </p>
            <CopyableUrl
              url="chrome://on-device-internals"
              label="Open chrome://on-device-internals"
            />
          </div>

          {allUnavailable ? (
            <div className="pt-2">
              <DiagnosticsSection
                diagnostics={diagnostics}
                onRunDiagnostics={onRunDiagnostics}
                onRefresh={onRefresh}
                isRunning={isRunningDiagnostics}
              />
            </div>
          ) : null}

          <div className="pt-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || Boolean(activeModelId)}
              className="inline-flex items-center justify-center rounded-full border border-default-200 px-4 py-2 text-sm font-medium text-default-600 transition hover:border-default-300 hover:text-default-700 disabled:cursor-not-allowed disabled:border-default-200 disabled:text-default-400"
            >
              <ArrowPathIcon
                className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin text-default-400' : ''}`}
              />
              Re-check Models
            </button>
          </div>

          <div className="space-y-3 border-t border-default-200 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-default-500">
              Requirements
            </h3>
            <ul className="space-y-2 text-sm text-default-500">
              <li>Chrome 140+ on Windows, macOS, Linux, or Chromebook Plus.</li>
              <li>
                Best to have ~16 GB RAM and ~2 GB free storage for Gemini Nano.
              </li>
              <li>
                Keep this tab open until the progress indicator completes.
              </li>
              <li>
                If prompted, stay on this page so Chrome maintains user
                activation.
              </li>
              <li>
                Enable both Prompt API flags (standard and{' '}
                <em>multimodal input</em>) in chrome://flags, set each to
                "Enabled", then relaunch Chrome.
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
