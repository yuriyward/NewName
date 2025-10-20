/**
 * MuPDF WASM loader and instance management
 * Configures MuPDF's WASM loading with proper fallbacks for dev/prod
 * MuPDF auto-initializes on import, so we configure globalThis before importing
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';

export type MuPdfModule = typeof import('mupdf');

let moduleReady: Promise<MuPdfModule> | null = null;

type MuPdfGlobal = typeof globalThis & {
  $libmupdf_wasm_Module?: {
    locateFile: (filename: string) => string;
  };
  chrome?: {
    runtime?: {
      getURL?: (path: string) => string;
    };
  };
};

/**
 * Calculate path to MuPDF WASM file for dev mode
 * Uses import.meta.url to resolve relative to this file's location in node_modules
 * The path is relative from: entrypoints/shared/integrations/mupdf/mupdf-loader.ts
 *   → node_modules/mupdf/dist/mupdf-wasm.wasm
 *
 * Note: We can't use Vite's ?url import because mupdf doesn't export the WASM file
 * in its package.json. This approach is more robust than hardcoded paths because
 * import.meta.url is always resolved relative to the file location.
 */
function getMupdfWasmPath(): string {
  return new URL(
    '../../../../../../node_modules/mupdf/dist/mupdf-wasm.wasm',
    import.meta.url,
  ).href;
}

/**
 * Get the MuPDF module with proper WASM loading configured
 * Sets globalThis.$libmupdf_wasm_Module BEFORE importing
 * to ensure WASM file is located correctly in both dev and production
 */
export async function getMuPdfModule(): Promise<MuPdfModule> {
  if (!moduleReady) {
    moduleReady = (async () => {
      // Configure WASM loader BEFORE importing MuPDF
      // MuPDF reads from globalThis.$libmupdf_wasm_Module on import
      const globalScope = globalThis as MuPdfGlobal;
      globalScope.$libmupdf_wasm_Module = {
        locateFile: (filename: string) => {
          // Handle WASM file specially
          if (filename === 'mupdf-wasm.wasm') {
            // Try chrome.runtime.getURL for extension context (production/offscreen)
            try {
              const chromeUrl = globalScope.chrome?.runtime?.getURL?.(
                'wasm/mupdf-wasm.wasm',
              );
              if (chromeUrl) {
                return chromeUrl;
              }
              debugLogger.warn(
                '[MuPDF] chrome.runtime.getURL returned no wasm URL; using dev fallback',
              );
            } catch (error) {
              debugLogger.warn(
                '[MuPDF] Failed to resolve wasm via chrome.runtime.getURL; using dev fallback',
                error,
              );
            }

            // Fall back to dev mode WASM path
            return getMupdfWasmPath();
          }

          return filename;
        },
      };

      // Now dynamically import MuPDF
      // It will use the configuration we just set
      return import('mupdf');
    })();
  }

  return moduleReady;
}

export function resetMuPdfModuleForTesting(): void {
  moduleReady = null;
  const globalScope = globalThis as MuPdfGlobal;
  delete globalScope.$libmupdf_wasm_Module;
}
