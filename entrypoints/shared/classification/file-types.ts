/**
 * File type detection from MIME and extensions
 */
import type { FileType } from '@/entrypoints/shared/settings/settings';

const EXTENSION_MAP: Record<string, FileType> = {
  pdf: 'pdf',
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
  mp3: 'audio',
  wav: 'audio',
  aac: 'audio',
  flac: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  opus: 'audio',
  mp4: 'video',
  mov: 'video',
  mkv: 'video',
  webm: 'video',
  avi: 'video',
  mpeg: 'video',
  mpg: 'video',
  m4v: 'video',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  gz: 'archive',
  tar: 'archive',
  bz2: 'archive',
  xz: 'archive',
  csv: 'data',
  json: 'data',
  txt: 'data',
  xlsx: 'office',
  xls: 'office',
  doc: 'office',
  docx: 'office',
  ppt: 'office',
  pptx: 'office',
};

export function detectFileType({
  mime,
  extension,
}: {
  mime?: string;
  extension?: string | null;
}): FileType {
  if (mime) {
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/zip' || mime === 'application/x-zip-compressed') {
      return 'archive';
    }
    if (
      mime === 'application/msword' ||
      mime === 'application/vnd.ms-powerpoint' ||
      mime === 'application/vnd.ms-excel' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return 'office';
    }
  }

  if (extension) {
    const normalized = extension.replace(/^\./, '').toLowerCase();
    if (normalized in EXTENSION_MAP) {
      return EXTENSION_MAP[normalized];
    }
  }

  return 'data';
}
