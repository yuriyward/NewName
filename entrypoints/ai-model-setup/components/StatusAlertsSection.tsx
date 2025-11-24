import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import type { JSX } from 'react';
import { resolveSetupErrorMessage } from '../utils';
import { InlineAlert } from './alerts';

export interface StatusAlertsSectionProps {
  loadError: string | null;
  setupError: string | null;
  storedLastError: string | null;
  cancelled: boolean;
  completedAt: number | null;
}

export function StatusAlertsSection({
  loadError,
  setupError,
  storedLastError,
  cancelled,
  completedAt,
}: StatusAlertsSectionProps): JSX.Element | null {
  return (
    <>
      {loadError ? (
        <InlineAlert
          tone="danger"
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          title="Unable to check model status"
          description={loadError}
        />
      ) : null}

      {(() => {
        const activeError = setupError ?? storedLastError;
        if (!activeError) return null;
        const errorDisplay = resolveSetupErrorMessage(activeError);
        return (
          <InlineAlert
            tone="danger"
            icon={<ExclamationTriangleIcon className="h-5 w-5" />}
            title={errorDisplay.title}
            description={errorDisplay.description}
          />
        );
      })()}

      {cancelled ? (
        <InlineAlert
          tone="warning"
          icon={<XMarkIcon className="h-5 w-5" />}
          title="Download cancelled"
          description="Pick the model below to try the download again."
        />
      ) : null}

      {completedAt && !setupError && !storedLastError && !cancelled ? (
        <InlineAlert
          tone="success"
          icon={<CheckCircleIcon className="h-5 w-5" />}
          title="Models ready"
          description="Great! You can close this tab or continue tweaking other settings."
        />
      ) : null}
    </>
  );
}
