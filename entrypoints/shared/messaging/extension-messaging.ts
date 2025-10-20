/**
 * Central extension messaging protocol using @webext-core/messaging
 *
 * This file defines the combined messaging protocol interface only.
 * For message helpers and implementations, import directly from domain-specific files:
 * - core-messages.ts: Runtime context, offscreen lifecycle, toast notifications
 * - media-messages.ts: Image and PDF analysis
 * - text-messages.ts: Text analysis, AI pipeline, cloud consent
 */

import { defineExtensionMessaging } from '@webext-core/messaging';
import type { CoreProtocol } from './core-messages';
import type { MediaAnalysisProtocol } from './media-messages';
import type { TextAnalysisProtocol } from './text-messages';

/**
 * Combined extension messaging protocol from all domains
 */
export interface ExtensionMessagingProtocol
  extends CoreProtocol,
    MediaAnalysisProtocol,
    TextAnalysisProtocol {}

const extensionMessaging =
  defineExtensionMessaging<ExtensionMessagingProtocol>();

export const {
  sendMessage: sendExtensionMessage,
  onMessage: onExtensionMessage,
} = extensionMessaging;
