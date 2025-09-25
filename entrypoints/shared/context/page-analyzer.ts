/**
 * Page context extraction and URL analysis utilities
 */
export interface PageContextSnapshot {
  title?: string;
  heading?: string;
  linkText?: string;
  linkRel?: string;
  capturedAt: number;
}

export interface InstantBaselineSignals {
  url: string;
  referrer?: string;
  filename: string;
  mime?: string;
  startTime?: string;
  page?: PageContextSnapshot | null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractFileName(path: string): string {
  const parts = path.split(/[\\/]+/);
  return parts[parts.length - 1] ?? path;
}

function extractExtension(name: string): string | null {
  const match = /\.([A-Za-z0-9]{1,8})$/u.exec(name);
  return match ? match[1] : null;
}

export function deriveDomainBrand(url: URL): string | null {
  const parts = url.hostname
    .split('.')
    .filter((segment) => segment && segment !== 'www' && segment !== 'm');
  if (parts.length === 0) return null;
  const normalized = parts.map((segment) => segment.toLowerCase());

  const pickIndex = (): number => {
    const lastIndex = normalized.length - 1;
    const last = normalized[lastIndex];
    if (last.length <= 3 && lastIndex > 0) {
      const secondLastIndex = lastIndex - 1;
      const secondLast = normalized[secondLastIndex];
      if (secondLast.length <= 3 && secondLastIndex > 0) {
        return secondLastIndex - 1;
      }
      return secondLastIndex;
    }
    return lastIndex;
  };

  let index = pickIndex();
  while (index >= 0) {
    const candidate = normalized[index];
    if (!/^\d+$/.test(candidate)) {
      return candidate;
    }
    index -= 1;
  }

  return null;
}

export function extractResolutionFromFilename(filename: string): string | null {
  const base = extractFileName(filename);
  const match = base.match(/(\d{3,5})[x×](\d{3,5})/i);
  if (!match) return null;
  return `${match[1]}x${match[2]}`;
}

export { extractFileName, extractExtension, safeDecode };
