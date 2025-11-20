import { useEffect, useState } from 'react';
import { getManagedRelativePath } from '@/entrypoints/shared/filesystem/handle-storage';

/**
 * Hook to fetch and cache the managed folder path from IndexedDB.
 * The path is fetched once per component tree mount and shared across all consumers.
 * This prevents redundant IndexedDB queries when multiple components need the same value.
 *
 * @returns The managed folder path, or null if not available
 */
export function useManagedFolderPath(): string | null {
  const [managedFolder, setManagedFolder] = useState<string | null>(null);

  useEffect(() => {
    getManagedRelativePath().then(setManagedFolder).catch(console.error);
  }, []);

  return managedFolder;
}
