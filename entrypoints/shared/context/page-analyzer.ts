export interface PageContextSnapshot {
  title?: string;
  heading?: string;
  linkText?: string;
  linkRel?: string;
  capturedAt: number;
}

export interface Phase1Signals {
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
  const last = parts[parts.length - 1];
  const secondLast = parts.length >= 2 ? parts[parts.length - 2] : null;
  if (last.length <= 3 && secondLast) {
    return secondLast.toLowerCase();
  }
  return last.toLowerCase();
}

export function extractResolutionFromFilename(filename: string): string | null {
  const base = extractFileName(filename);
  const match = base.match(/(\d{3,5})[x×](\d{3,5})/i);
  if (!match) return null;
  return `${match[1]}x${match[2]}`;
}

export { extractFileName, extractExtension, safeDecode };
