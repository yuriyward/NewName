import type {
  AiModelId,
  AiModelState,
  AiModelStatusMap,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { AI_MODEL_IDS } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type { ModelProgress } from './types';

export const MODEL_LABELS: Record<AiModelId, string> = {
  'language-model': 'Prompt API (text + image)',
  summarizer: 'Summarizer API',
  'language-detector': 'Language Detector API',
};

export const STATE_DESCRIPTIONS: Record<AiModelState, string> = {
  unknown: 'Not checked yet',
  available: 'Ready to use',
  downloadable: 'Download required',
  downloading: 'Downloading…',
  unavailable: 'Unavailable on this device',
  unsupported: 'Unsupported in this Chrome build',
  error: 'Error checking status',
};

export const STATE_TONES: Record<AiModelState, string> = {
  available: 'text-success-600 border-success-200 bg-success-50/80',
  downloadable: 'text-warning-600 border-warning-200 bg-warning-50/80',
  downloading: 'text-primary-600 border-primary-200 bg-primary-50/80',
  unavailable: 'text-danger-600 border-danger-200 bg-danger-50/80',
  unsupported: 'text-default-500 border-default-200 bg-default-50/80',
  error: 'text-danger-600 border-danger-200 bg-danger-50/80',
  unknown: 'text-default-500 border-default-200 bg-default-50/80',
};

export const INITIAL_STATUS_MAP: AiModelStatusMap = AI_MODEL_IDS.reduce(
  (acc, id) => {
    acc[id] = {
      id,
      state: 'unknown',
      lastUpdated: 0,
      requiresUserActivation: false,
    };
    return acc;
  },
  {} as AiModelStatusMap,
);

export const SUPPORTED_PROMPT_OUTPUT_LANGUAGES = new Set(['en', 'es', 'ja']);

export function createInitialProgressMap(): Record<AiModelId, ModelProgress> {
  return AI_MODEL_IDS.reduce(
    (acc, id) => {
      acc[id] = { started: false, completed: false };
      return acc;
    },
    {} as Record<AiModelId, ModelProgress>,
  );
}
