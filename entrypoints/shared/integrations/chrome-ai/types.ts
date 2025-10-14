export type ChromeAIMonitorEvent = {
  loaded?: number;
  total?: number;
};

export type ChromeAIMonitor = {
  addEventListener: (
    name: string,
    handler: (event: ChromeAIMonitorEvent) => void,
  ) => void;
};

export type ChromeLanguageDetection = {
  detectedLanguage: string;
  confidence: number;
};

export type ChromeLanguageDetectorInstance = {
  detect: (input: string) => Promise<ChromeLanguageDetection[]>;
  destroy?: () => void;
};

export type ChromeLanguageDetectorOptions = {
  monitor?: (monitor: ChromeAIMonitor) => void;
};

export type ChromeLanguageDetectorConstructor = {
  availability?: () => Promise<string>;
  create: (
    options?: ChromeLanguageDetectorOptions,
  ) => Promise<ChromeLanguageDetectorInstance>;
};

export type ChromeSummarizerType = 'key-points' | 'tldr' | 'headline';
export type ChromeSummarizerFormat = 'markdown' | 'text';
export type ChromeSummarizerLength = 'short' | 'medium' | 'long';

export type ChromeSummarizerOptions = {
  type?: ChromeSummarizerType;
  format?: ChromeSummarizerFormat;
  length?: ChromeSummarizerLength;
  monitor?: (monitor: ChromeAIMonitor) => void;
  expectedInputLanguages?: string[];
  outputLanguage?: string;
  sharedContext?: string;
};

export type ChromeSummarizerResult = {
  summary: string;
};

export type ChromeSummarizerInstance = {
  summarize: (
    input: string,
    options?: {
      context?: string;
      outputLanguage?: string;
      expectedInputLanguages?: string[];
    },
  ) => Promise<ChromeSummarizerResult>;
  destroy?: () => void;
};

export type ChromeSummarizerAvailabilityOptions = {
  expectedInputLanguages?: string[];
  outputLanguage?: string;
};

export type ChromeSummarizerConstructor = {
  availability?: (
    options?: ChromeSummarizerAvailabilityOptions,
  ) => Promise<string>;
  create: (
    options: ChromeSummarizerOptions,
  ) => Promise<ChromeSummarizerInstance>;
};

export type ChromeLanguageModelAvailability =
  | 'no'
  | 'unavailable'
  | 'after-download'
  | 'readily'
  | 'processing';

export interface ChromeLanguageModelCapabilities {
  available: ChromeLanguageModelAvailability;
  reason?: string;
}

export interface ChromeLanguageModelAvailabilityOptions {
  expectedInputs?: ChromeLanguageModelIODescriptor[];
  expectedOutputs?: ChromeLanguageModelIODescriptor[];
  outputLanguage?: string;
}

export type ChromeLanguageModelMessageRole = 'system' | 'user' | 'assistant';

export interface ChromeLanguageModelPromptMessage {
  role: ChromeLanguageModelMessageRole;
  content: string;
}

export type ChromeLanguageModelIOType = 'text' | 'audio' | 'image';

export interface ChromeLanguageModelIODescriptor {
  type: ChromeLanguageModelIOType;
  language?: string;
  languages?: string[];
}

export interface ChromeLanguageModelCreateOptions {
  signal?: AbortSignal;
  monitor?: (monitor: ChromeAIMonitor) => void;
  systemPrompt?: string;
  initialPrompts?: ChromeLanguageModelPromptMessage[];
  temperature?: number;
  topK?: number;
  expectedInputs?: ChromeLanguageModelIODescriptor[];
  expectedOutputs?: ChromeLanguageModelIODescriptor[];
  outputLanguage?: string;
}

export interface ChromeLanguageModelPromptOptions {
  responseConstraint?: unknown;
  omitResponseConstraintInput?: boolean;
  signal?: AbortSignal;
}

export interface ChromeLanguageModelSession {
  prompt: (
    input: string | ChromeLanguageModelPromptMessage[],
    options?: ChromeLanguageModelPromptOptions,
  ) => Promise<string>;
  destroy?: () => void;
  clone?: (options?: {
    signal?: AbortSignal;
  }) => Promise<ChromeLanguageModelSession>;
  inputUsage?: number;
  inputQuota?: number;
}

export interface ChromeLanguageModelConstructor {
  availability?: (
    options?: ChromeLanguageModelAvailabilityOptions,
  ) => Promise<string>;
  capabilities?: (
    options?: ChromeLanguageModelAvailabilityOptions,
  ) => Promise<ChromeLanguageModelCapabilities>;
  params?: () => Promise<{
    defaultTemperature?: number;
    defaultTopK?: number;
  }>;
  create: (
    options?: ChromeLanguageModelCreateOptions,
  ) => Promise<ChromeLanguageModelSession>;
}
