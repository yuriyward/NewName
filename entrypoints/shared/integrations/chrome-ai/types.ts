// ============================================================
// Shared Types
// ============================================================

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

// ============================================================
// Language Detector API
// ============================================================

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

// ============================================================
// Summarizer API
// ============================================================

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

export type ChromeSummarizerResult = string;

export type ChromeSummarizerInstance = {
  summarize: (
    input: string,
    options?: {
      context?: string;
      outputLanguage?: string;
      expectedInputLanguages?: string[];
    },
  ) => Promise<ChromeSummarizerResult>;
  measureInputUsage?: (input: string) => Promise<number>;
  inputQuota?: number;
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

// ============================================================
// Language Model API
// ============================================================

export const CHROME_LANGUAGE_MODEL_AVAILABILITY_VALUES = [
  'no',
  'unavailable',
  'after-download',
  'readily',
  'processing',
] as const;

export type ChromeLanguageModelAvailability =
  (typeof CHROME_LANGUAGE_MODEL_AVAILABILITY_VALUES)[number];

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

/**
 * Represents a multimodal content item that can contain text, image, or audio.
 * Used when crafting prompts with mixed media types (e.g., text + image).
 */
export interface ChromeLanguageModelContentItem {
  type: 'text' | 'image' | 'audio';
  value: string | Blob | ImageData | ImageBitmap | BufferSource | AudioBuffer;
}

/**
 * Prompt message that supports both text-only and multimodal content.
 * When content is a string, it's a simple text message.
 * When content is an array, it enables multimodal prompting (e.g., text + image).
 */
export interface ChromeLanguageModelPromptMessage {
  role: ChromeLanguageModelMessageRole;
  content: string | ChromeLanguageModelContentItem[];
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
