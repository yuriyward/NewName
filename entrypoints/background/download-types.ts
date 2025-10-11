/**
 * Type definitions for download listener callbacks
 */
import type { browser } from 'wxt/browser';

export type DeterminingListener = Parameters<
  typeof browser.downloads.onDeterminingFilename.addListener
>[0];

export type DeterminingItem = Parameters<DeterminingListener>[0];
export type SuggestCallback = Parameters<DeterminingListener>[1];
export type SuggestPayload = Parameters<SuggestCallback>[0];
