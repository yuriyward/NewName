/**
 * File type detection from MIME and extensions
 */

import {
  EXTENSION_MAP,
  MIME_PREFIX_MAP,
  MIME_TYPE_MAP,
} from '@/entrypoints/shared/constants/file-constants';
import type { FileType } from '@/entrypoints/shared/settings/settings';

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

  // Optimized multi-part extension lookup - O(n) instead of O(n²)
  if (normalized.includes('.')) {
    let dotIndex = normalized.indexOf('.');
    while (dotIndex !== -1 && dotIndex < normalized.length - 1) {
      const candidate = normalized.slice(dotIndex + 1);
      const match = EXTENSION_MAP[candidate];
      if (match) {
        return match;
      }
      // Find next dot after current position
      dotIndex = normalized.indexOf('.', dotIndex + 1);
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
