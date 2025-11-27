/**
 * Permission error classification utilities for File System Access API
 * Converts technical error messages into friendly, actionable guidance
 */

import { ManagedSubfolderRequiredError } from './directory-picker';

export interface ClassifiedError {
  message: string;
  hint?: string;
}

/**
 * Converts technical error messages into friendly, actionable guidance
 * for File System Access API permission errors.
 *
 * @param err - The error that occurred during permission request
 * @param lastPickerError - Optional additional error context from the directory picker
 * @returns A user-friendly error message with optional hint
 */
export function classifyPermissionError(
  err: unknown,
  lastPickerError: unknown,
): ClassifiedError {
  if (err instanceof ManagedSubfolderRequiredError) {
    return {
      message: "Can't use that folder",
      hint: 'Try creating a new folder inside Downloads and pick that instead.',
    };
  }

  const message = err instanceof Error ? err.message : 'Something went wrong';

  if (message === 'User cancelled directory picker') {
    if (lastPickerError && typeof lastPickerError === 'object') {
      const { name, message: detailMessage } = lastPickerError as {
        name?: string;
        message?: string;
      };

      if (
        name === 'AbortError' ||
        (detailMessage &&
          /Failed to execute 'showDirectoryPicker'/.test(detailMessage))
      ) {
        return {
          message: "Can't select that folder",
          hint: 'Try a different folder or create a new one.',
        };
      }

      return {
        message: 'No folder selected',
        hint: 'Click below to try again.',
      };
    }

    return {
      message: 'No folder selected',
      hint: 'Click below to try again.',
    };
  }

  if (message === 'Permission not granted') {
    return {
      message: 'Permission needed',
      hint: 'Click "Allow" when Chrome asks for permission.',
    };
  }

  return {
    message: "Let's try again",
    hint: 'Click below to retry.',
  };
}
