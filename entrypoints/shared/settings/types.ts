/**
 * Type definitions for application configuration and settings
 */
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
export type InstantBaselineStrategy =
  | 'keep-original'
  | 'original-with-date'
  | 'page-title'
  | 'page-title-with-date';

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

export interface SettingsV1 {
  version: 1;
  mode: Mode;
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
}

export const DEFAULT_SETTINGS: SettingsV1 = {
  version: 1,
  mode: 'balanced',
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

export function isInstantBaselineStrategy(
  value: unknown,
): value is InstantBaselineStrategy {
  return (
    value === 'keep-original' ||
    value === 'original-with-date' ||
    value === 'page-title' ||
    value === 'page-title-with-date'
  );
}
