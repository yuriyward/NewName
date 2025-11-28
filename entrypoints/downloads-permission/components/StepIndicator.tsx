/**
 * Step indicator component showing progress through the setup flow
 */

import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import type { JSX } from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({
  currentStep,
  totalSteps = 2,
}: StepIndicatorProps): JSX.Element {
  return (
    <div className="absolute right-4 top-4 flex items-center gap-1.5 sm:right-6 sm:top-6">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div
            key={stepNum}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${
              isCompleted
                ? 'bg-success-500 text-white'
                : isCurrent
                  ? 'bg-primary text-white ring-2 ring-primary/20'
                  : 'bg-default-200 text-default-500'
            }`}
          >
            {isCompleted ? <CheckCircleIcon className="h-4 w-4" /> : stepNum}
          </div>
        );
      })}
    </div>
  );
}
