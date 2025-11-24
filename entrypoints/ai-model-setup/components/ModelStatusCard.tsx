import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import BoltIcon from '@heroicons/react/24/outline/BoltIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import type { JSX } from 'react';
import type { AiModelStatus } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { MODEL_LABELS, STATE_DESCRIPTIONS, STATE_TONES } from '../constants';
import type { ModelProgress } from '../types';
import {
  computeProgressPercent,
  resolveModelAction,
  resolveStaleBadge,
} from '../utils';

interface ModelStatusCardProps {
  status: AiModelStatus;
  progress: ModelProgress;
  lastUpdated: number;
  now: number;
  onStart: () => void;
  onCancel: () => void;
  isActive: boolean;
  disabled: boolean;
}

export function ModelStatusCard({
  status,
  progress,
  lastUpdated,
  now,
  onStart,
  onCancel,
  isActive,
  disabled,
}: ModelStatusCardProps): JSX.Element {
  const isChromeQueuedDownload =
    status.state === 'downloading' && !progress.started;
  const activeDownloadOverride =
    progress.started && !progress.completed && status.state !== 'available';
  const displayState = isChromeQueuedDownload
    ? 'downloadable'
    : activeDownloadOverride
      ? 'downloading'
      : status.state;
  const tone = STATE_TONES[displayState];
  const stateDescription = STATE_DESCRIPTIONS[displayState];
  const percent = computeProgressPercent(progress.loaded, progress.total);
  const showGauge =
    progress.started &&
    !progress.completed &&
    status.state !== 'available' &&
    status.state !== 'unsupported' &&
    status.state !== 'unavailable';
  const action = resolveModelAction(status.state, progress);
  const showStartButton = Boolean(action) && !isActive;
  const activationTitle = status.requiresUserActivation
    ? 'Chrome needs a user gesture to start downloads. Keep this tab focused.'
    : undefined;
  const actionTone = action?.tone ?? 'secondary';
  const actionClasses =
    actionTone === 'primary'
      ? 'inline-flex items-center justify-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-primary-300'
      : 'inline-flex items-center justify-center rounded-full border border-default-200 px-3 py-1.5 text-xs font-medium text-default-600 transition hover:border-default-300 hover:text-default-700 disabled:cursor-not-allowed disabled:border-default-200 disabled:text-default-400';
  const showActions = showStartButton || isActive;
  const staleLabel = resolveStaleBadge(status, lastUpdated, now);

  return (
    <div className={`rounded-xl border bg-white/90 p-4 shadow-sm ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {MODEL_LABELS[status.id]}
          </p>
          <p className="text-xs text-default-500">{stateDescription}</p>
          {status.detail ? (
            <p className="text-xs text-default-500">{status.detail}</p>
          ) : null}
          {status.state === 'error' && progress.error ? (
            <p className="text-xs text-danger-600">
              {progress.error}
              {progress.errorCode ? ` (${progress.errorCode})` : null}
            </p>
          ) : null}
          {status.state === 'unavailable' ? (
            <p className="text-xs text-default-500">
              Check Chrome hardware requirements and try again later.
            </p>
          ) : null}
        </div>
        {staleLabel ? (
          <span className="inline-flex items-center rounded-full bg-default-100 px-2.5 py-1 text-[11px] font-medium text-default-500">
            {staleLabel}
          </span>
        ) : null}
      </div>

      {showGauge ? (
        <ProgressBar percent={percent} availability={status.availability} />
      ) : status.state === 'available' || progress.completed ? (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-medium text-success-700">
          <CheckCircleIcon className="h-4 w-4" />
          Ready
        </div>
      ) : null}
      {showActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showStartButton && action ? (
            <button
              type="button"
              onClick={onStart}
              disabled={disabled}
              title={activationTitle}
              className={actionClasses}
            >
              {action.tone === 'primary' ? (
                <BoltIcon className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5" />
              )}
              {action.label}
            </button>
          ) : null}
          {isActive ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-full border border-default-200 px-3 py-1.5 text-xs font-medium text-default-600 transition hover:border-default-300 hover:text-default-700"
            >
              <XMarkIcon className="mr-1.5 h-3.5 w-3.5" />
              Cancel download
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProgressBar({
  percent,
  availability,
}: {
  percent: number | null;
  availability?: string;
}): JSX.Element {
  // Check if Chrome is in post-download processing phase
  const isProcessing =
    availability === 'processing' || availability === 'after-download';

  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-default-200">
        <div
          className={`h-full rounded-full bg-primary transition-all ${
            isProcessing ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percent ?? 15}%` }}
        />
      </div>
      {isProcessing ? (
        <p className="mt-1 text-xs text-default-500">
          Download complete. Chrome is extracting and loading the model…
        </p>
      ) : percent != null ? (
        <p className="mt-1 text-xs text-default-500">{percent}%</p>
      ) : (
        <p className="mt-1 text-xs text-default-500">
          Downloading… keep this tab focused.
        </p>
      )}
    </div>
  );
}
