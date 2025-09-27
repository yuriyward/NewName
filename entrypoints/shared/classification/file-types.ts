/**
 * File type detection from MIME and extensions
 */
import type { FileType } from '@/entrypoints/shared/settings/settings';

const MIME_TYPE_MAP: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'application/x-pdf': 'pdf',
  'application/illustrator': 'image',
  'application/postscript': 'image',
  'application/zip': 'archive',
  'application/x-zip-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/vnd.rar': 'archive',
  'application/x-bzip2': 'archive',
  'application/x-gzip': 'archive',
  'application/gzip': 'archive',
  'application/x-xz': 'archive',
  'application/zstd': 'archive',
  'application/x-zstd-compressed': 'archive',
  'application/x-tar': 'archive',
  'application/x-iso9660-image': 'archive',
  'application/x-apple-diskimage': 'archive',
  'application/x-diskcopy': 'archive',
  'application/x-msdownload': 'archive',
  'application/vnd.microsoft.portable-executable': 'archive',
  'application/x-msi': 'archive',
  'application/x-ms-shortcut': 'archive',
  'application/vnd.android.package-archive': 'archive',
  'application/x-deb': 'archive',
  'application/x-rpm': 'archive',
  'application/x-dpkg': 'archive',
  'application/x-gtar': 'archive',
  'application/x-gtar-compressed': 'archive',
  'application/vnd.apple.installer+xml': 'archive',
  'application/x-dmg': 'archive',
  'application/x-bzip': 'archive',
  'application/msword': 'office',
  'application/vnd.ms-powerpoint': 'office',
  'application/vnd.ms-excel': 'office',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'office',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'office',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'office',
};

const EXTENSION_MAP: Record<string, FileType> = {
  pdf: 'pdf',
  ai: 'image',
  ps: 'image',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  avif: 'image',
  bmp: 'image',
  tif: 'image',
  tiff: 'image',
  svg: 'image',
  heic: 'image',
  heif: 'image',
  ico: 'image',
  psd: 'image',
  aac: 'audio',
  flac: 'audio',
  mp3: 'audio',
  wav: 'audio',
  wave: 'audio',
  oga: 'audio',
  ogg: 'audio',
  opus: 'audio',
  m4a: 'audio',
  m4b: 'audio',
  weba: 'audio',
  amr: 'audio',
  aiff: 'audio',
  aif: 'audio',
  au: 'audio',
  caf: 'audio',
  midi: 'audio',
  mid: 'audio',
  mpga: 'audio',
  mp2: 'audio',
  mp4: 'video',
  m4v: 'video',
  mkv: 'video',
  webm: 'video',
  avi: 'video',
  mpg: 'video',
  mpeg: 'video',
  mov: 'video',
  qt: 'video',
  wmv: 'video',
  mxf: 'video',
  ts: 'video',
  m2ts: 'video',
  mts: 'video',
  '3gp': 'video',
  '3g2': 'video',
  ogv: 'video',
  ogm: 'video',
  ogx: 'video',
  flv: 'video',
  f4v: 'video',
  mpd: 'video',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  gz: 'archive',
  bz2: 'archive',
  bz: 'archive',
  xz: 'archive',
  zst: 'archive',
  sz: 'archive',
  lz: 'archive',
  lzma: 'archive',
  lz4: 'archive',
  tar: 'archive',
  'tar.gz': 'archive',
  'tar.bz2': 'archive',
  'tar.xz': 'archive',
  'tar.zst': 'archive',
  'tar.lz': 'archive',
  'tar.lz4': 'archive',
  tgz: 'archive',
  tbz: 'archive',
  tbz2: 'archive',
  txz: 'archive',
  tlz: 'archive',
  tlz4: 'archive',
  iso: 'archive',
  dmg: 'archive',
  img: 'archive',
  pkg: 'archive',
  msi: 'archive',
  msix: 'archive',
  exe: 'archive',
  apk: 'archive',
  cab: 'archive',
  deb: 'archive',
  rpm: 'archive',
  sfx: 'archive',
  csv: 'data',
  json: 'data',
  txt: 'data',
  log: 'data',
  md: 'data',
  yaml: 'data',
  yml: 'data',
  xlsx: 'office',
  xls: 'office',
  doc: 'office',
  docx: 'office',
  ppt: 'office',
  pptx: 'office',
  odp: 'office',
  ods: 'office',
  odt: 'office',
};

const MIME_PREFIX_MAP: Array<{ prefix: string; type: FileType }> = [
  { prefix: 'image/', type: 'image' },
  { prefix: 'audio/', type: 'audio' },
  { prefix: 'video/', type: 'video' },
];

function normalizeMime(mime?: string): string | undefined {
  if (!mime) return undefined;
  const [raw] = mime.split(';', 1);
  const cleaned = raw?.trim().toLowerCase();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

function normalizeExtension(extension?: string | null): string | undefined {
  if (!extension) return undefined;
  const cleaned = extension.replace(/^\.+/, '').trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : undefined;
}

function lookupExtension(normalized: string): FileType | undefined {
  if (normalized in EXTENSION_MAP) {
    return EXTENSION_MAP[normalized];
  }

  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    for (let index = 1; index < parts.length; index += 1) {
      const candidate = parts.slice(index).join('.');
      const match = EXTENSION_MAP[candidate];
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

export function detectFileType({
  mime,
  extension,
}: {
  mime?: string;
  extension?: string | null;
}): FileType {
  const normalizedMime = normalizeMime(mime);
  if (normalizedMime) {
    const direct = MIME_TYPE_MAP[normalizedMime];
    if (direct) return direct;

    for (const { prefix, type } of MIME_PREFIX_MAP) {
      if (normalizedMime.startsWith(prefix)) {
        return type;
      }
    }
  }

  const normalizedExtension = normalizeExtension(extension);
  if (normalizedExtension) {
    const match = lookupExtension(normalizedExtension);
    if (match) {
      return match;
    }
  }

  return 'data';
}
