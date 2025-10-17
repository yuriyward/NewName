import type {
  ChromeLanguageModelCreateOptions,
  ChromeLanguageModelIODescriptor,
  ChromeSummarizerOptions,
} from '../types';

export const AI_MODEL_IDS = [
  'language-model',
  'summarizer',
  'language-detector',
] as const;

export type AiModelId = (typeof AI_MODEL_IDS)[number];

export type AiModelState =
  | 'unknown'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'unsupported'
  | 'error';

export interface AiModelStatus {
  id: AiModelId;
  state: AiModelState;
  lastUpdated: number;
  availability?: string;
  detail?: string;
  errorCode?: string;
  requiresUserActivation: boolean;
}

export type AiModelStatusMap = Record<AiModelId, AiModelStatus>;

export type AiModelProgressEvent =
  | {
      id: AiModelId;
      type: 'status';
      status: AiModelState;
      availability?: string;
    }
  | {
      id: AiModelId;
      type: 'download-start';
    }
  | {
      id: AiModelId;
      type: 'download-progress';
      loaded?: number;
      total?: number;
    }
  | {
      id: AiModelId;
      type: 'complete';
    }
  | {
      id: AiModelId;
      type: 'error';
      error: string;
      errorCode?: string;
    };

export interface RefreshAiModelOptions {
  summarizer?: Partial<
    Pick<
      ChromeSummarizerOptions,
      'type' | 'format' | 'length' | 'expectedInputLanguages' | 'outputLanguage'
    >
  >;
  languageModel?: Partial<
    Pick<
      ChromeLanguageModelCreateOptions,
      | 'systemPrompt'
      | 'initialPrompts'
      | 'expectedInputs'
      | 'expectedOutputs'
      | 'outputLanguage'
    >
  >;
}

export interface EnsureAiModelsOptions extends RefreshAiModelOptions {
  ids?: readonly AiModelId[];
  signal?: AbortSignal;
  onProgress?: (event: AiModelProgressEvent) => void;
}

export interface PreparationCacheKey {
  ids: readonly AiModelId[];
  summarizer: Pick<
    NonNullable<RefreshAiModelOptions['summarizer']>,
    'type' | 'format' | 'length' | 'outputLanguage' | 'expectedInputLanguages'
  >;
  languageModel: {
    systemPrompt?: string;
    initialPromptsCount: number;
    expectedInputs?: ChromeLanguageModelIODescriptor[];
    expectedOutputs?: ChromeLanguageModelIODescriptor[];
  };
}
