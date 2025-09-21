const INSTALL_DATE_STORAGE_KEY = 'install.date.iso';

export async function getInstallDate(): Promise<Date | null> {
  const data = await browser.storage.local.get(INSTALL_DATE_STORAGE_KEY);
  const value = data[INSTALL_DATE_STORAGE_KEY] as string | undefined;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function setInstallDate(date: Date): Promise<void> {
  await browser.storage.local.set({
    [INSTALL_DATE_STORAGE_KEY]: date.toISOString(),
  });
}

export async function ensureInstallDate(): Promise<Date> {
  const existing = await getInstallDate();
  if (existing) return existing;
  const now = new Date();
  await setInstallDate(now);
  return now;
}

export function registerInstallDateListener(): void {
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      await ensureInstallDate();
    }
  });
}
