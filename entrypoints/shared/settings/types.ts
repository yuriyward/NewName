/**
 * Type definitions for application configuration and settings
 */
import type { InstantBaselineStrategy } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import { isInstantBaselineStrategy } from '@/entrypoints/shared/pipeline/instant-baseline-types';

export type { InstantBaselineStrategy };
export { isInstantBaselineStrategy };

export type Mode = 'balanced' | 'silent' | 'careful' | 'custom';
export type Separator = 'clean' | 'kebab' | 'snake';
export type DebugLevel = 'basic' | 'detailed' | 'verbose';

/**
 * File type classification enum
 * Represents different file categories for analysis and handling
 */
export enum FileTypeEnum {
  PDF = 'pdf',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  ARCHIVE = 'archive',
  OFFICE = 'office',
  DATA = 'data',
}

export type FileType =
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  | 'archive'
  | 'office'
  | 'data';

export type UiLocale = 'browser' | 'en' | 'pl' | 'uk';

export interface PerTypeBehavior {
  behavior: 'auto' | 'confirm' | 'off';
}

export interface MetadataToggles {
  geo: boolean;
  docDate: boolean;
  mediaSpecs: boolean;
  sourceHint: boolean;
}

export type CloudTextFallbackMode = 'off' | 'ask' | 'always';

export type CloudModel = 'gemini-2.5-flash' | 'gemini-flash-lite-latest';

export type ProcessingMode = 'auto' | 'local' | 'cloud';

export interface CloudSettings {
  enabled: boolean;
  scope: FileType[];
  dataMinimize: boolean;
  textFallbackMode: CloudTextFallbackMode;
  /** Cloud AI model identifier (e.g., 'gemini-flash-lite-latest') */
  model: CloudModel;
  /** User's API key for cloud processing (encrypted in storage) */
  apiKey: string | null;
  /** Whether user has given explicit consent for cloud processing */
  consentGiven: boolean;
  /** Timestamp when consent was given (null if never consented) */
  consentTimestamp: number | null;
}

export interface ProcessingPreferences {
  /** Global processing mode applied to all file types (unless overridden) */
  global: ProcessingMode;
  /** Whether to use per-type overrides */
  usePerTypeOverrides: boolean;
  /** Processing mode for text files (overrides global if usePerTypeOverrides is true) */
  text: ProcessingMode;
  /** Processing mode for PDF files (overrides global if usePerTypeOverrides is true) */
  pdf: ProcessingMode;
  /** Processing mode for image files (overrides global if usePerTypeOverrides is true) */
  image: ProcessingMode;
}

export interface DebugSettings {
  enabled: boolean;
  level: DebugLevel;
}

export interface ConfirmModalDefaults {
  /** Whether metadata sections are expanded by default in the confirm modal */
  expandMetadata: boolean;
  /** Whether reason tags are shown by default in the confirm modal */
  showReasonTags: boolean;
}

export interface ConfirmToastSettings {
  /** Countdown duration before auto-apply when enabled */
  autoApplyDelaySeconds: number;
  /** Whether to display sensitive reason tags inside the toast */
  showReasonTags: boolean;
  /** Fine-grained control over rename completion notifications */
  renameNotifications: {
    instantBaseline: boolean;
    contextualUpgrade: boolean;
  };
  /** Duration in seconds before rename notifications auto-dismiss */
  renameToastDurationSeconds: number;
}

export type Theme = 'light' | 'dark';

export interface LocalizationSettings {
  uiLocale: UiLocale;
}

export interface Settings {
  version: 2;
  mode: Mode;
  theme: Theme;
  language: 'browser' | 'auto' | 'pl' | 'en' | 'uk';
  separator: Separator;
  maxLen: number;
  transliterateAscii: boolean;
  instantBaselineStrategy: InstantBaselineStrategy;
  perType: Record<FileType, PerTypeBehavior>;
  metadataToggles: MetadataToggles;
  cloud: CloudSettings;
  /** Per-file-type AI processing preferences (local/cloud/auto) */
  processingPreferences: ProcessingPreferences;
  debug: DebugSettings;
  notifyOnKeep: boolean;
  confirmModal: ConfirmModalDefaults;
  confirmToast: ConfirmToastSettings;
  localization: LocalizationSettings;
}

export const UI_LOCALE_OPTIONS: ReadonlyArray<{
  id: UiLocale;
  labelKey: `settings.localization.ui.${UiLocale}`;
}> = [
  { id: 'browser', labelKey: 'settings.localization.ui.browser' },
  { id: 'en', labelKey: 'settings.localization.ui.en' },
  { id: 'pl', labelKey: 'settings.localization.ui.pl' },
  { id: 'uk', labelKey: 'settings.localization.ui.uk' },
];

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  mode: 'balanced',
  theme: 'dark',
  language: 'auto',
  separator: 'clean',
  maxLen: 60,
  transliterateAscii: false,
  instantBaselineStrategy: 'original-with-date',
  perType: {
    pdf: { behavior: 'auto' },
    image: { behavior: 'auto' },
    audio: { behavior: 'auto' },
    video: { behavior: 'auto' },
    office: { behavior: 'auto' },
    archive: { behavior: 'auto' },
    data: { behavior: 'auto' },
  },
  metadataToggles: {
    geo: false,
    docDate: true,
    mediaSpecs: true,
    sourceHint: true,
  },
  cloud: {
    enabled: false,
    scope: [],
    dataMinimize: true,
    textFallbackMode: 'ask',
    model: 'gemini-flash-lite-latest',
    apiKey: null,
    consentGiven: false,
    consentTimestamp: null,
  },
  processingPreferences: {
    global: 'auto',
    usePerTypeOverrides: false,
    text: 'auto',
    pdf: 'auto',
    image: 'auto',
  },
  debug: {
    enabled: false,
    level: 'basic',
  },
  notifyOnKeep: false,
  confirmModal: {
    expandMetadata: false,
    showReasonTags: true,
  },
  confirmToast: {
    autoApplyDelaySeconds: 10,
    showReasonTags: true,
    renameNotifications: {
      instantBaseline: true,
      contextualUpgrade: true,
    },
    renameToastDurationSeconds: 3,
  },
  localization: {
    uiLocale: 'browser',
  },
};

export function isFileType(value: unknown): value is FileType {
  const validTypes = Object.values(FileTypeEnum);
  return (
    typeof value === 'string' && validTypes.includes(value as FileTypeEnum)
  );
}

export function isUiLocale(value: unknown): value is UiLocale {
  return (
    value === 'browser' || value === 'en' || value === 'pl' || value === 'uk'
  );
}
