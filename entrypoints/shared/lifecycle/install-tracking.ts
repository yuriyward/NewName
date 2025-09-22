/**
 * Extension installation date tracking and storage utilities
 */
const INSTALL_DATE_STORAGE_KEY = 'install.date.iso';

/** Retrieves stored extension installation date */
export async function getInstallDate(): Promise<Date | null> {
  const data = await browser.storage.local.get(INSTALL_DATE_STORAGE_KEY);
  const value = data[INSTALL_DATE_STORAGE_KEY] as string | undefined;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Stores extension installation date to browser storage */
export async function setInstallDate(date: Date): Promise<void> {
  await browser.storage.local.set({
    [INSTALL_DATE_STORAGE_KEY]: date.toISOString(),
  });
}

/** Gets or creates extension installation date */
export async function ensureInstallDate(): Promise<Date> {
  const existing = await getInstallDate();
  if (existing) return existing;
  const now = new Date();
  await setInstallDate(now);
  return now;
}

/** Registers browser extension install event listener */
export function registerInstallDateListener(): void {
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      await ensureInstallDate();
    }
  });
}
