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
