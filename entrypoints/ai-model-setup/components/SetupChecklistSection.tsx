import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import XCircleIcon from '@heroicons/react/24/outline/XCircleIcon';
import type { JSX } from 'react';
import type { AiModelStatusMap } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { CopyableUrl } from './CopyableUrl';

interface SetupChecklistSectionProps {
  statuses: AiModelStatusMap;
  loading: boolean;
}

type StepStatus = 'completed' | 'warning' | 'error' | 'pending';

interface ChecklistStep {
  title: string;
  status: StepStatus;
  instructions: JSX.Element;
}

export function SetupChecklistSection({
  statuses,
  loading,
}: SetupChecklistSectionProps): JSX.Element {
  const steps = deriveSteps(statuses, loading);

  return (
    <section className="rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-900">
        Setup Checklist
      </h2>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <ChecklistStepCard
            key={step.title}
            stepNumber={index + 1}
            step={step}
          />
        ))}
      </div>
    </section>
  );
}

function ChecklistStepCard({
  stepNumber,
  step,
}: {
  stepNumber: number;
  step: ChecklistStep;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <StepStatusIcon status={step.status} />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-semibold text-default-900">
            Step {stepNumber}: {step.title}
          </h3>
          <div className="text-xs leading-relaxed text-default-600">
            {step.instructions}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepStatusIcon({ status }: { status: StepStatus }): JSX.Element {
  switch (status) {
    case 'completed':
      return (
        <div className="rounded-full bg-success-100 p-1.5">
          <CheckCircleIcon className="h-5 w-5 text-success-600" />
        </div>
      );
    case 'warning':
      return (
        <div className="rounded-full bg-warning-100 p-1.5">
          <ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />
        </div>
      );
    case 'error':
      return (
        <div className="rounded-full bg-danger-100 p-1.5">
          <XCircleIcon className="h-5 w-5 text-danger-600" />
        </div>
      );
    case 'pending':
      return (
        <div className="rounded-full bg-default-100 p-1.5">
          <ClockIcon className="h-5 w-5 text-default-400" />
        </div>
      );
  }
}

function deriveSteps(
  statuses: AiModelStatusMap,
  loading: boolean,
): ChecklistStep[] {
  // Derive status from API availability
  const hasAnyAvailable = Object.values(statuses).some(
    (s) => s.state === 'available' || s.state === 'downloadable',
  );
  const hasAnyDownloadable = Object.values(statuses).some(
    (s) => s.state === 'downloadable',
  );
  const allUnavailable = Object.values(statuses).every(
    (s) => s.state === 'unavailable' || s.state === 'error',
  );
  const allAvailable = Object.values(statuses).every(
    (s) => s.state === 'available',
  );

  // Step 1: Enable Chrome Flags
  const step1Status: StepStatus = loading
    ? 'pending'
    : hasAnyAvailable
      ? 'completed'
      : allUnavailable
        ? 'error'
        : 'pending';

  const step1: ChecklistStep = {
    title: 'Enable Chrome Flags',
    status: step1Status,
    instructions: (
      <div className="space-y-3">
        <p>
          Enable the required Chrome flags and verify they show{' '}
          <strong>Enabled</strong> status:
        </p>
        <div className="space-y-2">
          <CopyableUrl
            url="chrome://flags/#prompt-api-for-gemini-nano"
            label="Prompt API Flag"
          />
          <CopyableUrl
            url="chrome://flags/#prompt-api-for-gemini-nano-multimodal-input"
            label="Multimodal Prompt Flag"
          />
          <CopyableUrl
            url="chrome://flags/#optimization-guide-on-device-model"
            label="Optimization Guide Flag"
          />
        </div>
        <p className="pt-1 text-default-500">
          <strong>How to verify:</strong> Paste each URL above into Chrome's
          address bar, set the dropdown to "Enabled", and confirm a blue
          "Enabled" badge appears next to the flag name.
        </p>
      </div>
    ),
  };

  // Step 2: Restart Chrome
  const step2Status: StepStatus =
    step1Status === 'completed' ? 'completed' : step1Status;

  const step2: ChecklistStep = {
    title: 'Restart Chrome',
    status: step2Status,
    instructions: (
      <div className="space-y-2">
        <p>
          After enabling all flags, click the <strong>Relaunch</strong> button
          that appears at the bottom of the chrome://flags page.
        </p>
        <p className="text-default-500">
          <strong>Why needed:</strong> Chrome only activates flags after a
          restart. The AI APIs won't be available until you relaunch.
        </p>
      </div>
    ),
  };

  // Step 3: Verify Component Download
  const step3Status: StepStatus = loading
    ? 'pending'
    : hasAnyAvailable
      ? 'completed'
      : step1Status === 'completed'
        ? 'warning'
        : 'pending';

  const step3: ChecklistStep = {
    title: 'Verify Component Download',
    status: step3Status,
    instructions: (
      <div className="space-y-3">
        <p>
          Check if the Optimization Guide component is downloading or installed:
        </p>
        <CopyableUrl url="chrome://components/" label="Components Page" />
        <p className="pt-1 text-default-500">
          <strong>How to verify:</strong> Open chrome://components, find
          "Optimization Guide On Device Model", and verify it shows a version
          number. If it shows "0.0.0.0", click "Check for update". Note: The
          download may take 1-2 days to start automatically.
        </p>
      </div>
    ),
  };

  // Step 4: Download Models
  const step4Status: StepStatus = loading
    ? 'pending'
    : allAvailable
      ? 'completed'
      : hasAnyDownloadable
        ? 'warning'
        : allUnavailable
          ? 'error'
          : 'pending';

  const step4: ChecklistStep = {
    title: 'Download AI Models',
    status: step4Status,
    instructions: (
      <div className="space-y-2">
        <p>
          Once flags are enabled and Chrome is restarted, you can download the
          AI models using the buttons in the "Model status" section below.
        </p>
        <p className="text-default-500">
          <strong>Note:</strong> Model downloads require this tab to stay
          focused. Keep it open until the progress indicator completes.
        </p>
      </div>
    ),
  };

  return [step1, step2, step3, step4];
}
