/**
 * MuPDF WASM loader and instance management
 * Configures MuPDF's WASM loading with proper fallbacks for dev/prod
 * MuPDF auto-initializes on import, so we configure globalThis before importing
 */

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
            } catch {
              // chrome.runtime.getURL may throw in some contexts
            }

            // Fall back to node_modules path for dev mode
            // Vite will resolve this relative to mupdf package
            return new URL(
              '../../../../../../node_modules/mupdf/dist/mupdf-wasm.wasm',
              import.meta.url,
            ).href;
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
