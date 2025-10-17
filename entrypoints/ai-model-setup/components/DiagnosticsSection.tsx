import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { type JSX, useState } from 'react';
import type { SystemDiagnostics } from '@/entrypoints/shared/integrations/chrome-ai/diagnostics';
import { CopyableUrl } from './CopyableUrl';

interface DiagnosticsSectionProps {
  diagnostics: SystemDiagnostics | null;
  onRunDiagnostics: () => void;
  onRefresh: () => void;
  isRunning: boolean;
}

export function DiagnosticsSection({
  diagnostics,
  onRunDiagnostics,
  onRefresh,
  isRunning,
}: DiagnosticsSectionProps): JSX.Element {
  const [showFlagsUrl, setShowFlagsUrl] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-warning-300 bg-warning-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-warning-600" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-warning-900">
                Setup Issues Detected
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-warning-700">
                All AI models are unavailable. Click "Run Diagnostics" to
                identify specific problems and get fix instructions.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onRunDiagnostics}
                  disabled={isRunning}
                  className="inline-flex items-center justify-center rounded-full bg-warning-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-warning-700 disabled:cursor-not-allowed disabled:bg-warning-400"
                >
                  {isRunning ? (
                    <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isRunning ? 'Running Diagnostics…' : 'Run Diagnostics'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFlagsUrl(!showFlagsUrl)}
                  className="inline-flex items-center justify-center rounded-full border border-warning-300 bg-white px-4 py-2 text-xs font-medium text-warning-700 transition hover:border-warning-400 hover:bg-warning-50"
                >
                  <ClipboardDocumentIcon className="mr-1.5 h-3.5 w-3.5" />
                  Copy Chrome Flags URL
                </button>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center justify-center rounded-full border border-warning-300 bg-white px-4 py-2 text-xs font-medium text-warning-700 transition hover:border-warning-400 hover:bg-warning-50"
                >
                  <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5" />
                  Re-check Status
                </button>
              </div>
              {showFlagsUrl && (
                <div className="pt-1">
                  <CopyableUrl url="chrome://flags/#prompt-api-for-gemini-nano" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {diagnostics && diagnostics.issues.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-default-600">
            Found {diagnostics.issues.length}{' '}
            {diagnostics.issues.length === 1 ? 'issue' : 'issues'} - Chrome{' '}
            {diagnostics.chromeVersion} on {diagnostics.platform}
          </p>
          {diagnostics.issues.map((issue) => (
            <DiagnosticIssueCard key={issue.issue} issue={issue} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface DiagnosticIssueCardProps {
  issue: import('@/entrypoints/shared/integrations/chrome-ai/diagnostics').DiagnosticResult;
}

function DiagnosticIssueCard({ issue }: DiagnosticIssueCardProps): JSX.Element {
  const severityStyles = {
    error: 'border-danger-300 bg-danger-50',
    warning: 'border-warning-300 bg-warning-50',
    info: 'border-primary-300 bg-primary-50',
  };

  const severityIcons = {
    error: <XMarkIcon className="h-5 w-5 text-danger-600" />,
    warning: <ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />,
    info: <CheckCircleIcon className="h-5 w-5 text-primary-600" />,
  };

  const textStyles = {
    error: 'text-danger-900',
    warning: 'text-warning-900',
    info: 'text-primary-900',
  };

  const descStyles = {
    error: 'text-danger-700',
    warning: 'text-warning-700',
    info: 'text-primary-700',
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${severityStyles[issue.severity]}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0">
          {severityIcons[issue.severity]}
        </span>
        <div className="flex-1 space-y-2">
          <div>
            <h4
              className={`text-sm font-semibold ${textStyles[issue.severity]}`}
            >
              {issue.title}
            </h4>
            <p
              className={`mt-1 text-xs leading-relaxed ${descStyles[issue.severity]}`}
            >
              {issue.description}
            </p>
          </div>

          <div>
            <p
              className={`text-xs font-semibold ${textStyles[issue.severity]}`}
            >
              How to fix:
            </p>
            <ol className="mt-1 space-y-1">
              {issue.fixSteps.map((step, i) => (
                <li
                  key={step}
                  className={`flex gap-2 text-xs ${descStyles[issue.severity]}`}
                >
                  <span className="font-medium">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {issue.links && issue.links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {issue.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center text-xs font-medium underline ${textStyles[issue.severity]} hover:no-underline`}
                >
                  {link.label} →
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
