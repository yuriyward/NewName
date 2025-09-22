export type Mode = 'balanced' | 'silent' | 'careful' | 'custom';
export type Separator = 'clean' | 'kebab' | 'snake';
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

export interface SettingsV1 {
  version: 1;
  mode: Mode;
  language: 'browser' | 'auto' | 'pl' | 'en' | 'uk';
  separator: Separator;
  maxLen: number;
  transliterateAscii: boolean;
  perType: Record<FileType, PerTypeBehavior>;
  metadataToggles: MetadataToggles;
  cloud: CloudSettings;
  notifyOnKeep: boolean;
}

export const DEFAULT_SETTINGS: SettingsV1 = {
  version: 1,
  mode: 'balanced',
  language: 'auto',
  separator: 'clean',
  maxLen: 60,
  transliterateAscii: false,
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
