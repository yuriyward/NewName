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

/**
 * Fallback behavior when local AI is unavailable for text processing
 * - 'off': Never use cloud fallback
 * - 'ask': Prompt user before using cloud
 * - 'always': Automatically use cloud when local unavailable
 */
export type CloudTextFallbackMode = 'off' | 'ask' | 'always';

/**
 * Available cloud AI model identifiers
 * - 'gemini-2.5-flash': Full-featured Gemini model
 * - 'gemini-flash-lite-latest': Lightweight, faster model
 */
export type CloudModel = 'gemini-2.5-flash' | 'gemini-flash-lite-latest';

/**
 * AI processing mode for file analysis
 * - 'auto': Automatically choose best available provider
 * - 'local': Use only local Chrome AI (Gemini Nano)
 * - 'cloud': Use only cloud AI services
 */
export type ProcessingMode = 'auto' | 'local' | 'cloud';

// ============================================================================
// CloudSettings Sub-interfaces
// ============================================================================

/**
 * API configuration for cloud AI services
 * Contains credentials and model selection
 */
export interface CloudApiSettings {
  /**
   * User's API key for cloud processing
   * - Encrypted (AES-GCM) in storage, decrypted in memory
   * - See crypto.ts for encryption implementation details
   */
  apiKey: string | null;
  /**
   * Cloud AI model identifier
   * @example 'gemini-flash-lite-latest'
   */
  model: CloudModel;
}

/**
 * User consent tracking for cloud AI processing
 * Ensures GDPR/privacy compliance by tracking explicit consent
 */
export interface CloudConsentSettings {
  /** Whether user has given explicit consent for cloud processing */
  consentGiven: boolean;
  /** Timestamp when consent was given (null if never consented) */
  consentTimestamp: number | null;
}

/**
 * Connection test results for cloud AI services
 * Used to display connectivity status in UI
 */
export interface CloudConnectionTestSettings {
  /** Timestamp of last successful connection test (milliseconds since epoch) */
  lastTestTimestamp?: number;
  /** Result of last connection test (true = success, false = failure, undefined = never tested) */
  lastTestSuccess?: boolean;
}

/**
 * Privacy and data handling preferences for cloud processing
 */
export interface CloudPrivacySettings {
  /**
   * Whether to minimize data sent to cloud services
   * When enabled, strips unnecessary metadata and context
   */
  dataMinimize: boolean;
  /**
   * Fallback behavior when local AI is unavailable for text processing
   * Controls whether and how cloud services are used as backup
   */
  textFallbackMode: CloudTextFallbackMode;
}

/**
 * Cloud AI processing configuration
 * Combines API settings, consent tracking, connection status, and privacy preferences
 *
 * @remarks
 * This interface is composed of several logical sub-interfaces for better organization:
 * - {@link CloudApiSettings} - API credentials and model selection
 * - {@link CloudConsentSettings} - User consent tracking
 * - {@link CloudConnectionTestSettings} - Connection test results
 * - {@link CloudPrivacySettings} - Privacy and data handling
 */
export interface CloudSettings
  extends CloudApiSettings,
    CloudConsentSettings,
    CloudConnectionTestSettings,
    CloudPrivacySettings {
  /** Whether cloud processing is enabled globally */
  enabled: boolean;
  /**
   * File types that should use cloud processing
   * Empty array means no file types use cloud
   */
  scope: FileType[];
}

// ============================================================================
// ProcessingPreferences with Generics
// ============================================================================

/**
 * Supported file type keys for per-type processing overrides
 */
export type ProcessingFileType = 'text' | 'pdf' | 'image';

/**
 * Generic per-type override configuration
 * Maps file types to their processing mode settings
 *
 * @typeParam T - The type of value for each file type (typically ProcessingMode)
 */
export type PerTypeOverrides<T> = Record<ProcessingFileType, T>;

/**
 * Per-file-type AI processing preferences
 * Controls whether local or cloud AI is used for different file types
 *
 * @remarks
 * Uses {@link PerTypeOverrides} generic to avoid repetition of the same
 * structure for different file types. The generic pattern allows for
 * future extension with different value types if needed.
 *
 * @example
 * ```typescript
 * const prefs: ProcessingPreferences = {
 *   global: 'auto',
 *   usePerTypeOverrides: true,
 *   text: 'local',
 *   pdf: 'cloud',
 *   image: 'auto'
 * };
 * ```
 */
export interface ProcessingPreferences
  extends PerTypeOverrides<ProcessingMode> {
  /**
   * Global processing mode applied to all file types
   * Used when usePerTypeOverrides is false, or as fallback
   */
  global: ProcessingMode;
  /**
   * Whether to use per-type overrides instead of global setting
   * When false, all file types use the global processing mode
   */
  usePerTypeOverrides: boolean;
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

/**
 * Page context consent settings
 * Tracks user's explicit consent for capturing page titles and headings
 */
export interface PageContextConsent {
  /** Whether user has explicitly consented to page context capture */
  consentGranted: boolean;
  /** Timestamp when consent was given (null if never consented) */
  consentTimestamp: number | null;
}

/**
 * Checks if page context consent was granted within a specified time window.
 * Useful for determining if consent needs to be re-confirmed after a period.
 *
 * @param consent - The PageContextConsent object to check
 * @param maxAgeMs - Maximum age in milliseconds for consent to be considered recent
 * @returns true if consent was granted and is within the specified time window
 */
export function isConsentRecent(
  consent: PageContextConsent,
  maxAgeMs: number,
): boolean {
  return (
    consent.consentGranted &&
    consent.consentTimestamp !== null &&
    Date.now() - consent.consentTimestamp < maxAgeMs
  );
}

/**
 * Reminder state for periodic prompts to enable AI features
 * Used when user has denied page context consent
 */
export interface ReminderState {
  /** Number of times the reminder has been shown */
  count: number;
  /** Timestamp of the last reminder shown */
  lastShownTimestamp: number | null;
  /** Whether user has permanently dismissed reminders */
  dismissed: boolean;
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
  /** Page context capture consent tracking */
  pageContextConsent: PageContextConsent;
  /** Reminder state for AI feature prompts */
  aiFeatureReminder: ReminderState;
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
  pageContextConsent: {
    consentGranted: false,
    consentTimestamp: null,
  },
  aiFeatureReminder: {
    count: 0,
    lastShownTimestamp: null,
    dismissed: false,
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
