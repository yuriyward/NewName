import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import type { JSX } from 'react';
import { Skeleton } from '@/entrypoints/shared/ui/Skeleton';
import { CopyableUrl } from './CopyableUrl';

interface InlineAlertProps {
  tone: 'success' | 'warning' | 'danger';
  icon: JSX.Element;
  title: string;
  description: string;
  children?: JSX.Element;
}

export function InlineAlert({
  tone,
  icon,
  title,
  description,
  children,
}: InlineAlertProps): JSX.Element {
  const toneStyles: Record<typeof tone, string> = {
    success: 'border-success-200 bg-success-50 text-success-700',
    warning: 'border-warning-200 bg-warning-50 text-warning-700',
    danger: 'border-danger-200 bg-danger-50 text-danger-700',
  };

  return (
    <div
      className={`rounded-xl border p-4 text-sm shadow-sm ${toneStyles[tone]}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-xs leading-relaxed">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoadingCard(): JSX.Element {
  return (
    <div className="rounded-xl border border-default-200 bg-white/70 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export function WxtDevModeAlert(): JSX.Element {
  return (
    <div className="rounded-xl border-2 border-primary-300 bg-primary-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <SparklesIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary-600" />
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-semibold text-primary-900">
            WXT Development Mode Detected
          </h3>
          <p className="text-xs leading-relaxed text-primary-700">
            You're running in WXT development mode, which uses a separate Chrome
            profile. Chrome flags and components must be enabled{' '}
            <strong>in this Chrome window</strong>, not your regular Chrome.
          </p>
          <div className="space-y-1 text-xs text-primary-600">
            <p className="font-medium">Quick setup:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Copy the URLs below and paste into Chrome's address bar</li>
              <li>Enable each flag and click "Relaunch" to restart Chrome</li>
              <li>After restart, check if Optimization Guide is downloading</li>
              <li>If missing, wait 1-2 days for component to download</li>
              <li>Return here and click "Run Diagnostics"</li>
            </ol>
          </div>
          <div className="space-y-2 pt-2">
            <CopyableUrl
              url="chrome://flags/#prompt-api-for-gemini-nano"
              label="1. Prompt API Flag:"
            />
            <CopyableUrl
              url="chrome://flags/#prompt-api-for-gemini-nano-multimodal-input"
              label="2. Multimodal Prompt Flag:"
            />
            <CopyableUrl
              url="chrome://flags/#optimization-guide-on-device-model"
              label="3. Optimization Guide Flag:"
            />
            <CopyableUrl
              url="chrome://components/"
              label="4. Check Components:"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrerequisitesSection(): JSX.Element {
  return (
    <section className="rounded-2xl border border-default-200 bg-white/70 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-default-500">
        <SparklesIcon className="h-4 w-4" />
        Requirements
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-default-500">
        <li>Chrome 140+ on Windows, macOS, Linux, or Chromebook Plus.</li>
        <li>Best to have ~16 GB RAM and ~2 GB free storage for Gemini Nano.</li>
        <li>Keep this tab open until the progress indicator completes.</li>
        <li>
          If prompted, stay on this page so Chrome maintains user activation.
        </li>
        <li>
          Enable both Prompt API flags (standard and <em>multimodal input</em>)
          in chrome://flags, set each to "Enabled", then relaunch Chrome.
        </li>
      </ul>
    </section>
  );
}
