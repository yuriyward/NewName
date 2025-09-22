/**
 * Unit tests for installation date storage functionality
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  ensureInstallDate,
  getInstallDate,
  registerInstallDateListener,
  setInstallDate,
} from './install-date';

describe('install date storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns null when not set', async () => {
    expect(await getInstallDate()).toBeNull();
  });

  it('sets and gets install date', async () => {
    const d = new Date('2020-01-02T03:04:05.000Z');
    await setInstallDate(d);
    const got = await getInstallDate();
    expect(got?.toISOString()).toBe(d.toISOString());
  });

  it('ensureInstallDate sets when missing', async () => {
    const before = await getInstallDate();
    expect(before).toBeNull();
    const ensured = await ensureInstallDate();
    const after = await getInstallDate();
    expect(after?.toISOString()).toBe(ensured.toISOString());
  });

  it('onInstalled install reason sets install date once', async () => {
    registerInstallDateListener();
    // Trigger onInstalled via fake-browser
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });
    const first = await getInstallDate();
    expect(first).not.toBeNull();

    // Dispatch again; should not change
    if (first == null) {
      throw new Error('install date not set');
    }
    const firstIso = first.toISOString();
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });
    const second = await getInstallDate();
    expect(second?.toISOString()).toBe(firstIso);
  });
});
