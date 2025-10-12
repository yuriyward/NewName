/**
 * Download utility functions for file type checking
 */
import type {
  FileType,
  Settings,
} from '@/entrypoints/shared/settings/settings';

export function isMediaFileType(
  fileType: FileType,
): fileType is Extract<FileType, 'audio' | 'video'> {
  return fileType === 'audio' || fileType === 'video';
}

export function shouldRenameType(
  settings: Settings,
  fileType: keyof Settings['perType'],
): boolean {
  const behavior = settings.perType[fileType]?.behavior ?? 'auto';
  if (behavior === 'off') return false;
  return true;
}
