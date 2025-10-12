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
  detectLanguage: (input: string) => Promise<ChromeLanguageDetection[]>;
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
};

export type ChromeSummarizerResult = {
  summary: string;
};

export type ChromeSummarizerInstance = {
  summarize: (
    input: string,
    options?: { context?: string },
  ) => Promise<ChromeSummarizerResult>;
  destroy?: () => void;
};

export type ChromeSummarizerConstructor = {
  availability?: () => Promise<string>;
  create: (
    options: ChromeSummarizerOptions,
  ) => Promise<ChromeSummarizerInstance>;
};
