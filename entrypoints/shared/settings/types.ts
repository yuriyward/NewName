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

export interface CloudSettings {
  enabled: boolean;
  scope: FileType[];
  dataMinimize: boolean;
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
  return (
    value === 'pdf' ||
    value === 'image' ||
    value === 'audio' ||
    value === 'video' ||
    value === 'office' ||
    value === 'archive' ||
    value === 'data'
  );
}

export function isUiLocale(value: unknown): value is UiLocale {
  return (
    value === 'browser' || value === 'en' || value === 'pl' || value === 'uk'
  );
}
