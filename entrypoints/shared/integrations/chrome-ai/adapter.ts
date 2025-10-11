/**
 * Shared adapter interface for Chrome built-in AI APIs.
 * The chrome team currently exposes several surface-specific APIs (Prompt, Summarizer, Language Detector).
 * This adapter keeps our background/offscreen logic decoupled from the actual runtime implementation so we can
 * swap the mock below with real bindings once the APIs are ready.
 */
export interface SummarizerRequest {
  /** Human readable title for telemetry/debugging */
  topic?: string;
  /** Raw plain-text content to summarize */
  text: string;
  /** Optional language hint to bias the summary output */
  languageHint?: string;
  /** Maximum number of characters to include in the summary */
  maxOutputChars?: number;
}

export interface SummarizerResult {
  /** Generated summary text */
  summary: string;
  /** Language detected by the summarizer (if available) */
  detectedLanguage?: string;
  /** Optional reason tags that explain why an upgrade was proposed */
  reasonTags?: string[];
  /** Metadata about the summarization run */
  metrics?: {
    elapsedMs?: number;
    tokensUsed?: number;
  };
}

export interface LanguageDetectorResult {
  language: string;
  probability: number;
}

export interface PromptRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface PromptResult {
  output: string;
  finishReason: 'length' | 'stop' | 'content-filter' | 'mock';
}

export interface BuiltInAiAdapter {
  summarizer: {
    isSupported(): Promise<boolean>;
    summarize(request: SummarizerRequest): Promise<SummarizerResult>;
  };
  languageDetector: {
    isSupported(): Promise<boolean>;
    detect(text: string): Promise<LanguageDetectorResult | null>;
  };
  prompt: {
    isSupported(): Promise<boolean>;
    complete(request: PromptRequest): Promise<PromptResult>;
  };
}

let currentAdapter: BuiltInAiAdapter | null = null;

/**
 * Retrieve the globally configured built-in AI adapter.
 * Falls back to the mock implementation until a real adapter is registered.
 */
export function getBuiltInAiAdapter(): BuiltInAiAdapter {
  if (currentAdapter) {
    return currentAdapter;
  }
  currentAdapter = createMockBuiltInAiAdapter();
  return currentAdapter;
}

/**
 * Replace the shared adapter. Useful for tests or when the real implementation lands.
 */
export function setBuiltInAiAdapter(adapter: BuiltInAiAdapter): void {
  currentAdapter = adapter;
}

/**
 * Provide a deterministic mock so we can wire the rest of the pipeline without hitting real APIs yet.
 */
export function createMockBuiltInAiAdapter(): BuiltInAiAdapter {
  return {
    summarizer: {
      async isSupported() {
        return true;
      },
      async summarize(request) {
        const start = Date.now();
        const trimmed =
          request.text.length <= (request.maxOutputChars ?? 280)
            ? request.text
            : `${request.text.slice(0, Math.max(0, (request.maxOutputChars ?? 280) - 3)).trim()}...`;
        return {
          summary: trimmed.length > 0 ? trimmed : '[mock] No content',
          detectedLanguage: guessLanguage(request.text),
          reasonTags: ['mock-summary'],
          metrics: {
            elapsedMs: Date.now() - start,
            tokensUsed: Math.ceil(trimmed.length / 4),
          },
        };
      },
    },
    languageDetector: {
      async isSupported() {
        return true;
      },
      async detect(text) {
        const language = guessLanguage(text);
        return language
          ? {
              language,
              probability: language === 'en' ? 0.8 : 0.6,
            }
          : null;
      },
    },
    prompt: {
      async isSupported() {
        return true;
      },
      async complete(request) {
        const contextSuffix = request.context
          ? ` [context: ${sanitizeContext(request.context)}]`
          : '';
        return {
          output: `[mock-response] ${request.prompt.trim()}${contextSuffix}`,
          finishReason: 'mock',
        };
      },
    },
  };
}

function sanitizeContext(context: string): string {
  return context.replace(/\s+/g, ' ').slice(0, 160);
}

function guessLanguage(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (/[ąćęłńóśźż]/i.test(trimmed)) {
    return 'pl';
  }
  if (/[а-яіїєґ]/i.test(trimmed)) {
    return 'uk';
  }
  if (/[áéíóúñ¿¡]/i.test(trimmed)) {
    return 'es';
  }
  return 'en';
}
